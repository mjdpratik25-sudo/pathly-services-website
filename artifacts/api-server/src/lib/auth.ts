// ============================================================
// auth — server-side sessions, role-based authorization, rate limiting, audit log
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const DATA_DIR = path.resolve(import.meta.dirname ?? process.cwd(), '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.log');

export type Role = 'admin' | 'state_control_room' | 'district_officer' | 'field_officer' | 'driver' | 'transport_operator';

export interface AuthUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: Role;
  displayName: string;
  department: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuthContext {
  authenticated: boolean;
  enabled: boolean;
  user?: {
    id: string;
    username: string;
    role: Role;
    displayName: string;
    department: string;
  };
}

// ---- Seeded demonstration users (REQUIRE_AUTH=false → open demo mode) ----
const SEED_USERS: Array<Omit<AuthUser, 'passwordHash' | 'salt'> & { password: string }> = [
  { id: 'U-ADMIN', username: 'admin', password: 'pathly-demo-admin', role: 'admin', displayName: 'Pathly System Administrator', department: 'IT Operations' },
  { id: 'U-CR', username: 'control-room', password: 'pathly-demo-cr', role: 'state_control_room', displayName: 'State Control Room Operator', department: 'NER Emergency Operations' },
  { id: 'U-DO', username: 'officer', password: 'pathly-demo-officer', role: 'field_officer', displayName: 'District Field Officer', department: 'Field Surveillance' },
  { id: 'U-DRV', username: 'driver', password: 'pathly-demo-driver', role: 'driver', displayName: 'Fleet Transporter', department: 'Transport Operations' },
];

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const LOGIN_WINDOW_MS = 60 * 1000; // 1 minute
const LOGIN_MAX_ATTEMPTS = 5;

// ---- Read/write helpers ----
function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ---- Password hashing (scrypt — no external dependency) ----
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function verifyPassword(password: string, salt: string, expected: string): boolean {
  const actual = hashPassword(password, salt);
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- Users ----
function loadUsers(): AuthUser[] {
  const existing = readJson<AuthUser[]>(USERS_FILE, []);
  if (existing.length > 0) return existing;
  const seeded: AuthUser[] = SEED_USERS.map((u) => {
    const salt = generateSalt();
    const { password, ...rest } = u;
    return { ...rest, salt, passwordHash: hashPassword(password, salt) };
  });
  writeJson(USERS_FILE, seeded);
  return seeded;
}

// ---- Sessions ----
function loadSessions(): Session[] {
  const sessions = readJson<Session[]>(SESSIONS_FILE, []);
  const now = Date.now();
  return sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
}

function saveSessions(sessions: Session[]): void {
  writeJson(SESSIONS_FILE, sessions);
}

// ---- Rate limiting (in-memory per-IP) ----
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitLogin(req: Request, res: Response, next: NextFunction): void {
  if (!req.ip) return next();
  const now = Date.now();
  const entry = loginAttempts.get(req.ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(req.ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return next();
  }
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    res.status(429).json({
      error: 'Too many login attempts. Try again in 60 seconds.',
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }
  entry.count += 1;
  next();
}

// ---- Audit log ----
export function appendAudit(entry: { action: string; userId?: string; username?: string; ip?: string; detail?: string }): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const line = `${new Date().toISOString()} ${JSON.stringify(entry)}\n`;
    fs.appendFileSync(AUDIT_FILE, line, 'utf-8');
  } catch { /* audit is best-effort */ }
}

// ---- Middleware: require authentication ----
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (process.env['REQUIRE_AUTH'] !== 'true') {
    // Demo (open) mode — synthesized admin context so role-gated
    // endpoints remain fully usable; the UI labels this as SIMULATED DEMO.
    (req as Request & { auth?: AuthContext }).auth = {
      authenticated: true,
      enabled: false,
      user: { id: 'U-DEMO', username: 'demo', role: 'admin', displayName: 'Demo (open access)', department: 'SIMULATED DEMO' },
    };
    return next();
  }

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const sessions = loadSessions();
  const session = token ? sessions.find((s) => s.token === token) : undefined;
  if (!session) {
    res.status(401).json({ error: 'Unauthorized — valid session token required' });
    return;
  }
  const user = loadUsers().find((u) => u.id === session.userId);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized — account no longer exists' });
    return;
  }
  (req as Request & { auth?: AuthContext }).auth = {
    authenticated: true,
    enabled: true,
    user,
  };
  next();
}

// ---- Middleware: require a role ----
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = (req as Request & { auth?: AuthContext }).auth;
    // Demo mode (auth disabled): bypass role enforcement — the UI
    // labels all data as SIMULATED DEMO; all endpoints remain open.
    if (auth && !auth.enabled) return next();
    if (!auth?.authenticated || !auth.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(auth.user.role)) {
      appendAudit({ action: 'authz_denied', userId: auth.user.id, username: auth.user.username, ip: req.ip, detail: `role=${auth.user.role} required=[${roles.join(',')}]` });
      res.status(403).json({ error: 'Forbidden — insufficient role' });
      return;
    }
    next();
  };
}

// ---- Login ----
export function login(req: Request, res: Response): void {
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }
  const user = loadUsers().find((u) => u.username === username);
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    appendAudit({ action: 'login_failed', username, ip: req.ip });
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: Session = { token, userId: user.id, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + SESSION_TTL_MS).toISOString() };
  const sessions = loadSessions();
  sessions.push(session);
  saveSessions(sessions);
  appendAudit({ action: 'login_success', userId: user.id, username: user.username, ip: req.ip });
  res.json({
    token,
    expiresAt: session.expiresAt,
    user: { id: user.id, username: user.username, role: user.role, displayName: user.displayName, department: user.department },
  });
}

// ---- Logout ----
export function logout(req: Request, res: Response): void {
  const token = (req.headers.authorization ?? '').replace('Bearer ', '');
  const sessions = loadSessions().filter((s) => s.token !== token);
  saveSessions(sessions);
  res.json({ success: true });
}

// ---- Current user ----
export function currentUser(req: Request, res: Response): void {
  const auth = (req as Request & { auth?: AuthContext }).auth;
  if (!auth?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({
    user: { id: auth.user.id, username: auth.user.username, role: auth.user.role, displayName: auth.user.displayName, department: auth.user.department },
  });
}