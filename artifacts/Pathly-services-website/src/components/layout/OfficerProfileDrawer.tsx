// ============================================================
// OfficerProfileDrawer: Role-aware account panel
// - Officer/Admin accounts: Officer Control Center (Badge ID, duty
//   status, jurisdiction, security clearance, etc.)
// - Citizen/User/Transporter accounts: simpler "Account Overview"
//   (name, phone, transporter/org ID, credits) — no duty/clearance
//   language.
// State Jurisdiction reflects the user's real detected location.
// Flat government-themed side panel (no dimmed backdrop).
// ============================================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll, unlockScroll } from '../../lib/scrollLock';
import { 
  ShieldCheck, 
  LogOut, 
  Settings, 
  Send, 
  X, 
  Activity, 
  Check,
  User,
  MapPin,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { type OfficerProfile, DEFAULT_OFFICER } from '../auth/OfficerAuthModal';

import { useUserLocation } from '../../hooks/useUserLocation';

interface TestDispatchResult {
  timestamp: string;
  recipientName: string;
  recipientPhone: string;
  recipientVehicle: string;
  messageContent: string;
  creditsNote: string;
  disclaimer: string;
}

interface OfficerProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  officer?: OfficerProfile | null;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export default function OfficerProfileDrawer({
  isOpen,
  onClose,
  officer = DEFAULT_OFFICER,
  onLogout,
  onOpenSettings,
}: OfficerProfileDrawerProps) {
  const [, setLocation] = useLocation();
  const [smsSending, setSmsSending] = useState(false);
  const [testDispatch, setTestDispatch] = useState<TestDispatchResult | null>(null);
  const location = useUserLocation();

  // Lock background scroll while the panel is open (shared with other overlays)
  useEffect(() => {
    if (!isOpen) return;
    lockScroll();
    return () => unlockScroll();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentOfficer = officer || DEFAULT_OFFICER;
  const isOfficerAccount = currentOfficer.accountType === 'admin' || currentOfficer.accountType === 'officer';

  const detectedLocation = location.status === 'detected' && location.state
    ? `${location.majorTown || location.districtName} Dist., ${location.state}`
    : null;

  const jurisdiction = detectedLocation || `${currentOfficer.state} & Region`;

  const handleTestBroadcast = () => {
    setSmsSending(true);
    window.setTimeout(() => {
      setSmsSending(false);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      setTestDispatch({
        timestamp: `${timeStr} IST · ${dateStr}`,
        recipientName: 'Ranjan Das',
        recipientPhone: '+91 9864011223',
        recipientVehicle: 'AS-01-AB-1234 (Convoy Lead · NH-27/44)',
        messageContent: 'Priority Alert: Route NH-44 reclassified HIGH RISK — reroute advised. Confirm receipt.',
        creditsNote: '1 of 200 High-Priority SMS credits would be used',
        disclaimer: 'Fast2SMS provider not connected · Test message logged locally · Simulation only',
      });
    }, 700);
  };

  // Rows shared across the flat stats sections
  const row = 'flex items-center justify-between py-2.5';
  const rowLabel = 'text-slate-500';
  const rowValue = 'font-semibold text-slate-900 text-right';

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      className="fixed inset-0 z-[9999] flex justify-end bg-transparent touch-none overscroll-contain"
    >
      {/* Flat side panel separated by a thin border/shadow, page remains visible & undimmed */}
      <div
        className="w-full max-w-md h-screen flex flex-col overflow-hidden bg-white border-l border-[#d5dbe2] shadow-[-6px_0_24px_rgba(0,0,0,0.10)] text-slate-900 overscroll-contain touch-auto"
        style={{ isolation: 'isolate' }}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-[#d5dbe2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded text-white flex items-center justify-center ${isOfficerAccount ? 'bg-[#0B3D6D]' : 'bg-green-700'}`}>
              {isOfficerAccount ? <ShieldCheck size={18} /> : <User size={18} />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isOfficerAccount ? 'Officer Control Center' : 'Account Overview'}
              </h3>
              <p className="text-[10px] font-mono text-[#0B3D6D]">
                {isOfficerAccount ? 'Government Duty Session Active' : 'Citizen / Transporter Portal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-[#0B3D6D] hover:bg-slate-100 rounded transition-colors cursor-pointer"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded text-white flex items-center justify-center font-black text-xl ${isOfficerAccount ? 'bg-[#0B3D6D]' : 'bg-green-700'}`}>
                {currentOfficer.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  {isOfficerAccount ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span className="text-[10px] font-mono text-emerald-700 uppercase font-bold">On Active Duty</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-600" />
                      <span className="text-[10px] font-mono text-green-700 uppercase font-bold">Verified Member</span>
                    </>
                  )}
                </div>
                <h4 className="font-extrabold text-base text-slate-900 mt-0.5">{currentOfficer.name}</h4>
                <p className="text-xs text-[#0B3D6D] font-medium">{currentOfficer.role}</p>
              </div>
            </div>

            {/* Flat stats row (Badge / Transporter ID · Jurisdiction / Region) */}
            <div className="mt-4 grid grid-cols-2 border border-[#d5dbe2]">
              <div className="p-3">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  {isOfficerAccount ? 'Badge ID' : 'Transporter / Org ID'}
                </span>
                <span className="font-mono font-bold text-[#0B3D6D] break-all">{currentOfficer.badgeId}</span>
              </div>
              <div className="p-3 border-l border-[#d5dbe2]">
                <span className="text-[10px] text-slate-500 uppercase font-mono block flex items-center gap-1">
                  <MapPin size={10} />
                  {isOfficerAccount ? 'State Jurisdiction' : 'Region'}
                </span>
                <span className="font-bold text-slate-900">{jurisdiction}</span>
                {detectedLocation && (
                  <span className="mt-1 inline-block text-[9px] px-1.5 py-0.5 border border-blue-500 text-blue-700 font-mono font-bold">
                    GPS AUTO-DETECTED
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notification Credits (plain stat row, no wallet UI) */}
          <div className="border border-[#d5dbe2]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#d5dbe2]">
              <span className="text-[11px] font-semibold text-slate-900 flex items-center gap-1.5">
                <Activity size={13} className="text-[#0B3D6D]" />
                <span>Notification Credits</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 border border-emerald-600 text-emerald-700 font-mono font-bold">Active</span>
            </div>
            <div className={`${row} px-4`}>
              <span className={rowLabel}>Remaining Credits</span>
              <span className="font-mono font-bold text-slate-900">200 High-Priority SMS</span>
            </div>
            <div className={`${row} px-4 border-t border-[#d5dbe2]`}>
              <span className={rowLabel}>Value</span>
              <span className="font-mono font-bold text-slate-900">₹50.00</span>
            </div>
          </div>

          {/* Officer-only: Security Clearance */}
          {isOfficerAccount && (
            <div className="border border-[#d5dbe2]">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#d5dbe2]">
                <span className="text-[11px] font-semibold text-slate-900">Security Clearance</span>
                <span className="text-[9px] px-1.5 py-0.5 border border-[#0B3D6D] text-[#0B3D6D] font-mono font-bold">Level {currentOfficer.clearanceLevel}</span>
              </div>
              <div className={`${row} px-4`}>
                <span className={rowLabel}>Access Tier</span>
                <span className={rowValue}>Disaster Bypass</span>
              </div>
              <div className={`${row} px-4 border-t border-[#d5dbe2]`}>
                <span className={rowLabel}>Scope</span>
                <span className={rowValue}>Strategic Fleet Access</span>
              </div>
            </div>
          )}

          {/* Department / Organization & Contact Details */}
          <div className="border border-[#d5dbe2] px-4">
            <div className={`${row}`}>
              <span className={rowLabel}>{isOfficerAccount ? 'Agency' : 'Organization'}</span>
              <span className="font-semibold text-slate-900 text-right truncate max-w-[220px]">{currentOfficer.department}</span>
            </div>
            <div className={`${row} border-t border-[#d5dbe2]`}>
              <span className={rowLabel}>{isOfficerAccount ? 'Officer Phone' : 'Phone'}</span>
              <span className="font-mono font-bold text-[#0B3D6D]">{currentOfficer.phone}</span>
            </div>
            <div className={`${row} border-t border-[#d5dbe2]`}>
              <span className={rowLabel}>Session Started</span>
              <span className="font-mono text-slate-600 text-[11px]">Today at 08:30 AM IST</span>
            </div>
          </div>

          {/* Action Hub */}
          <div className="space-y-2.5 pt-1">
            {isOfficerAccount && (
              <button
                type="button"
                onClick={handleTestBroadcast}
                disabled={smsSending}
                className="w-full py-2.5 px-4 bg-[#7A1F1F] hover:bg-[#6A1B1B] text-white border border-[#7A1F1F] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Send size={13} />
                <span>{smsSending ? 'Broadcasting SMS...' : 'Test Fast2SMS Priority Dispatch'}</span>
              </button>
            )}
            {testDispatch && (
              <div className="rounded-lg border border-[#0B3D6D]/25 bg-slate-50 p-3.5 space-y-2.5 shadow-sm animate-fade-in relative text-left">
                {/* Status Header */}
                <div className="flex items-center justify-between gap-2 border-b border-[#d5dbe2] pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B3D6D]">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Test Dispatch Complete</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-500 px-1.5 py-0.5 rounded">
                      SIMULATED DISPATCH
                    </span>
                    <button
                      type="button"
                      onClick={() => setTestDispatch(null)}
                      className="text-slate-400 hover:text-slate-700 p-0.5 transition-colors cursor-pointer"
                      title="Dismiss card"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Simulated Message Content */}
                <div className="bg-white border border-[#d5dbe2] rounded p-2.5 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 font-mono">
                    <MessageSquare size={11} className="text-[#0B3D6D]" />
                    <span>Dispatched Alert Message</span>
                  </div>
                  <p className="text-xs text-slate-800 font-mono leading-relaxed select-text bg-slate-50/70 p-2 rounded border border-slate-100">
                    &ldquo;{testDispatch.messageContent}&rdquo;
                  </p>
                </div>

                {/* Recipient & Consequential Info */}
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500 font-medium">Recipient:</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {testDispatch.recipientName} <span className="font-mono text-[#0B3D6D]">· {testDispatch.recipientPhone}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500 font-medium">Assigned Asset:</span>
                    <span className="font-mono text-slate-700 text-[10px] text-right">
                      {testDispatch.recipientVehicle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-[#d5dbe2]/70">
                    <span className="text-slate-500 font-medium">Credit Preview:</span>
                    <span className="font-mono font-semibold text-slate-800 text-[10px]">
                      {testDispatch.creditsNote}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[10px] font-mono pt-0.5">
                    <span>Dispatch Time:</span>
                    <span>{testDispatch.timestamp}</span>
                  </div>
                </div>

                {/* Honest Simulation Disclaimer */}
                <div className="flex items-start gap-1.5 text-[10px] text-amber-900 bg-amber-50/90 border border-amber-300/80 rounded px-2 py-1.5 font-mono">
                  <AlertTriangle size={12} className="text-amber-700 shrink-0 mt-0.5" />
                  <span className="leading-tight">{testDispatch.disclaimer}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                setLocation('/settings');
              }}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-[#d5dbe2] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Settings size={14} className="text-[#0B3D6D]" />
              <span>Account &amp; Preferences</span>
            </button>
          </div>
        </div>

        {/* Footer: Sign Out & Account Switch — sticky so it's always visible */}
        <div className="px-5 py-4 border-t border-[#d5dbe2] bg-slate-50 flex items-center justify-between shrink-0 sticky bottom-0 z-10">
          <div className="text-[10px] text-slate-500 font-mono">
            ID: {currentOfficer.id}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 bg-white hover:bg-[#7A1F1F] hover:text-white border border-[#7A1F1F] text-[#7A1F1F] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
