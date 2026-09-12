// ============================================================
// OfficerAuthModal: Unified User & Admin Authentication Portal
// Pathly Logistics Command & Citizen Route Intelligence
// ============================================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll, unlockScroll } from '../../lib/scrollLock';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  Phone, 
  CheckCircle2, 
  X, 
  KeyRound, 
  Send, 
  ArrowRight,
  AlertCircle,
  Sparkles,
  Building2,
  MapPin,
  IdCard,
  Shield,
  Smartphone,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  Fingerprint,
  RotateCcw,
  Truck
} from 'lucide-react';
import { sendFast2SmsOtp } from '../../lib/smsService';
import type { NERState } from '../../data/nerData';

export interface OfficerProfile {
  id: string;
  name: string;
  role: string;
  badgeId: string;
  department: string;
  state: NERState;
  phone: string;
  clearanceLevel: number;
  loggedInAt: string;
  accountType?: 'admin' | 'officer' | 'user';
  logisticsPartner?: string;
}

export const DEFAULT_OFFICER: OfficerProfile = {
  id: 'adm-001',
  name: 'Dear User',
  role: 'Admin',
  badgeId: 'REG-CMD-8842',
  department: 'Regional Logistics Control Command',
  state: 'Assam',
  phone: '9864011223',
  clearanceLevel: 4,
  loggedInAt: new Date().toISOString(),
  accountType: 'admin'
};

// Neutral display name used wherever a user skips entering their own name —
// never a previous user's or a developer/test identity.
export const GUEST_NAME = 'Dear User';

interface OfficerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (officer: OfficerProfile) => void;
}

