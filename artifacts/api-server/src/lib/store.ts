// ============================================================
// Store abstraction — demo file-backed store with optional Postgres adapter
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(import.meta.dirname ?? process.cwd(), '../data');

// ---- Field Report shape (shared with frontend FieldReport type) ----
export interface FieldReport {
  id: string;
  officerName: string;
  officerId: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  category: string;
  severity: string;
  title: string;
  description: string;
  photoAttached: boolean;
  photoDataUrl?: string;
  photoName?: string;
  timestamp: string;
  status: 'submitted' | 'reviewed' | 'resolved';
  syncStatus: string;
  updatedAt: string;
  lastAttemptAt?: string;
  serverSyncedAt?: string;
  [key: string]: unknown;
}

// ---- Store interface ----
export interface FieldReportStore {
  getAll(): FieldReport[];
  upsertAll(reports: FieldReport[]): void;
  append(report: FieldReport): void;
}

// ---- File-backed demo store ----
class FileFieldReportStore implements FieldReportStore {
  private filePath: string;
  private cache: FieldReport[] | null = null;

  constructor() {
    this.filePath = path.join(DATA_DIR, 'field-reports.json');
    this.ensureFile();
  }

  private ensureFile() {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(this.filePath, '[]', 'utf-8');
    }
  }

  getAll(): FieldReport[] {
    if (this.cache) return this.cache;
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      this.cache = JSON.parse(raw) as FieldReport[];
      return this.cache;
    } catch {
      this.cache = [];
      return this.cache;
    }
  }

  upsertAll(reports: FieldReport[]): void {
    this.cache = reports;
    fs.writeFileSync(this.filePath, JSON.stringify(reports, null, 2), 'utf-8');
  }

  append(report: FieldReport): void {
    const all = this.getAll();
    all.push(report);
    this.upsertAll(all);
  }
}

// ---- Postgres adapter stub (Item 12 — live mode) ----
// Activated when DATABASE_URL is set and pg is available.
// Falls back to file store when not configured.
class PostgresFieldReportStore implements FieldReportStore {
  constructor() {
    // TODO: implement when pg driver is installed and DATABASE_URL is set
    throw new Error('PostgresFieldReportStore not yet implemented — set REQUIRE_AUTH=false to use file store');
  }
  getAll(): FieldReport[] { return []; }
  upsertAll(_r: FieldReport[]): void {}
  append(_r: FieldReport): void {}
}

// ---- Factory ----
let _store: FieldReportStore | null = null;

export function getFieldReportStore(): FieldReportStore {
  if (_store) return _store;
  if (process.env['DATABASE_URL'] && process.env['USE_PG'] === 'true') {
    _store = new PostgresFieldReportStore();
  } else {
    _store = new FileFieldReportStore();
  }
  return _store;
}
