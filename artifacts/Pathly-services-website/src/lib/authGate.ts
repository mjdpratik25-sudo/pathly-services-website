// ============================================================
// authGate: guest view-only gating.
// Unauthenticated visitors may SEE the full UI but every
// interactive/functional action is routed through requireAuth(),
// which either allows it (signed-in) or raises a lightweight
// "Please sign in" prompt (guest) instead of performing the action.
// ============================================================

export interface AuthGateRequest {
  // Short human-readable label for the blocked action, e.g. "Track Orders".
  action?: string;
  // Optional continuation if a caller wants to resume after login.
  onAuthenticated?: () => void;
}

export const REQUIRE_LOGIN_EVENT = 'pathly_require_login';

export function isAuthenticated(): boolean {
  try {
    localStorage.removeItem('pathly_officer_session');
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isReload = navEntry?.type === 'reload' || (typeof performance !== 'undefined' && (performance as any).navigation?.type === 1);
    if (isReload) {
      sessionStorage.removeItem('pathly_officer_session');
      return false;
    }
    return !!sessionStorage.getItem('pathly_officer_session');
  } catch {
    return false;
  }
}

// Returns true when the user may proceed (signed in), false when a guest
// was blocked and the Sign In / Sign Up prompt has been raised instead.
export function requireAuth(opts: AuthGateRequest = {}): boolean {
  if (isAuthenticated()) return true;
  window.dispatchEvent(
    new CustomEvent<AuthGateRequest>(REQUIRE_LOGIN_EVENT, { detail: { action: opts.action } })
  );
  return false;
}

export function requireAuthAction(action: string): boolean {
  return requireAuth({ action });
}