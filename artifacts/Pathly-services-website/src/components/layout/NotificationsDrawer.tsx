// ============================================================
// NotificationsDrawer: Interactive Live Disruption Alerts & Incident Drawer
// ============================================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll, unlockScroll } from '../../lib/scrollLock';
import { 
  Bell, 
  AlertTriangle, 
  X, 
  Send, 
  Check, 
  CheckCheck, 
  MapPin, 
  Radio, 
  TrendingUp, 
  Clock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useLocation } from 'wouter';
import { INITIAL_ALERTS, type LogisticsAlert, getAlertSeverityColor } from '../../data/nerData';
import { sendFast2SmsOtp } from '../../lib/smsService';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts?: LogisticsAlert[];
  onSelectAlert?: (alert: LogisticsAlert) => void;
}

export default function NotificationsDrawer({
  isOpen,
  onClose,
  alerts = INITIAL_ALERTS,
  onSelectAlert,
}: NotificationsDrawerProps) {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [readAlertIds, setReadAlertIds] = useState<Set<string>>(new Set());
  const [smsSendingId, setSmsSendingId] = useState<string | null>(null);
  const [smsNotice, setSmsNotice] = useState<string | null>(null);

  // Lock background scroll while the panel is open (shared with other overlays)
  useEffect(() => {
    if (!isOpen) return;
    lockScroll();
    return () => unlockScroll();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'warning') return a.severity === 'warning';
    return true;
  });

  const unreadCount = alerts.filter(a => !readAlertIds.has(a.id)).length;

  const handleMarkAllRead = () => {
    setReadAlertIds(new Set(alerts.map(a => a.id)));
  };

  const handleInspectAlert = (alert: LogisticsAlert) => {
    onSelectAlert?.(alert);
    onClose();
    setLocation(`/accessibility?lat=${alert.lat}&lng=${alert.lng}&zoom=14&name=${encodeURIComponent(alert.title)}`);
  };

  const handleDispatchSmsAlert = async (alert: LogisticsAlert) => {
    setSmsSendingId(alert.id);
    const res = await sendFast2SmsOtp('9864011223');
    setSmsSendingId(null);
    setSmsNotice(`Dispatched Fast2SMS priority warning for ${alert.title} (OTP: ${res.otp || 'SENT'})`);
    setTimeout(() => setSmsNotice(null), 4000);
  };

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
      className="fixed inset-0 z-[9999] flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in touch-none overscroll-contain"
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-screen flex flex-col justify-between overflow-hidden overscroll-contain touch-auto"
        style={{ isolation: 'isolate' }}
      >
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-inner">
              <Bell size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Disruption Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-red-900 font-mono font-black text-[11px] shadow-sm ring-1 ring-amber-300">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-[11px] text-red-100 font-mono">Real-time Regional Incident & Hazard Stream</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/90 hover:text-white rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Actions Bar */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'all' 
                  ? 'bg-blue-700 text-white shadow-sm ring-1 ring-blue-600' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-1 ring-slate-300 dark:ring-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'critical' 
                  ? 'bg-red-700 text-white shadow-sm ring-1 ring-red-600' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-1 ring-slate-300 dark:ring-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'warning' 
                  ? 'bg-amber-500 text-slate-900 shadow-sm ring-1 ring-amber-400' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-1 ring-slate-300 dark:ring-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Warnings
            </button>
          </div>

          <button
            onClick={handleMarkAllRead}
            className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <CheckCheck size={13} />
            <span>Mark All Read</span>
          </button>
        </div>

        {smsNotice && (
          <div className="px-5 py-2 bg-emerald-100 dark:bg-emerald-950 border-b border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-mono animate-fade-in text-center">
            ✓ {smsNotice}
          </div>
        )}

        {/* Alert List */}
        <div className="flex-1 p-5 space-y-3 overflow-y-auto bg-slate-100/60 dark:bg-slate-900">
          {filteredAlerts.map((alert) => {
            const isRead = readAlertIds.has(alert.id);
            const isCritical = alert.severity === 'critical';
            const sevColor = getAlertSeverityColor(alert.severity);

            const badgeClasses =
              alert.severity === 'critical'
                ? 'bg-red-700 text-white'
                : alert.severity === 'warning'
                ? 'bg-amber-400 text-amber-950'
                : 'bg-blue-600 text-white';

            const cardBorder = isCritical
              ? 'border-red-300 dark:border-red-500/40'
              : 'border-slate-200 dark:border-slate-700';

            return (
              <div 
                key={alert.id}
                className={`p-3.5 rounded-xl border bg-white dark:bg-slate-800 shadow-sm transition-all ${
                  isRead ? 'opacity-70' : 'shadow-md'
                } ${cardBorder}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ring-1"
                      style={{ 
                        backgroundColor: `${sevColor}1a`,
                        color: sevColor,
                        borderColor: `${sevColor}40`
                      }}
                    >
                      {alert.category === 'landslide' ? '⛰️' : alert.category === 'flood' ? '🌊' : alert.category === 'bridge_closure' ? '🌉' : '⚠️'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${badgeClasses}`}>
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{alert.reportedAt || 'Just now'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                        {alert.title}
                      </h4>
                      <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <MapPin size={11} className="text-red-500 dark:text-red-400 flex-shrink-0" />
                        <span>{alert.location}, {alert.district} ({alert.state})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleInspectAlert(alert)}
                    className="flex-1 py-2 px-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-sm"
                  >
                    <MapPin size={12} />
                    <span>Pinpoint on GIS Map</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDispatchSmsAlert(alert)}
                    disabled={smsSendingId === alert.id}
                    className="py-2 px-3 bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-60"
                    title="Dispatch Fast2SMS Alert to all field officers"
                  >
                    <Send size={12} />
                    <span>{smsSendingId === alert.id ? 'Sending...' : 'SMS Alert'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            Radar Frequency: 5s Live Sync
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              setLocation('/alerts');
            }}
            className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 font-bold flex items-center gap-1"
          >
            <span>Open Full Alert Center</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
