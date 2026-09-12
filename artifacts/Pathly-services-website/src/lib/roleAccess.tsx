// ============================================================
// roleAccess: shared role context used to scope existing panels,
// sections and navigation per logged-in experience (Item 8).
// No new screens — visibility gating only.
// ============================================================

import React, { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';

export type RoleKey = 'control_room' | 'field_officer' | 'driver' | 'admin';

export interface RoleMeta {
  key: RoleKey;
  label: string;
  scope: string;
}

export const ROLES: RoleMeta[] = [
  {
    key: 'control_room',
    label: 'Control Room',
    scope: 'Regional overview, active incidents, route decisions, fleet monitoring, emergency broadcasts, analytics',
  },
  {
    key: 'field_officer',
    label: 'Field Officer',
    scope: 'Offline incident capture, camera, GPS, pending reports, nearby incidents, assigned tasks',
  },
  {
    key: 'driver',
    label: 'Driver',
    scope: 'Driver Mode turn-by-turn navigation, route and fleet status',
  },
  {
    key: 'admin',
    label: 'Admin',
    scope: 'Full platform access',
  },
];

// '/' = full access. Field Officer and Driver scope only the panels they use.
const ROLE_PATHS: Record<RoleKey, string[]> = {
  admin: [],
  control_room: [],
  field_officer: ['/', '/field-reports', '/accessibility', '/alerts', '/tracking'],
  driver: ['/', '/driver-mode', '/routes', '/tracking', '/accessibility', '/alerts'],
};

const STORAGE_KEY = 'pathly_role';

function readStoredRole(): RoleKey {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ROLES.some((r) => r.key === stored)) return stored as RoleKey;
  } catch { /* ignore */ }
  return 'control_room';
}

interface RoleContextValue {
  role: RoleKey;
  setRole: (role: RoleKey) => void;
  can: (path: string) => boolean;
  isRestricted: (roles: RoleKey[]) => boolean;
  roleLabel: string;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<RoleKey>(readStoredRole);

  const setRole = (next: RoleKey) => {
    setRoleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const sync = () => setRoleState(readStoredRole());
    window.addEventListener('pathly_role_changed', sync);
    return () => window.removeEventListener('pathly_role_changed', sync);
  }, []);

  const value = useMemo<RoleContextValue>(() => {
    const can = (path: string) => {
      if (role === 'admin' || role === 'control_room') return true;
      const allowed = ROLE_PATHS[role];
      return allowed.some((p) => path === p || path.startsWith(p + '/'));
    };
    const isRestricted = (roles: RoleKey[]) => !roles.includes(role);
    const meta = ROLES.find((r) => r.key === role) ?? ROLES[0];
    return { role, setRole, can, isRestricted, roleLabel: meta.label };
  }, [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}

/**
 * RoleGate — scopes an existing panel/section to specific roles without
 * rebuilding the UI. Unauthorized roles see a small, existing-style chip
 * instead of the panel content.
 */
export function RoleGate({
  roles,
  children,
  showRestrictedMessage = true,
}: {
  roles: RoleKey[];
  children: ReactNode;
  showRestrictedMessage?: boolean;
}) {
  const { role, isRestricted, roleLabel } = useRole();
  if (!isRestricted(roles)) return <>{children}</>;

  if (!showRestrictedMessage) return null;

  const allowedLabel = ROLES.filter((r) => roles.includes(r.key)).map((r) => r.label).join(' / ');
  return (
    <div className="p-3 border border-dashed border-slate-300 bg-slate-50">
      <p className="text-[10px] font-mono text-slate-500">
        <span className="font-bold uppercase tracking-wider text-[#0B3D6D]">Role access</span> — this section is scoped to {allowedLabel}. Current role: <strong>{roleLabel}</strong>.
      </p>
    </div>
  );
}

// Export a helper to build nav items filtered by role (used by Sidebar & top nav).
export function useFilteredNav<T extends { path: string }>(items: T[]): T[] {
  const { can } = useRole();
  return useMemo(() => items.filter((it) => can(it.path)), [items, can]);
}