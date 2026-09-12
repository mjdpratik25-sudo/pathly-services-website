// ============================================================
// Login: Full-page e-governance authentication portal
// Supports Light / High-Contrast Dark theme.
// ============================================================

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  User,
  Shield,
  Lock,
  Phone,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  IdCard,
  Building2,
  MapPin,
  Send
} from 'lucide-react';
import type { NERState } from '../data/nerData';
import { type OfficerProfile, GUEST_NAME } from '../components/auth/OfficerAuthModal';

interface LoginProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const STATES: NERState[] = [
  'Assam',
  'Tripura',
  'Meghalaya',
  'Manipur',
  'Mizoram',
  'Nagaland',
  'Arunachal Pradesh',
  'Sikkim'
];

const LOGISTICS_PARTNERS = [
  'Delhivery',
  'Shiprocket',
  'Ecom Express',
  'XpressBees',
  'Blue Dart',
  'DTDC',
  'Other'
];

const OTHER_PARTNER_OPTION = 'Other';

export default function Login({ isDark }: LoginProps) {
  const [, setLocation] = useLocation();

  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [mode, setMode] = useState<'login' | 'register' | 'otp'>('login');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [department, setDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [state, setState] = useState<NERState | ''>('');
  const [logisticsPartner, setLogisticsPartner] = useState('');
  const [customLogisticsPartner, setCustomLogisticsPartner] = useState('');

  const effectiveLogisticsPartner = () =>
    logisticsPartner === OTHER_PARTNER_OPTION
      ? customLogisticsPartner.trim() || 'Other'
      : logisticsPartner;

  const effectiveDepartment = () =>
    department === OTHER_PARTNER_OPTION ? customDepartment.trim() || 'Other' : department;

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [sentOtp, setSentOtp] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);

  const finishAuth = (profile: OfficerProfile) => {
    try {
      localStorage.setItem('pathly_officer_session', JSON.stringify(profile));
    } catch {}
    setAuthSuccess(true);
    setTimeout(() => {
      setLocation('/');
    }, 400);
  };

  

  const handleOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = cleaned;
    setOtpDigits(next);
    if (cleaned && index < 5) {
      document.getElementById(`login-otp-${index + 1}`)?.focus();
    }
  };

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const effectivePhone = phone.trim() || '9864011223';
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      finishAuth({
        id: role === 'admin' ? 'adm-001' : 'usr-001',
        name: name.trim() || GUEST_NAME,
        role: role === 'admin' ? 'Admin' : 'Public User / Transporter',
        badgeId: badgeId.trim() || (role === 'admin' ? 'REG-CMD-8842' : 'CITIZEN-USER'),
        department: (role === 'admin' ? effectiveDepartment() : department.trim()) || (role === 'admin' ? 'Regional Logistics Control' : 'Public Portal'),
        state: state === '' ? 'Assam' : state,
        phone: effectivePhone,
        clearanceLevel: role === 'admin' ? 4 : 1,
        loggedInAt: new Date().toISOString(),
        accountType: role,
        logisticsPartner: role === 'admin' ? effectiveLogisticsPartner() : undefined
      });
    }, 500);
  };

  const handleSendOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetPhone = phone.trim() || '9864011223';
    setPhone(targetPhone);
    setAuthError(null);
    if (mode === 'register' && state === '') {
      setAuthError('Please select your primary state to continue.');
      return;
    }
    setSentOtp('592810');
    setOtpDigits(['5', '9', '2', '8', '1', '0']);
    setMode('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpDigits.join('').length < 6) {
      setAuthError('Please enter the full 6-digit OTP code.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      finishAuth({
        id: `${role === 'admin' ? 'adm' : 'usr'}-${Date.now().toString().slice(-4)}`,
        name: name.trim() || GUEST_NAME,
        role: role === 'admin' ? 'Admin' : 'Public User / Transporter',
        badgeId: badgeId || (role === 'admin' ? 'REG-CMD-8842' : 'USR-REG-1024'),
        department: role === 'admin' ? effectiveDepartment() || 'Regional Logistics Control' : 'Public Portal',
        state: state === '' ? 'Assam' : state,
        phone,
        clearanceLevel: role === 'admin' ? 4 : 1,
        loggedInAt: new Date().toISOString(),
        accountType: role
      });
    }, 500);
  };

  const border = isDark ? 'border-[#3a3f47]' : 'border-[#b8c1ce]';
  const panel = isDark ? 'bg-[#0d0f11]' : 'bg-white';
  const label = isDark ? 'text-slate-300' : 'text-slate-700';
  const input = isDark
    ? 'bg-[#16181c] border-[#3a3f47] text-white placeholder-slate-500 focus:border-[#FFC107]'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#0B3D6D]';
  const bodyText = isDark ? 'text-slate-300' : 'text-slate-600';
  const accent = isDark ? 'text-[#FFC107]' : 'text-[#0B3D6D]';
  const tabActive = isDark
    ? 'bg-[#FFC107] text-black border-[#FFC107]'
    : 'bg-[#0B3D6D] text-white border-[#0B3D6D]';
  const tabInactive = isDark
    ? 'text-[#D6B94A] hover:bg-[#16181c] border-transparent'
    : 'text-[#0B3D6D] hover:bg-slate-100 border-transparent';
  const btnSolid = isDark
    ? 'bg-[#FFC107] hover:bg-[#FFD54F] text-black'
    : 'bg-[#7A1F1F] hover:bg-[#6A1B1B] text-white';

  return (
    <div className={`w-full ${isDark ? 'bg-black text-white' : 'bg-[#F5F6F8] text-slate-900'}`}>
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header Identity */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-[#0B3D6D] text-white mb-2">
            <Shield size={22} />
          </div>
          <h1 className={`text-xl font-bold ${accent}`}>Pathly Regional Command</h1>
          <p className={`text-xs mt-0.5 ${bodyText}`}>
            Logistics &amp; Route Intelligence — Secure Portal Sign In
          </p>
        </div>

        {/* Bordered rectangular login panel */}
        <div className={`border ${border} ${panel} shadow-sm`}>
          {/* Role tabs */}
          <div className={`grid grid-cols-2 border-b ${isDark ? 'border-[#2a2e35]' : 'border-[#d5dbe2]'}`}>
            <button
              type="button"
              onClick={() => { setRole('user'); setMode('login'); setAuthError(null); }}
              className={`flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-colors ${
                role === 'user' ? `border-current ${accent}` : `border-transparent ${bodyText} hover:${accent}`
              }`}
            >
              <User size={14} />
              <span>User / Citizen</span>
            </button>
            <button
              type="button"
              onClick={() => { setRole('admin'); setMode('login'); setAuthError(null); }}
              className={`flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-colors ${
                role === 'admin' ? `border-current ${accent}` : `border-transparent ${bodyText} hover:${accent}`
              }`}
            >
              <Shield size={14} />
              <span>Admin / Officer</span>
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Mode tabs */}
            <div className={`flex border-b ${isDark ? 'border-[#2a2e35]' : 'border-[#d5dbe2]'}`}>
              {(['login', 'register', 'otp'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setAuthError(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                    mode === m
                      ? `border-current ${accent}`
                      : `border-transparent ${bodyText} hover:${accent}`
                  }`}
                >
                  {m === 'login' ? <KeyRound size={12} /> : m === 'register' ? <IdCard size={12} /> : <Phone size={12} />}
                  <span>{m === 'login' ? 'Sign In' : m === 'register' ? 'Register' : 'OTP'}</span>
                </button>
              ))}
            </div>

            {authError && (
              <div className={`p-3 border text-xs flex items-center justify-between ${isDark ? 'border-rose-700 bg-rose-950/50 text-rose-300' : 'border-rose-600 bg-rose-50 text-rose-800'}`}>
                <span>{authError}</span>
                <button type="button" onClick={() => setAuthError(null)}>×</button>
              </div>
            )}
            {authSuccess && (
              <div className={`p-3 border text-xs flex items-center gap-2 ${isDark ? 'border-green-600 bg-green-950/50 text-green-300' : 'border-green-700 bg-green-50 text-green-800'}`}>
                <CheckCircle2 size={15} />
                <span>Signed in successfully. Redirecting…</span>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handlePasswordLogin} className="space-y-3">
                {role === 'admin' && (
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${label}`}>Logistics Partner</label>
                    <select
                      value={logisticsPartner}
                      onChange={(e) => setLogisticsPartner(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border outline-none ${input} ${
                        logisticsPartner ? '' : (isDark ? 'text-slate-500' : 'text-slate-400')
                      }`}
                    >
                      <option value="" disabled>Select your logistics partner</option>
                      {LOGISTICS_PARTNERS.map((partner) => (
                        <option key={partner} value={partner}>{partner}</option>
                      ))}
                    </select>
                    {logisticsPartner === OTHER_PARTNER_OPTION && (
                      <input
                        type="text"
                        value={customLogisticsPartner}
                        onChange={(e) => setCustomLogisticsPartner(e.target.value)}
                        placeholder="Enter your logistics partner name"
                        className={`w-full mt-2 px-3 py-2 text-xs border outline-none ${input}`}
                      />
                    )}
                  </div>
                )}
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${label}`}>
                    {role === 'admin' ? 'Mobile Number / Officer ID' : 'Mobile Number'}
                  </label>
                  <div className="relative">
                    <Phone size={14} className={`absolute left-3 top-2.5 ${bodyText}`} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 98XXXXXXXX"
                      className={`w-full pl-9 pr-3 py-2 text-xs border outline-none ${input}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${label}`}>Password</label>
                  <div className="relative">
                    <Lock size={14} className={`absolute left-3 top-2.5 ${bodyText}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. pathly2026"
                      className={`w-full pl-9 pr-9 py-2 text-xs border outline-none ${input}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-2.5 top-2 ${bodyText}`}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${btnSolid}`}
                >
                  {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
                  <span>{role === 'admin' ? 'Authorize & Enter Command Center' : 'Sign In to Pathly'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  className={`text-[11px] font-semibold underline flex items-center gap-1 ${accent}`}
                >
                  <Send size={11} />
                  <span>Log in with OTP instead</span>
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${label}`}>Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className={`w-full px-3 py-2 text-xs border outline-none ${input}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${label}`}>Mobile Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 98XXXXXXXX"
                      className={`w-full px-3 py-2 text-xs border outline-none ${input}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${label}`}>Primary State</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value as NERState)}
                      className={`w-full px-3 py-2 text-xs border outline-none ${input}`}
                    >
                      <option value="" disabled>Select State</option>
                      {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${label}`}>
                      {role === 'admin' ? 'Badge / Official ID' : 'Vehicle Reg No. (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={badgeId}
                      onChange={(e) => setBadgeId(e.target.value)}
                      placeholder={role === 'admin' ? 'e.g. REG-CMD-8842' : 'e.g. AS-01-EC-9042 (Optional)'}
                      className={`w-full px-3 py-2 text-xs border outline-none font-mono ${input}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${label}`}>
                    {role === 'admin' ? 'Department / Agency' : 'Organization / Union (Optional)'}
                  </label>
                  <div className="relative">
                    {role === 'admin' ? (
                      <>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className={`w-full px-3 py-2 text-xs border outline-none ${input} ${
                            department ? '' : (isDark ? 'text-slate-500' : 'text-slate-400')
                          }`}
                        >
                          <option value="" disabled>Select Department / Agency</option>
                          {LOGISTICS_PARTNERS.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        {department === OTHER_PARTNER_OPTION && (
                          <input
                            type="text"
                            value={customDepartment}
                            onChange={(e) => setCustomDepartment(e.target.value)}
                            placeholder="e.g. Regional Logistics Command"
                            className={`w-full mt-2 px-3 py-2 text-xs border outline-none ${input}`}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <Building2 size={14} className={`absolute left-3 top-2.5 ${bodyText}`} />
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="e.g. Northeast Freight Union (Optional)"
                          className={`w-full pl-9 pr-3 py-2 text-xs border outline-none ${input}`}
                        />
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  className={`w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${btnSolid}`}
                >
                  <Send size={13} />
                  <span>Verify Mobile via OTP &amp; Register</span>
                </button>
              </form>
            )}

            {mode === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center space-y-1">
                  <div className={`inline-flex items-center justify-center w-11 h-11 border ${isDark ? 'border-[#FFC107]' : 'border-[#0B3D6D]'}`}>
                    <KeyRound size={20} className={accent} />
                  </div>
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Enter 6-Digit Verification OTP
                  </p>
                  <p className={`text-xs ${bodyText}`}>
                    Code dispatched to <strong className={accent}>{phone}</strong>
                  </p>
                  {sentOtp && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold mt-1 ${isDark ? 'bg-[#FFC107]/10 text-[#FFC107]' : 'bg-[#0B3D6D]/10 text-[#0B3D6D]'}`}>
                      <span>Access code:</span>
                      <span className="tracking-widest">{sentOtp}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2">
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      id={`login-otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      className={`w-10 h-12 text-center text-lg font-bold border outline-none ${isDark ? 'bg-[#16181c] border-[#3a3f47] text-white focus:border-[#FFC107]' : 'bg-white border-slate-300 text-slate-900 focus:border-[#0B3D6D]'}`}
                    />
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={`flex-1 py-2.5 text-xs font-semibold border ${isDark ? 'border-[#3a3f47] text-slate-200 hover:bg-[#16181c]' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${btnSolid}`}
                  >
                    {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    <span>Verify &amp; Enter Portal</span>
                  </button>
                </div>

                <div className="text-center">
                  <button type="button" onClick={handleSendOtp} className={`text-[11px] font-semibold underline ${accent}`}>
                    Resend OTP
                  </button>
                </div>
              </form>
            )}

            {/* Location / agency context line */}
            <div className={`flex items-center gap-1.5 text-[11px] border-t pt-3 ${bodyText} ${isDark ? 'border-[#2a2e35]' : 'border-[#d5dbe2]'}`}>
              <MapPin size={12} />
              <span>Pathly Regional Command — all sectors</span>
            </div>
          </div>
        </div>

        {/* Official footer links */}
        <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-[11px] ${bodyText}`}>
          {['Terms of Use', 'Privacy Policy', 'Accessibility', 'Support'].map((link) => (
            <a key={link} href="#" className={`hover:underline ${accent}`}>{link}</a>
          ))}
        </div>
        <p className={`text-center text-[10px] mt-3 ${bodyText}`}>
          © 2026 Pathly Network. Secured access for authorized personnel only.
        </p>
      </div>
    </div>
  );
}
