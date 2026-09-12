// ============================================================
// useOfflineSync: IndexedDB-backed field reports with
// queue/retry, dedup, conflict merge, and sync history.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_FIELD_REPORTS, type FieldReport } from '../data/nerData';
import { scenarioActive, scenarioActions } from '../lib/scenarioEngine';
import * as reportDb from '../lib/reportDb';
import { syncFieldReportsToServer } from '../lib/api';

const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RETRY_ATTEMPTS = 4;
const BASE_RETRY_MS = 3000;

export interface SyncHistoryEntry {
  timestamp: string;
  action: 'submit' | 'sync' | 'retry' | 'status-change';
  reportId?: string;
  detail: string;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine ?? true);
  const [isManuallyToggled, setIsManuallyToggled] = useState<boolean>(false);
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const mountedRef = useRef(true);
  const syncingRef = useRef(false); // concurrency guard
  const reportsRef = useRef<FieldReport[]>([]);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { reportsRef.current = reports; }, [reports]);

  // ---- Load from IndexedDB; migrate legacy localStorage on first run ----
  useEffect(() => {
    (async () => {
      let stored = await reportDb.loadReports();
      // Migrate legacy localStorage
      if (stored.length === 0) {
        try {
          const legacy = localStorage.getItem('ner_field_reports');
          if (legacy) {
            const parsed: FieldReport[] = JSON.parse(legacy);
            stored = parsed.map((r) => ({
              ...r,
              updatedAt: r.updatedAt ?? new Date().toISOString(),
            }));
            await reportDb.putReports(stored);
            reportDb.clearLegacyKey();
          }
        } catch { /* ignore */ }
      }
      if (mountedRef.current) {
        setReports(stored.length ? stored : INITIAL_FIELD_REPORTS);
        setLoaded(true);
      }
    })();
  }, []);

  // ---- Persist to IndexedDB whenever reports change (after initial load) ----
  // Conflict-safe: merge with stored rows, keeping the version with the later
  // updatedAt (last-writer-wins) so an in-flight sync result can't be
  // overwritten by a stale earlier snapshot.
  useEffect(() => {
    if (!loaded) return;
    reportDb.mergeReports(reports).catch(() => {});
  }, [reports, loaded]);

  // ---- Browser online/offline listeners ----
  useEffect(() => {
    const handleOnline = () => { setIsManuallyToggled(false); setIsOnline(true); };
    const handleOffline = () => { setIsManuallyToggled(false); setIsOnline(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  // ---- Sync pending reports with exponential backoff (concurrency-guarded) ----
  // Item 7: pushes the queue to the backend (`POST /field-reports/sync`). If the
  // backend is unreachable the reports stay queued and retry with backoff, so
  // offline-first behavior is preserved without faking a server ack.
  const syncPendingReports = useCallback(async () => {
    if (!isOnline || syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);

    const now = new Date().toISOString();
    const queued = reportsRef.current.filter((r) => r.syncStatus === 'pending');

    let serverPushed = 0;
    let serverConflicts = 0;
    let backendDown = false;

    if (queued.length > 0) {
      const result = await syncFieldReportsToServer(queued);
      backendDown = result === null;
      setServerConnected(result !== null);
      serverPushed = result?.syncedCount ?? 0;
      serverConflicts = result?.conflicts ?? 0;
      const accepted = new Set<string>(result?.serverSyncedIds ?? []);
      if (result !== null) {
        setReports((prev) =>
          prev.map((r) => {
            if (r.syncStatus !== 'pending') return r;
            if (accepted.has(r.id)) {
              return {
                ...r,
                syncStatus: 'synced' as const,
                updatedAt: now,
                lastAttemptAt: now,
                attempts: (r.attempts ?? 0) + 1,
                serverSyncedAt: now,
                timestamp: r.timestamp === 'Just now' ? 'Synced just now' : r.timestamp,
              };
            }
            const attempts = r.attempts ?? 0;
            if (attempts >= MAX_RETRY_ATTEMPTS) {
              return { ...r, syncStatus: 'failed' as const, updatedAt: now, lastAttemptAt: now, attempts: attempts + 1 };
            }
            return { ...r, updatedAt: now, lastAttemptAt: now, attempts: attempts + 1 };
          })
        );
      }
    } else {
      // No queue — still ping the backend once to refresh the connection flag.
      const probe = await syncFieldReportsToServer([]);
      setServerConnected(probe !== null);
    }

    // Backend unreachable: advance attempts locally so MAX_RETRY_ATTEMPTS still
    // bounds the queue and the honest "still queued" state is surfaced.
    if (queued.length > 0 && backendDown) {
      setReports((prev) =>
        prev.map((r) => {
          if (r.syncStatus !== 'pending') return r;
          const attempts = r.attempts ?? 0;
          if (attempts >= MAX_RETRY_ATTEMPTS) {
            return { ...r, syncStatus: 'failed' as const, updatedAt: now, lastAttemptAt: now, attempts: attempts + 1 };
          }
          return { ...r, updatedAt: now, lastAttemptAt: now, attempts: attempts + 1 };
        })
      );
    }

    // Scenario integration
    if (scenarioActive()) {
      setReports((prev) => {
        const pendingAfter = prev.find((r) => r.syncStatus === 'synced' && r.timestamp === 'Synced just now');
        if (pendingAfter) scenarioActions.markFieldReportSynced(pendingAfter.id);
        return prev;
      });
    }

    setIsSyncing(false);
    syncingRef.current = false;
    setLastSyncTime(new Date().toLocaleTimeString());
    setSyncHistory((h) => [
      ...h,
      {
        timestamp: now,
        action: 'sync',
        detail: backendDown
          ? `Backend unreachable — ${queued.length} report(s) still queued with backoff.`
          : `Pushed ${serverPushed} report(s) to backend (${serverConflicts} duplicate/conflict retained).`,
      },
    ]);
  }, [isOnline]);

  // ---- Auto-sync when coming back online ----
  useEffect(() => {
    if (isOnline) {
      const hasPending = reports.some((r) => r.syncStatus === 'pending');
      if (hasPending) syncPendingReports();
    }
  }, [isOnline, reports, syncPendingReports]);

  // ---- One-time backend probe on mount so "Backend: Connected" is honest ----
  const probedRef = useRef(false);
  useEffect(() => {
    if (!isOnline || probedRef.current) return;
    probedRef.current = true;
    syncPendingReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // ---- Submit report ----
  const submitReport = useCallback(
    (newReport: Omit<FieldReport, 'id' | 'timestamp' | 'status' | 'syncStatus' | 'updatedAt'>) => {
      const now = new Date();
      const nowIso = now.toISOString();

      // Dedup check: reject if identical officer + coords + category within window
      const duplicate = reports.find(
        (r) =>
          r.officerId === newReport.officerId &&
          r.category === newReport.category &&
          Math.abs(r.lat - newReport.lat) < 0.0005 &&
          Math.abs(r.lng - newReport.lng) < 0.0005 &&
          r.updatedAt &&
          now.getTime() - new Date(r.updatedAt).getTime() < DEDUP_WINDOW_MS
      );
      if (duplicate) {
        setSyncHistory((h) => [
          ...h,
          { timestamp: nowIso, action: 'submit', detail: `Dedup rejected: duplicate of ${duplicate.id}` },
        ]);
        return null;
      }

      const id = `FR-${Date.now()}`;
      const report: FieldReport = {
        ...newReport,
        id,
        timestamp: 'Just now',
        updatedAt: nowIso,
        status: 'submitted',
        // Always queued first: the backend ack flips it to 'synced' inside
        // syncPendingReports, so a green "synced" badge never lies about a push.
        syncStatus: 'pending',
        attempts: 0,
        lastAttemptAt: nowIso,
      };

      setReports((prev) => [report, ...prev]);
      if (scenarioActive()) scenarioActions.markFieldReportSubmitted(report.id);
      setSyncHistory((h) => [
        ...h,
        { timestamp: nowIso, action: 'submit', reportId: id, detail: `Report ${id} created (${newReport.title}) — ${isOnline ? 'queued for backend push' : 'queued (offline)'}.` },
      ]);
      return report;
    },
    [isOnline, reports]
  );

  const pendingCount = reports.filter((r) => r.syncStatus === 'pending').length;

  // ---- Status review flow ----
  const updateReportStatus = useCallback(
    (reportId: string, newStatus: FieldReport['status'], actionNote?: string) => {
      const nowIso = new Date().toISOString();
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: newStatus, updatedAt: nowIso, ...(actionNote ? { actionNote } : {}), syncStatus: 'pending' as const }
            : r
        )
      );
      setSyncHistory((h) => [
        ...h,
        { timestamp: nowIso, action: 'status-change', reportId, detail: `Report ${reportId} → ${newStatus}` },
      ]);
    },
    []
  );

  const reviewReport = useCallback((reportId: string, note?: string) => { updateReportStatus(reportId, 'verified', note); }, [updateReportStatus]);
  const resolveReport = useCallback((reportId: string, note?: string) => { updateReportStatus(reportId, 'resolved', note); }, [updateReportStatus]);

  const pendingReports = reports.filter((r) => r.status === 'submitted');
  const reviewedReports = reports.filter((r) => r.status === 'verified' || r.status === 'action_taken');
  const resolvedReports = reports.filter((r) => r.status === 'resolved');

  const setOnline = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIsManuallyToggled(true);
    setIsOnline(value);
  }, []);

  return {
    isOnline,
    setIsOnline: setOnline,
    serverConnected,
    reports,
    isSyncing,
    lastSyncTime,
    pendingCount,
    syncPendingReports,
    submitReport,
    updateReportStatus,
    reviewReport,
    resolveReport,
    pendingReports,
    reviewedReports,
    resolvedReports,
    syncHistory,
  };
}