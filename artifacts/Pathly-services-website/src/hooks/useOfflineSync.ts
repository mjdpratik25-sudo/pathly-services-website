// ============================================================
// useOfflineSync: Simulates field offline storage and background synchronization
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { INITIAL_FIELD_REPORTS, type FieldReport } from '../data/nerData';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine ?? true);
  const [isManuallyToggled, setIsManuallyToggled] = useState<boolean>(false);
  const [reports, setReports] = useState<FieldReport[]>(() => {
    try {
      const saved = localStorage.getItem('ner_field_reports');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_FIELD_REPORTS;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());

  // Listen to browser online/offline events (only when not manually toggled)
  useEffect(() => {
    const handleOnline = () => {
      setIsManuallyToggled(false);
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsManuallyToggled(false);
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save to local storage whenever reports change
  useEffect(() => {
    try {
      localStorage.setItem('ner_field_reports', JSON.stringify(reports));
    } catch (e) {
      console.error('Failed to save reports locally', e);
    }
  }, [reports]);

  // Sync pending reports
  const syncPendingReports = useCallback(async () => {
    if (!isOnline) return;
    setIsSyncing(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setReports((prev) =>
      prev.map((r) => (r.syncStatus === 'pending' ? { ...r, syncStatus: 'synced' as const } : r))
    );
    setIsSyncing(false);
    setLastSyncTime(new Date().toLocaleTimeString());
  }, [isOnline]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      const hasPending = reports.some((r) => r.syncStatus === 'pending');
      if (hasPending) {
        syncPendingReports();
      }
    }
  }, [isOnline, reports, syncPendingReports]);

  const submitReport = useCallback(
    (newReport: Omit<FieldReport, 'id' | 'timestamp' | 'status' | 'syncStatus'>) => {
      const id = `FR-${String(Date.now()).slice(-4)}`;
      const report: FieldReport = {
        ...newReport,
        id,
        timestamp: 'Just now',
        status: 'submitted',
        syncStatus: isOnline ? 'synced' : 'pending',
      };

      setReports((prev) => [report, ...prev]);
      if (isOnline) {
        setLastSyncTime(new Date().toLocaleTimeString());
      }
      return report;
    },
    [isOnline]
  );

  const pendingCount = reports.filter((r) => r.syncStatus === 'pending').length;

  // Wrapped setter: marks as manually toggled when called from UI
  const setOnline = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIsManuallyToggled(true);
    setIsOnline(value);
  }, []);

  return {
    isOnline,
    setIsOnline: setOnline, // Manual toggle for offline mode simulation
    reports,
    isSyncing,
    lastSyncTime,
    pendingCount,
    syncPendingReports,
    submitReport,
  };
}
