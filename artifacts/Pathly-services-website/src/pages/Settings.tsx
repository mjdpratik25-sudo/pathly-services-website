// ============================================================
// Settings: Platform Configuration, API Keys & Gateway Integrations
// ============================================================

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Wifi, 
  Bell, 
  ShieldCheck, 
  Database, 
  Save, 
  CheckCircle2, 
  Smartphone, 
  Layers,
  CloudRain,
  Mountain,
  Send,
  Flame,
  Key,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Info,
  Check,
  X,
  PhoneCall,
  Lock,
  ShieldAlert,
  CreditCard,
  Hash
} from 'lucide-react';
import { 
  getOpenWeatherMapKey, 
  setOpenWeatherMapKey, 
  testOpenWeatherMapConnection, 
  type LiveWeatherResult 
} from '../lib/weatherService';
import { 
  getMapboxToken, 
  setMapboxToken, 
  testMapboxConnection,
  MAPBOX_STYLES 
} from '../lib/mapboxConfig';
import { 
  getFast2SmsKey, 
  setFast2SmsKey, 
  getSmsProvider, 
  setSmsProvider, 
  getTwilioConfig, 
  setTwilioConfig, 
  dispatchDriverSms, 
  sendFast2SmsOtp,
  verifyFast2SmsOtp,
  checkFast2SmsBalance,
  type SmsProvider 
} from '../lib/smsService';
import { 
  getFirebaseConfig, 
  setFirebaseConfig, 
  requestPushPermission, 
  sendLocalOrFirebaseNotification, 
  type FirebaseWebConfig 
} from '../lib/firebaseService';

