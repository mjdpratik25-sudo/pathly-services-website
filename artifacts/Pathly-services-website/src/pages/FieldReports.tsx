// ============================================================
// FieldReports: Field-level Reporting & Offline Synchronization Portal
// ============================================================

import React, { useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Camera, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  Plus,
  Send,
  Smartphone,
  Check,
  Hash
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { 
  NER_STATES, 
  type AlertCategory, 
  type AlertSeverity, 
  type NERState 
} from '../data/nerData';
import { sendFast2SmsOtp, verifyFast2SmsOtp } from '../lib/smsService';

export default function FieldReports() {
  const { 
    isOnline, 
    setIsOnline, 
    reports, 
    isSyncing, 
    lastSyncTime, 
    pendingCount, 
    syncPendingReports, 
    submitReport 
  } = useOfflineSync();

  // Form State
  const [officerName, setOfficerName] = useState('Anurag Bora');
  const [officerId, setOfficerId] = useState('FO-AS-012');
  const [officerPhone, setOfficerPhone] = useState('9876543210');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpStatusMsg, setOtpStatusMsg] = useState<{ success: boolean; message: string; code?: string } | null>(null);

  const [district, setDistrict] = useState('Kamrup Metropolitan');
  const [state, setState] = useState<NERState>('Assam');
  const [category, setCategory] = useState<AlertCategory | 'infrastructure' | 'general'>('landslide');
  const [severity, setSeverity] = useState<AlertSeverity>('critical');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoAttached, setPhotoAttached] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number }>({ lat: 26.1445, lng: 91.7362 });
  const [formSuccess, setFormSuccess] = useState(false);

  const handleDetectGPS = () => {
    setIsDetectingGps(true);
    setTimeout(() => {
      setGpsCoords({
        lat: 26.1445 + (Math.random() - 0.5) * 0.1,
        lng: 91.7362 + (Math.random() - 0.5) * 0.1,
      });
      setIsDetectingGps(false);
    }, 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    submitReport({
      officerName,
      officerId,
      district,
      state,
      category,
      severity,
      title,
      description,
      photoAttached,
      lat: gpsCoords.lat,
      lng: gpsCoords.lng,
    });

    setFormSuccess(true);
    setTitle('');
    setDescription('');
    setPhotoAttached(false);
    setTimeout(() => setFormSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              Field Telemetry & Offline Data Sync
            </span>
          </div>
          <h2 className="text-xl font-black text-[hsl(var(--foreground))] mt-0.5">
            Field Officer Incident Upload & Verification Portal
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Enabling field engineers, SDRF officials, and border post authorities to log road damage with geo-tagged images in zero-network areas.
          </p>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!isOnline) {
                setIsOnline(true);
                window.location.reload();
              } else {
                setIsOnline(false);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? 'Online (Live Sync)' : 'Offline (Local Queue)'}</span>
          </button>

          <button
            onClick={syncPendingReports}
            disabled={isSyncing || !isOnline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : `Sync Queue (${pendingCount})`}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form + Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Field Officer Upload (1 Col) */}
        <div className="p-5 rounded-xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
            <Camera size={18} className="text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Log Geo-Tagged Incident</h3>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Stored locally if offline • Auto-synced on network</p>
            </div>
          </div>

          {formSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-slide-in-up">
              <CheckCircle2 size={16} />
              <span>
                {isOnline
                  ? 'Report uploaded & broadcasted to State Disaster Control!'
                  : 'Saved to Offline Queue! Will sync once connection restores.'}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Officer Name</label>
                <input
                  type="text"
                  required
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Officer ID / Badge</label>
                <input
                  type="text"
                  required
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            {/* Officer Phone & Fast2SMS OTP Verification */}
            <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-[11px] font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5 min-w-0">
                  <Smartphone size={13} className="text-indigo-400 flex-shrink-0" />
                  <span className="min-w-0">Officer Mobile (Fast2SMS OTP Verification)</span>
                </label>
                {phoneVerified ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                    <Check size={11} />
                    Verified
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-medium flex-shrink-0">Verification Recommended</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">+91</span>
                  <input
                    type="tel"
                    value={officerPhone}
                    onChange={(e) => {
                      setOfficerPhone(e.target.value);
                      setPhoneVerified(false);
                    }}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full pl-10 pr-2.5 py-1.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-xs font-mono"
                  />
                </div>

                {!phoneVerified ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setOtpSending(true);
                      setOtpStatusMsg(null);
                      const res = await sendFast2SmsOtp(officerPhone);
                      setOtpSending(false);
                      setOtpModalOpen(true);
                      setOtpStatusMsg(res);
                      if (res.otp) setOtpInput(res.otp);
                    }}
                    disabled={otpSending || officerPhone.length < 10}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 transition-all whitespace-nowrap"
                  >
                    {otpSending ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                    <span>Send OTP</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-1 text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>Active</span>
                  </span>
                )}
              </div>

              {/* In-Line OTP Verification Drawer */}
              {otpModalOpen && !phoneVerified && (
                <div className="pt-2 border-t border-indigo-500/20 flex items-center gap-2 animate-fade-in">
                  <input
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="w-32 px-2 py-1 bg-[hsl(var(--card))] border border-indigo-500/50 rounded-lg text-xs font-mono font-bold tracking-widest text-center"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setOtpVerifying(true);
                      const res = verifyFast2SmsOtp(officerPhone, otpInput);
                      setOtpVerifying(false);
                      if (res.success) {
                        setPhoneVerified(true);
                        setOtpModalOpen(false);
                      } else {
                        setOtpStatusMsg({ success: false, message: res.message });
                      }
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1"
                  >
                    {otpVerifying ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                    <span>Confirm</span>
                  </button>
                  {otpStatusMsg?.code && (
                    <span className="text-[10px] text-indigo-300 font-mono">
                      (Fast2SMS: {otpStatusMsg.code})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[hsl(var(--foreground))] block mb-1">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
                >
                  {NER_STATES.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[hsl(var(--foreground))] block mb-1">District</label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Incident Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
                >
                  <option value="landslide">⛰️ Landslide Debris</option>
                  <option value="flood">🌊 Flood Submersion</option>
                  <option value="road_damage">🚧 Road Subsidence</option>
                  <option value="infrastructure">🌉 Bridge Cracks / Railing</option>
                  <option value="general">ℹ️ General PMGSY Road Status</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
                >
                  <option value="critical">🔴 Critical (Blocked)</option>
                  <option value="warning">🟡 Warning (Single Lane)</option>
                  <option value="info">🔵 Info / Completed</option>
                </select>
              </div>
            </div>

            {/* GPS Detection Box */}
            <div className="p-2.5 rounded-lg bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))] flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-mono block">GPS Geo-Tag</span>
                <span className="font-mono text-emerald-400 font-bold text-xs break-all">
                  {gpsCoords.lat.toFixed(4)}°N, {gpsCoords.lng.toFixed(4)}°E
                </span>
              </div>
              <button
                type="button"
                onClick={handleDetectGPS}
                className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[11px] font-semibold border border-blue-500/30 flex-shrink-0"
              >
                {isDetectingGps ? 'Locating...' : 'Re-Lock GPS'}
              </button>
            </div>

            <div>
              <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Report Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Hill cutting collapse at km 18"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Field Observations</label>
              <textarea
                rows={3}
                required
                placeholder="Describe current road width, mud depth, stranded vehicles, and machinery needed..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
              />
            </div>

            {/* Photo Attachment Toggle */}
            <div
              onClick={() => setPhotoAttached(!photoAttached)}
              className={`p-3 rounded-lg border border-dashed cursor-pointer flex items-center justify-center gap-2 transition-all ${
                photoAttached
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-[hsl(var(--border))] hover:border-blue-500/50 text-[hsl(var(--muted-foreground))]'
              }`}
            >
              <Camera size={16} />
              <span className="font-semibold text-xs">
                {photoAttached ? '✓ Geo-Tagged Photo Attached (IMG_NER_2026.jpg)' : '+ Attach Photo from Camera'}
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all text-xs"
            >
              <Send size={14} />
              <span>Submit Field Report</span>
            </button>
          </form>
        </div>

        {/* Right Feed: Verified Field Reports (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
              Recent Field Submissions ({reports.length})
            </h3>
            <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
              Last synced: {lastSyncTime}
            </span>
          </div>

          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-xl glass-card border border-[hsl(var(--border))] hover:border-blue-500/30 bg-[hsl(var(--card))] space-y-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400">[{rep.id}]</span>
                      <h4 className="font-bold text-sm text-[hsl(var(--foreground))]">{rep.title}</h4>
                    </div>
                    <p className="text-xs text-slate-700 font-medium mt-0.5">
                      Reported by <strong>{rep.officerName}</strong> ({rep.officerId}) • {rep.district}, {rep.state}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <StatusBadge type="report" value={rep.status} />
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        rep.syncStatus === 'synced'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {rep.syncStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{rep.description}</p>

                <div className="flex items-center justify-between gap-2 text-[11px] pt-2 border-t border-[hsl(var(--border))]/50 font-mono flex-wrap">
                  <span className="text-slate-600 break-all">
                    GPS: {rep.lat.toFixed(4)}°N, {rep.lng.toFixed(4)}°E
                  </span>
                  <span className="text-slate-600 flex-shrink-0">{rep.timestamp}</span>
                </div>

                {rep.actionNote && (
                  <div
                    className="text-[11px] font-semibold"
                    style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '8px 12px', borderRadius: '6px' }}
                  >
                    <strong>Action Taken:</strong> {rep.actionNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
