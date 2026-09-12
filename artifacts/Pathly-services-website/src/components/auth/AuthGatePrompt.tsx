// ============================================================
// AuthGatePrompt: small guest prompt raised when an unauthenticated
// visitor clicks an interactive/functional feature. Offers "Sign In"
// and "Sign Up", both landing on the existing login/registration
// screen. Styled consistently with the app's other light confirmation
// panels; never gates itself.
// ============================================================

import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Lock, X } from 'lucide-react';
import { REQUIRE_LOGIN_EVENT, type AuthGateRequest } from '../../lib/authGate';

export default function AuthGatePrompt() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AuthGateRequest> | undefined)?.detail;
      setAction(detail?.action);
      setOpen(true);
    };
    window.addEventListener(REQUIRE_LOGIN_EVENT, handler);
    return () => window.removeEventListener(REQUIRE_LOGIN_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const goToLogin = () => {
    setOpen(false);
    setLocation('/login');
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      className="fixed inset-0 z-[100001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="w-full max-w-sm bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl p-5 animate-slide-in-up space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B3D6D]/10 text-[#0B3D6D] border border-[#0B3D6D]/20 flex items-center justify-center">
              <Lock size={16} />
            </div>
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Please sign in or sign up to use Pathly</h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="p-1 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {action && (
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            You need to be signed in to <strong className="text-[hsl(var(--foreground))]">{action}</strong>. You can
            keep browsing the guest preview, but actions require an account.
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={goToLogin}
            className="flex-1 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={goToLogin}
            className="flex-1 py-2 rounded-lg bg-[hsl(var(--muted))]/60 hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-xs font-semibold border border-[hsl(var(--border))] transition-colors cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}