interface SettingsProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function Settings({
  currentLanguage,
  onLanguageChange,
  isDark,
  onToggleTheme
}: SettingsProps) {
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'apis' | 'general'>('apis');

  // General Settings State
  const [autoSync, setAutoSync] = useState(true);
  const [autoReroute, setAutoReroute] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [radarRefreshRate, setRadarRefreshRate] = useState('30');
  const [satelliteProvider, setSatelliteProvider] = useState('ISRO-Bhuvan');

  // 1. OpenWeatherMap API State
  const [owmKey, setOwmKey] = useState('');
  const [owmTesting, setOwmTesting] = useState(false);
  const [owmStatus, setOwmStatus] = useState<{ success: boolean; message: string; data?: LiveWeatherResult } | null>(null);

  // 2. Mapbox Public Access Token State
  const [mapboxToken, setMapboxTokenState] = useState('');
  const [mapboxTesting, setMapboxTesting] = useState(false);
  const [mapboxStatus, setMapboxStatus] = useState<{ success: boolean; message: string } | null>(null);

  // 3. Fast2SMS & Twilio SMS State
  const [smsProvider, setSmsProviderState] = useState<SmsProvider>('fast2sms');
  const [fast2smsKey, setFast2smsKeyState] = useState('');
  const [fast2smsBalance, setFast2smsBalance] = useState<{ wallet: string; smsCount: number } | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);

  // OTP Verification Sandbox State
  const [otpPhone, setOtpPhone] = useState('9876543210');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpStatus, setOtpStatus] = useState<{ success: boolean; message: string; code?: string } | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioPhone, setTwilioPhone] = useState('');
  const [testPhoneNumber, setTestPhoneNumber] = useState('+919876543210');
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsStatus, setSmsStatus] = useState<{ success: boolean; message: string; previewText?: string } | null>(null);

  // 4. Firebase Config State
  const [fbApiKey, setFbApiKey] = useState('');
  const [fbAuthDomain, setFbAuthDomain] = useState('');
  const [fbProjectId, setFbProjectId] = useState('');
  const [fbSenderId, setFbSenderId] = useState('');
  const [fbAppId, setFbAppId] = useState('');
  const [pushTesting, setPushTesting] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Load Saved Values on Mount
  useEffect(() => {
    setOwmKey(getOpenWeatherMapKey());
    setMapboxTokenState(getMapboxToken());
    setSmsProviderState(getSmsProvider());
    
    const f2sKey = getFast2SmsKey();
    setFast2smsKeyState(f2sKey);
    if (f2sKey) {
      checkFast2SmsBalance(f2sKey).then(res => {
        if (res.success) {
          setFast2smsBalance({ wallet: res.wallet, smsCount: res.smsCount });
        }
      });
    }

    const tw = getTwilioConfig();
    setTwilioSid(tw.accountSid);
    setTwilioToken(tw.authToken);
    setTwilioPhone(tw.fromPhone);

    const fb = getFirebaseConfig();
    setFbApiKey(fb.apiKey);
    setFbAuthDomain(fb.authDomain);
    setFbProjectId(fb.projectId);
    setFbSenderId(fb.messagingSenderId);
    setFbAppId(fb.appId);
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [otpCountdown]);

  const handleSaveAll = () => {
    setOpenWeatherMapKey(owmKey);
    setMapboxToken(mapboxToken);
    setSmsProvider(smsProvider);
    setFast2SmsKey(fast2smsKey);
    setTwilioConfig(twilioSid, twilioToken, twilioPhone);

    setFirebaseConfig({
      apiKey: fbApiKey,
      authDomain: fbAuthDomain,
      projectId: fbProjectId,
      storageBucket: `${fbProjectId}.appspot.com`,
      messagingSenderId: fbSenderId,
      appId: fbAppId
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // 1. Test OpenWeatherMap Connection
  const handleTestOwm = async () => {
    setOwmTesting(true);
    setOwmStatus(null);
    const res = await testOpenWeatherMapConnection(owmKey);
    setOwmTesting(false);
    setOwmStatus({
      success: res.success,
      message: res.message,
      data: res.sampleData
    });
    if (res.success) {
      setOpenWeatherMapKey(owmKey);
    }
  };

  // 2. Test Mapbox Token
  const handleTestMapbox = async () => {
    setMapboxTesting(true);
    setMapboxStatus(null);
    const res = await testMapboxConnection(mapboxToken);
    setMapboxTesting(false);
    setMapboxStatus(res);
    if (res.success) {
      setMapboxToken(mapboxToken);
    }
  };

  // 3. Fast2SMS Balance Check
  const handleCheckBalance = async () => {
    setCheckingBalance(true);
    const res = await checkFast2SmsBalance(fast2smsKey);
    setCheckingBalance(false);
    if (res.success) {
      setFast2smsBalance({ wallet: res.wallet, smsCount: res.smsCount });
    }
  };

  // 4. Send Fast2SMS OTP
  const handleSendOtp = async () => {
    setOtpSending(true);
    setOtpStatus(null);
    setVerifiedSuccess(false);

    // Save key first
    setFast2SmsKey(fast2smsKey);

    const res = await sendFast2SmsOtp(otpPhone);
    setOtpSending(false);
    if (res.success) {
      setOtpSent(true);
      setOtpCountdown(60);
      setOtpStatus({
        success: true,
        message: res.message,
        code: res.otp
      });
    } else {
      setOtpStatus({
        success: false,
        message: res.message
      });
    }
  };

  // 5. Verify Fast2SMS OTP
  const handleVerifyOtp = () => {
    setOtpVerifying(true);
    const res = verifyFast2SmsOtp(otpPhone, enteredOtp);
    setOtpVerifying(false);
    if (res.success) {
      setVerifiedSuccess(true);
      setOtpStatus({
        success: true,
        message: res.message
      });
    } else {
      setOtpStatus({
        success: false,
        message: res.message
      });
    }
  };

  // 6. Test Driver SMS Dispatch
  const handleTestSms = async () => {
    setSmsTesting(true);
    setSmsStatus(null);

    setSmsProvider(smsProvider);
    setFast2SmsKey(fast2smsKey);
    setTwilioConfig(twilioSid, twilioToken, twilioPhone);

    const res = await dispatchDriverSms({
      recipientPhone: testPhoneNumber,
      driverName: 'Ranjit Borah',
      vehicleNo: 'AS-01-GC-4482',
      hazardType: 'landslide',
      location: 'NH-44 near Umling',
      recommendedCorridor: 'NH-6 via Shillong Bypass',
      language: currentLanguage === 'hi' ? 'hi' : currentLanguage === 'as' ? 'as' : 'en'
    });

    setSmsTesting(false);
    setSmsStatus({
      success: res.success,
      message: res.message,
      previewText: res.previewText
    });
  };

  // 7. Test Firebase Push Notification
  const handleTestPush = async () => {
    setPushTesting(true);
    setPushStatus(null);

    const res = await sendLocalOrFirebaseNotification({
      title: '🚨 PATHLY EMERGENCY DISPATCH',
      body: 'Critical landslide reported on NH-44 Umling. 3 Convoys rerouted via NH-6.',
      severity: 'critical',
      district: 'Ri-Bhoi',
      state: 'Meghalaya'
    });

    setPushTesting(false);
    setPushStatus(res);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <SettingsIcon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">Platform Settings & API Hub</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Manage Fast2SMS OTP verification, live satellite feeds, OpenWeatherMap, Mapbox 3D terrain & Firebase push alerts.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all self-start sm:self-auto"
        >
          <Save size={14} />
          <span>Save All Settings</span>
        </button>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-slide-in-up">
          <CheckCircle2 size={16} />
          <span>All API keys, OTP configurations & telemetry rules saved successfully!</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-2">
        <button
          onClick={() => setActiveTab('apis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'apis'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Key size={14} />
          <span>API Gateways & Fast2SMS OTP (4)</span>
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'general'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Globe size={14} />
          <span>General & Localization</span>
        </button>
      </div>

      {/* TAB 1: API INTEGRATIONS */}
      {activeTab === 'apis' && (
        <div className="space-y-6">
          {/* FAST2SMS OTP VERIFICATION & SMS DISPATCH (HIGHLIGHTED) */}
          <div className="p-5 rounded-2xl glass-panel bg-gradient-to-br from-indigo-950/20 via-[hsl(var(--card))] to-[hsl(var(--card))] border-2 border-indigo-500/40 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shadow-xs">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <span>Fast2SMS OTP Verification & Driver SMS Gateway</span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                      <Check size={11} />
                      Pre-Configured & Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Fast2SMS Quick SMS & DLT OTP Route for authenticating field officers and dispatching emergency road warnings.
                  </p>
                </div>
              </div>

              {/* Wallet Balance Chip */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-xs">
                  <CreditCard size={13} className="text-indigo-400" />
                  <span>Wallet: <strong>₹{fast2smsBalance?.wallet || '50.00'}</strong></span>
                  <span className="opacity-70">({fast2smsBalance?.smsCount || 200} SMS)</span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckBalance}
                  disabled={checkingBalance}
                  className="p-1.5 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
                  title="Refresh Wallet Balance"
                >
                  <RefreshCw size={13} className={checkingBalance ? 'animate-spin text-indigo-400' : ''} />
                </button>
              </div>
            </div>

            {/* Fast2SMS Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                  Fast2SMS Authorization Key (Active)
                </label>
                <a
                  href="https://www.fast2sms.com/dashboard/dev-api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>Fast2SMS Dashboard</span>
                  <ExternalLink size={11} />
                </a>
              </div>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                <input
                  type="password"
                  value={fast2smsKey}
                  onChange={(e) => setFast2smsKeyState(e.target.value)}
                  placeholder="Enter Fast2SMS API Key"
                  className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--muted))]/80 border border-indigo-500/40 rounded-lg text-xs font-mono text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* LIVE OTP VERIFICATION SANDBOX */}
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash size={16} className="text-indigo-400" />
                  <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wider font-mono">
                    Fast2SMS Live OTP Verification Sandbox
                  </h4>
                </div>
                {verifiedSuccess && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 size={12} />
                    Verified Mobile Number
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Step 1: Send OTP */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Step 1: Enter Indian Mobile Number
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">+91</span>
                      <input
                        type="tel"
                        value={otpPhone}
                        onChange={(e) => setOtpPhone(e.target.value)}
                        placeholder="9876543210"
                        maxLength={10}
                        className="w-full pl-11 pr-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-xs font-mono text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending || (otpCountdown > 0 && otpSent)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap"
                    >
                      {otpSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                      <span>{otpCountdown > 0 ? `Resend (${otpCountdown}s)` : 'Send OTP'}</span>
                    </button>
                  </div>
                </div>

                {/* Step 2: Verify OTP */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Step 2: Enter 6-Digit OTP Code
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                      placeholder="e.g. 849201"
                      maxLength={6}
                      disabled={!otpSent && !otpStatus?.code}
                      className="flex-1 px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-xs font-mono font-bold tracking-widest text-center text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying || enteredOtp.length !== 6}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap"
                    >
                      {otpVerifying ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                      <span>Verify OTP</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live OTP Status / Auto-fill Helper */}
              {otpStatus && (
                <div className={`p-3 rounded-lg text-xs border ${
                  otpStatus.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold flex items-center gap-1.5">
                      {otpStatus.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      <span>{otpStatus.message}</span>
                    </p>
                    {otpStatus.code && (
                      <button
                        type="button"
                        onClick={() => setEnteredOtp(otpStatus.code!)}
                        className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-mono text-[11px] font-bold border border-indigo-500/30 ml-2"
                      >
                        Auto-Fill ({otpStatus.code})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Test Driver Emergency SMS */}
            <div className="p-3.5 rounded-xl bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] space-y-2.5">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Send Live Test Emergency Landslide Warning SMS:
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="tel"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="Indian 10-digit mobile no."
                  className="flex-1 px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-xs font-mono text-[hsl(var(--foreground))]"
                />
                <button
                  type="button"
                  onClick={handleTestSms}
                  disabled={smsTesting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  {smsTesting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Dispatch Test SMS</span>
                </button>
              </div>

              {smsStatus && (
                <div className={`p-3 rounded-lg text-xs border space-y-1.5 ${
                  smsStatus.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <p className="font-semibold">{smsStatus.message}</p>
                  {smsStatus.previewText && (
                    <div className="p-2 rounded bg-slate-900/60 font-mono text-[11px] text-slate-200 border border-white/10">
                      📱 <strong>SMS Preview:</strong> {smsStatus.previewText}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* API 1: OpenWeatherMap */}
          <div className="p-5 rounded-2xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                  <CloudRain size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <span>1. OpenWeatherMap API Key</span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                      100% Free • 1,000 calls/day
                    </span>
                  </h3>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Enables live IMD precipitation radar, real-time rainfall rate (mm/h) & soil moisture landslide triggers.
                  </p>
                </div>
              </div>

              <a
                href="https://home.openweathermap.org/api_keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Get Free API Key</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1.5">
                  OpenWeatherMap API Key (32-character hex)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <input
                      type="password"
                      value={owmKey}
                      onChange={(e) => setOwmKey(e.target.value)}
                      placeholder="e.g. 7f3b890a12c45e6789f0123456789abc"
                      className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs font-mono text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                    />
                  </div>
                  <button
                    onClick={handleTestOwm}
                    disabled={owmTesting || !owmKey.trim()}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    {owmTesting ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    <span>Test Radar Feed</span>
                  </button>
                </div>
              </div>

              {/* Status Display */}
              {owmStatus && (
                <div className={`p-3 rounded-lg text-xs border ${
                  owmStatus.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <p className="font-semibold flex items-center gap-1.5">
                    {owmStatus.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    <span>{owmStatus.message}</span>
                  </p>
                  {owmStatus.data && (
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-[hsl(var(--foreground))] pt-2 border-t border-emerald-500/20">
                      <div>Temp: <strong>{owmStatus.data.temperature}°C</strong></div>
                      <div>Rain: <strong>{owmStatus.data.rainfall} mm</strong></div>
                      <div>Humidity: <strong>{owmStatus.data.humidity}%</strong></div>
                      <div>Wind: <strong>{owmStatus.data.windSpeed} km/h</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* API 2: Mapbox Access Token */}
          <div className="p-5 rounded-2xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <Mountain size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <span>2. Mapbox Public Access Token</span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                      100% Free • 50,000 loads/mo
                    </span>
                  </h3>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Enables high-resolution 3D mountain terrain elevations, hillshade relief & village road geometry (Arunachal, Meghalaya, Mizoram).
                  </p>
                </div>
              </div>

              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Get Free Mapbox Token</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1.5">
                  Default Public Token (Starts with "pk.eyJ...")
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <input
                      type="password"
                      value={mapboxToken}
                      onChange={(e) => setMapboxTokenState(e.target.value)}
                      placeholder="pk.eyJ1IjoieW91cm5hbWUiLCJhIjoiY2x5..."
                      className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs font-mono text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                  <button
                    onClick={handleTestMapbox}
                    disabled={mapboxTesting || !mapboxToken.trim()}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    {mapboxTesting ? <RefreshCw size={13} className="animate-spin" /> : <Mountain size={13} />}
                    <span>Test 3D Layer</span>
                  </button>
                </div>
              </div>

              {/* Mapbox Styles Preview Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                {MAPBOX_STYLES.map((style) => (
                  <div key={style.id} className="p-2.5 rounded-lg bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[hsl(var(--foreground))] text-[11px]">{style.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                        {style.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] line-clamp-2">
                      {style.description}
                    </p>
                  </div>
                ))}
              </div>

              {mapboxStatus && (
                <div className={`p-3 rounded-lg text-xs border ${
                  mapboxStatus.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <p className="font-semibold flex items-center gap-1.5">
                    {mapboxStatus.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    <span>{mapboxStatus.message}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* API 4: Firebase Web App Config */}
          <div className="p-5 rounded-2xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  <Flame size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <span>4. Firebase Web App & Push Alerts</span>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                      Cloud Messaging (FCM)
                    </span>
                  </h3>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Broadcasts native browser & mobile push alerts to field officers and district administrations upon hazard verification.
                  </p>
                </div>
              </div>

              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Firebase Console</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">API Key</label>
                <input
                  type="password"
                  value={fbApiKey}
                  onChange={(e) => setFbApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">Project ID</label>
                <input
                  type="text"
                  value={fbProjectId}
                  onChange={(e) => setFbProjectId(e.target.value)}
                  placeholder="pathly-services-region"
                  className="w-full px-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">Messaging Sender ID</label>
                <input
                  type="text"
                  value={fbSenderId}
                  onChange={(e) => setFbSenderId(e.target.value)}
                  placeholder="1029384756"
                  className="w-full px-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">Auth Domain</label>
                <input
                  type="text"
                  value={fbAuthDomain}
                  onChange={(e) => setFbAuthDomain(e.target.value)}
                  placeholder="pathly.firebaseapp.com"
                  className="w-full px-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">App ID</label>
                <input
                  type="text"
                  value={fbAppId}
                  onChange={(e) => setFbAppId(e.target.value)}
                  placeholder="1:1029384756:web:abcdef123456"
                  className="w-full px-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            {/* Push Test Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Click below to request notification permission and test desktop push sound & popup.
              </p>
              <button
                type="button"
                onClick={handleTestPush}
                disabled={pushTesting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
              >
                {pushTesting ? <RefreshCw size={13} className="animate-spin" /> : <Bell size={13} />}
                <span>Send Test Push Notification</span>
              </button>
            </div>

            {pushStatus && (
              <div className={`p-3 rounded-lg text-xs border ${
                pushStatus.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                <p className="font-semibold flex items-center gap-1.5">
                  {pushStatus.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  <span>{pushStatus.message}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL SETTINGS */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          {/* Localization & Language */}
          <div className="p-5 rounded-xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
              <Globe size={17} className="text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] font-mono">
                Regional Language & Localization
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Primary Display Language</label>
                <select
                  value={currentLanguage}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
                >
                  <option value="en">English (Regional Standard)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="as">অসমীয়া (Assamese)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="mni">মৈতৈলোন্ (Manipuri)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Tactical Interface Theme</label>
                <div className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-left font-bold text-emerald-400 flex items-center justify-between">
                  <span>🌙 Obsidian Tactical Dark Mode (Permanent)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">LOCKED ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry & Predictive Routing */}
          <div className="p-5 rounded-xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
              <ShieldCheck size={17} className="text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] font-mono">
                Predictive Routing & Sensor Radar Feeds
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                <div>
                  <p className="font-bold text-[hsl(var(--foreground))]">Automated Route Diversion</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Auto-suggest alternate corridor to driver app when road risk exceeds 75%.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoReroute}
                  onChange={(e) => setAutoReroute(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                <div>
                  <p className="font-bold text-[hsl(var(--foreground))]">Offline Queue Auto-Replication</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Automatically sync local reports as soon as 2G/4G connectivity is detected.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                <div>
                  <p className="font-bold text-[hsl(var(--foreground))]">Emergency SMS Broadcast to Transporters</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Transmit automated Hindi/Assamese SMS alerts for landslide closures within 50km radius.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
            </div>
          </div>

          {/* GIS & Satellite Layer Integration */}
          <div className="p-5 rounded-xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
              <Layers size={17} className="text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] font-mono">
                GIS Satellite & Agency Connections
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-[hsl(var(--foreground))] block mb-1">GIS Satellite Imagery Source</label>
                <select
                  value={satelliteProvider}
                  onChange={(e) => setSatelliteProvider(e.target.value)}
                  className="w-full px-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs font-mono"
                >
                  <option value="ISRO-Bhuvan">Regional Geospatial Portal</option>
                  <option value="Mapbox-3D">Mapbox 3D Hillshade & Terrain</option>
                  <option value="CartoDB-Matter">CartoDB Dark Matter / Voyager</option>
                  <option value="OpenStreetMap">OpenStreetMap India Layer</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Radar Telemetry Refresh Interval</label>
                <select
                  value={radarRefreshRate}
                  onChange={(e) => setRadarRefreshRate(e.target.value)}
                  className="w-full px-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs font-mono"
                >
                  <option value="15">15 Seconds (High Frequency)</option>
                  <option value="30">30 Seconds (Standard)</option>
                  <option value="60">60 Seconds (Low Bandwidth)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