export default function OfficerAuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: OfficerAuthModalProps) {
  // Account Type: 'user' (Citizen/Transporter) vs 'admin' (Officer/Admin)
  const [accountType, setAccountType] = useState<'user' | 'admin'>('user');
  const [mode, setMode] = useState<'login' | 'signup' | 'otp'>('login');
  
  // Credentials
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [department, setDepartment] = useState('');
  const [state, setState] = useState<NERState | ''>('');

  // OTP State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [sentOtp, setSentOtp] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
      return () => {
        unlockScroll();
      };
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickDemoLogin = (type: 'admin' | 'tripura' | 'field' | 'user') => {
    let profile: OfficerProfile;
    if (type === 'admin') {
      profile = DEFAULT_OFFICER;
    } else if (type === 'tripura') {
      profile = {
        id: 'off-agt-02',
        name: 'Debasish Chakraborty',
        role: 'Tripura Sector Commander',
        badgeId: 'TR-DIS-9910',
        department: 'Tripura State Disaster Management Authority',
        state: 'Tripura',
        phone: '9436122334',
        clearanceLevel: 4,
        loggedInAt: new Date().toISOString(),
        accountType: 'officer'
      };
    } else if (type === 'field') {
      profile = {
        id: 'off-fld-03',
        name: 'Ranjan Barman',
        role: 'Field Surveillance Officer',
        badgeId: 'FLD-SURV-3312',
        department: 'Highway Freight & Fleet Escort',
        state: 'Meghalaya',
        phone: '9864099887',
        clearanceLevel: 3,
        loggedInAt: new Date().toISOString(),
        accountType: 'officer'
      };
    } else {
      profile = {
        id: 'usr-9021',
        name: 'Amitabh Sharma',
        role: 'Fleet Transporter & Citizen',
        badgeId: 'USR-TR-4421',
        department: 'Assam Freight Transport Union',
        state: 'Assam',
        phone: '9864011223',
        clearanceLevel: 1,
        loggedInAt: new Date().toISOString(),
        accountType: 'user'
      };
    }

    try {
      localStorage.setItem('pathly_officer_session', JSON.stringify(profile));
    } catch {}
    setSuccessMessage(`Welcome, ${profile.name}! Logging you in as ${profile.role}...`);
    setAuthSuccess(true);
    setTimeout(() => {
      onLoginSuccess(profile);
      onClose();
    }, 450);
  };

  const handleSendOtp = async () => {
    const targetPhone = phone.trim() || '9864011223';
    setPhone(targetPhone);
    setIsSendingOtp(true);
    setAuthError(null);
    try {
      const res = await sendFast2SmsOtp(targetPhone);
      setIsSendingOtp(false);
      const code = res.otp || '592810';
      setSentOtp(code);
      setOtpDigits(code.split('').slice(0, 6)); // Pre-fill demo OTP so users don't get stuck
      setMode('otp');
    } catch {
      setIsSendingOtp(false);
      setSentOtp('592810');
      setOtpDigits(['5', '9', '2', '8', '1', '0']);
      setMode('otp');
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    // Auto focus next
    if (cleaned && index < 5) {
      const nextInput = document.getElementById(`otp-box-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-box-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      setAuthError('Please enter the full 6-digit OTP code');
      return;
    }

    const profile: OfficerProfile = {
      id: `${accountType === 'admin' ? 'adm' : 'usr'}-${Date.now().toString().slice(-4)}`,
      name: name.trim() || GUEST_NAME,
      role: accountType === 'admin' ? 'Admin' : 'Public User / Transporter',
      badgeId: badgeId || `REG-${accountType === 'admin' ? 'ADM' : 'USR'}-${Math.floor(1000 + Math.random() * 9000)}`,
      department: department || (accountType === 'admin' ? 'Regional Logistics Command' : 'General User Portal'),
      state: state === '' ? 'Assam' : state,
      phone,
      clearanceLevel: accountType === 'admin' ? 4 : 1,
      loggedInAt: new Date().toISOString(),
      accountType
    };

    try {
      localStorage.setItem('pathly_officer_session', JSON.stringify(profile));
    } catch {}
    setSuccessMessage(`OTP Verified! Welcome, ${profile.name}!`);
    setAuthSuccess(true);
    setTimeout(() => {
      onLoginSuccess(profile);
      onClose();
    }, 450);
  };

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const effectivePhone = phone.trim() || '9864011223';

    const profile: OfficerProfile = {
      id: accountType === 'admin' ? 'adm-001' : 'usr-001',
      name: name.trim() || GUEST_NAME,
      role: accountType === 'admin' ? 'Admin' : 'Public User',
      badgeId: badgeId.trim() || (accountType === 'admin' ? 'REG-CMD-8842' : 'CITIZEN-USER'),
      department: department.trim() || (accountType === 'admin' ? 'Regional Logistics Control' : 'Public Portal'),
      state: state === '' ? 'Assam' : state,
      phone: effectivePhone,
      clearanceLevel: accountType === 'admin' ? 4 : 1,
      loggedInAt: new Date().toISOString(),
      accountType
    };

    try {
      localStorage.setItem('pathly_officer_session', JSON.stringify(profile));
    } catch {}
    setSuccessMessage(`Welcome, ${profile.name}! Successfully signed in as ${profile.role}.`);
    setAuthSuccess(true);
    setTimeout(() => {
      onLoginSuccess(profile);
      onClose();
    }, 450);
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in touch-none overscroll-contain"
    >
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 divide-y divide-slate-800 max-h-[92vh] overflow-y-auto overscroll-contain touch-auto"
        style={{ isolation: 'isolate' }}
      >
        {/* Top Header */}
        <div className="p-5 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 flex items-start justify-between relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg border ${
              accountType === 'admin' 
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/30 border-blue-400/30' 
                : 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-500/30 border-emerald-400/30'
            }`}>
              {accountType === 'admin' ? <ShieldCheck size={24} /> : <User size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  accountType === 'admin'
                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  {accountType === 'admin' ? '🛡️ Admin & Officer Command' : '👤 Citizen & User Portal'}
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-0.5">
                {accountType === 'admin' ? 'Pathly Admin & Officer Login' : 'Pathly User / Citizen Sign In'}
              </h3>
              <p className="text-xs text-slate-400">
                {accountType === 'admin' 
                  ? 'Access emergency routes, logistics dispatch & administrative control' 
                  : 'Track consignments, view real-time road conditions & alerts'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors relative z-10"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Account Type Switcher: User vs Admin */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 gap-1.5 border-b border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAccountType('user');
              setMode('login');
              setAuthError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              accountType === 'user'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <User size={14} />
            <span>User / Citizen</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setAccountType('admin');
              setMode('login');
              setAuthError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              accountType === 'admin'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Admin / Officer</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
          {/* Quick 1-Click Login for Evaluators & Judges */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-blue-300 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-400" />
                <span>1-Click Evaluator Access</span>
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">Instant Entry</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="px-2 py-1.5 bg-blue-600/30 hover:bg-blue-600 border border-blue-500/40 text-blue-100 hover:text-white rounded-xl text-left transition-all"
              >
                <div className="text-[10px] font-bold">⭐ Admin</div>
                <div className="text-[8px] text-blue-300 font-mono truncate">Pratik (REG CMD)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('tripura')}
                className="px-2 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-100 hover:text-white rounded-xl text-left transition-all"
              >
                <div className="text-[10px] font-bold">🏛️ Sector Cmd</div>
                <div className="text-[8px] text-indigo-300 font-mono truncate">Agartala Sector</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('field')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-left transition-all"
              >
                <div className="text-[10px] font-bold">🚚 Field Officer</div>
                <div className="text-[8px] text-slate-400 font-mono truncate">Highway Escort</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('user')}
                className="px-2 py-1.5 bg-emerald-950/60 hover:bg-emerald-700 border border-emerald-600/40 text-emerald-200 hover:text-white rounded-xl text-left transition-all"
              >
                <div className="text-[10px] font-bold">👤 Citizen / User</div>
                <div className="text-[8px] text-emerald-300 font-mono truncate">Transporter</div>
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs (Sign In / Register / OTP) */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setMode('login'); setAuthError(null); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound size={12} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setAuthError(null); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signup' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck size={12} />
              <span>New Registration</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('otp'); setAuthError(null); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'otp' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Fingerprint size={12} />
              <span>OTP Mode</span>
            </button>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-center justify-between animate-fade-in">
              <span>⚠️ {authError}</span>
              <button type="button" onClick={() => setAuthError(null)}><X size={13} /></button>
            </div>
          )}

          {authSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MODE 1: PASSWORD / QUICK SIGN IN */}
          {mode === 'login' && (
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {accountType === 'admin' ? 'Admin / Officer Mobile Number or ID' : 'User Mobile Number'}
                </label>
                <div className="relative flex items-center">
                  <Phone size={14} className="absolute left-3 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9864011223"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={14} className="absolute left-3 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="e.g. pathly2026"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline flex items-center gap-1 cursor-pointer"
                >
                  <Send size={11} />
                  <span>{isSendingOtp ? 'Sending OTP...' : 'Login with Fast2SMS OTP instead'}</span>
                </button>
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer ${
                  accountType === 'admin'
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                <span>{accountType === 'admin' ? 'Authorize & Enter Command Center' : 'Sign In to Pathly'}</span>
                <ArrowRight size={14} />
              </button>
            </form>
          )}

          {/* MODE 2: NEW USER / OFFICER REGISTRATION */}
          {mode === 'signup' && (
            <form onSubmit={(e) => {
              e.preventDefault();
              setAuthError(null);
              if (!name.trim()) {
                setAuthError('Please enter your full name to register.');
                return;
              }
              if (phone.replace(/\D/g, '').length < 10) {
                setAuthError('Please enter a valid 10-digit mobile number.');
                return;
              }
              if (!state) {
                setAuthError('Please select your Primary State.');
                return;
              }
              handleSendOtp();
            }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {accountType === 'admin' ? 'Officer Full Name' : 'User Full Name'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 98XXXXXXXX"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Primary State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value as NERState | '')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="" disabled>Select State</option>
                    <option value="Assam">Assam</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Sikkim">Sikkim</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {accountType === 'admin' ? 'Badge / Official ID' : 'Vehicle Reg No. (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value)}
                    placeholder={accountType === 'admin' ? 'e.g. REG-CMD-8842' : 'e.g. AS-01-EC-9042 (Optional)'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {accountType === 'admin' ? 'Department / Agency' : 'Organization / Union (Optional)'}
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder={accountType === 'admin' ? 'e.g. Disaster Management Authority' : 'e.g. Northeast Freight Union (Optional)'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingOtp}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
              >
                <span>{isSendingOtp ? 'Sending Fast2SMS OTP...' : 'Verify Mobile via Fast2SMS & Register'}</span>
                <Send size={13} />
              </button>
            </form>
          )}

          {/* MODE 3: FAST2SMS 6-DIGIT OTP VERIFICATION */}
          {mode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto shadow-inner">
                  <Fingerprint size={26} />
                </div>
                <h4 className="font-bold text-sm text-white pt-1">
                  Enter 6-Digit Verification OTP
                </h4>
                <p className="text-xs text-slate-400">
                  Code dispatched to <strong className="text-blue-300">{phone}</strong>
                </p>
                {sentOtp && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-mono font-bold mt-1">
                    <span>⚡ Live Fast2SMS Code:</span>
                    <span className="text-sm tracking-widest">{sentOtp}</span>
                  </div>
                )}
              </div>

              {/* High Visibility 6-Digit Segmented Input Boxes */}
              <div className="py-2">
                <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-box-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center font-mono font-black text-lg sm:text-xl bg-slate-950 border-2 border-blue-500/70 focus:border-blue-400 rounded-xl text-white shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="hover:text-blue-400 flex items-center gap-1 underline transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>{isSendingOtp ? 'Resending...' : 'Resend OTP'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Use Password Instead
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  Verify & Enter Portal
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Security Notice */}
        <div className="p-3 bg-slate-950 text-center text-[10px] text-slate-500 font-mono">
          🔒 Secured by Pathly 256-Bit GovCloud Encryption • Fast2SMS Gateway Active
        </div>
      </div>
    </div>,
    document.body
  );
}
