/* ============================================================
   reportDb: IndexedDB persistence for field reports
   ============================================================ */
import type { FieldReport } from '../data/nerData';

const DB_NAME = 'pathly-reports-db';
const STORE = 'reports';

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadReports(db?: IDBDatabase): Promise<FieldReport[]> {
  const handle = db ?? (await openDB());
  if (!handle) return [];
  return new Promise((resolve) => {
    const tx = handle.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result ?? []) as FieldReport[]);
    req.onerror = () => resolve([]);
  });
}

export async function putReport(report: FieldReport): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(report);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function putReports(reports: FieldReport[]): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const r of reports) store.put(r);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/**
 * Conflict-safe write: merges `reports` with whatever is already stored,
 * keeping — per report id — the version with the later `updatedAt`
 * (documented last-writer-wins conflict resolution). This guards against
 * stale whole-snapshot writes racing an in-flight sync.
 */
export async function mergeReports(reports: FieldReport[]): Promise<void> {
  const db = await openDB();
  if (!db) return;
  const existing = await loadReports(db);
  const byId = new Map<string, FieldReport>();
  for (const r of existing) byId.set(r.id, r);
  for (const r of reports) {
    const prev = byId.get(r.id);
    if (!prev) { byId.set(r.id, r); continue; }
    const prevT = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
    const newT = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
    if (newT >= prevT) byId.set(r.id, r);
  }
  await putReports(Array.from(byId.values()));
}

export async function clearReports(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/** Remove the legacy localStorage key after migrating. */
export function clearLegacyKey(): void {
  try { localStorage.removeItem('ner_field_reports'); } catch { /* no-op */ }
}