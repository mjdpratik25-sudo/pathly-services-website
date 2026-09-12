import React, { useState, useEffect } from 'react';
import {
  Wrench,
  ShieldCheck,
  Check,
  ArrowRight,
  Sparkles,
  Phone,
  MapPin,
  User,
  Briefcase,
  Zap,
  Star,
  Crown,
  Lock,
  Smartphone,
  CheckCircle2,
  Clock,
  Radio,
  Building,
  DollarSign,
  Send,
  Eye,
  RefreshCw,
  Search,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { AGENT_PRICING_PLANS, NE_STATES, NE_ALL_CITIES } from '../data/mockData';

export interface AuthUser {
  id: string;
  name: string;
  role: 'user' | 'agent';
  phone?: string;
  email?: string;
  state?: string;
  city?: string;
  area?: string;
  category?: string;
  planId?: string;
  planName?: string;
  isPro?: boolean;
  avatar?: string;
}

interface FrontGatewayProps {
  onAuthenticate: (user: AuthUser) => void;
  onExploreGuest: () => void;
}

export const FrontGateway: React.FC<FrontGatewayProps> = ({ onAuthenticate, onExploreGuest }) => {
  const [portalMode, setPortalMode] = useState<'user' | 'agent'>('user');

  // User Auth State
  const [userTab, setUserTab] = useState<'login' | 'signup'>('login');
  const [userPhone, setUserPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [userState, setUserState] = useState(NE_STATES[0].name);
  const [userCity, setUserCity] = useState(NE_STATES[0].cities[0]);
  const [userOtpSent, setUserOtpSent] = useState(false);
  const [userOtpCode, setUserOtpCode] = useState(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState('');

  // Agent Auth & Plan State
  const [agentTab, setAgentTab] = useState<'plans' | 'login' | 'register'>('plans');
  const [selectedAgentPlan, setSelectedAgentPlan] = useState<'monthly' | 'annual'>('annual');
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentCategory, setAgentCategory] = useState('Plumber');
  const [agentState, setAgentState] = useState(NE_STATES[0].name);
  const [agentCity, setAgentCity] = useState(NE_STATES[0].cities[0]);
  const [agentExp, setAgentExp] = useState('5+ years');
  const [agentIdType, setAgentIdType] = useState('Aadhaar Card');
  const [agentLoginPhone, setAgentLoginPhone] = useState('');
  const [agentLoginOtpSent, setAgentLoginOtpSent] = useState(false);
  const [agentLoginOtp, setAgentLoginOtp] = useState(['', '', '', '', '', '']);

  // Derived cities for the selected state
  const userCities = NE_STATES.find(s => s.name === userState)?.cities || [];
  const agentCities = NE_STATES.find(s => s.name === agentState)?.cities || [];

  // Floating design tags
  const designTags = [
    { icon: '⚡', text: 'Instant 30-Min Local Response', delay: '0s' },
    { icon: '🛡️', text: '100% Background Verified Pros', delay: '1.2s' },
    { icon: '📍', text: 'Live across 7 Northeast States', delay: '2.4s' },
    { icon: '🤝', text: '0% Agent Commission Guarantee', delay: '0.6s' },
    { icon: '⭐', text: '4.9★ Average Pro Customer Rating', delay: '1.8s' },
    { icon: '💰', text: 'Transparent Price Fixing', delay: '3.0s' },
  ];

  // OTP timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (userOtpSent && otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [userOtpSent, otpCountdown]);

  // Sync city when state changes
  useEffect(() => {
    const cities = NE_STATES.find(s => s.name === userState)?.cities || [];
    if (cities.length && !cities.includes(userCity)) setUserCity(cities[0]);
  }, [userState]);

  useEffect(() => {
    const cities = NE_STATES.find(s => s.name === agentState)?.cities || [];
    if (cities.length && !cities.includes(agentCity)) setAgentCity(cities[0]);
  }, [agentState]);

  const handleGoogleLogin = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onAuthenticate({
        id: 'usr_g_' + Math.random().toString(36).substring(2, 9),
        name: 'Dear User',
        email: 'pratik.ne@gmail.com',
        phone: '+91 98621 54321',
        state: userState,
        city: userCity,
        role: 'user',
        isPro: false,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      });
    }, 900);
  };

  const handleSendUserOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPhone || userPhone.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number');
      return;
    }
    setAuthError('');
    setUserOtpSent(true);
    setOtpCountdown(30);
    setTimeout(() => {
      setUserOtpCode(['7', '4', '2', '9', '1', '0']);
    }, 1200);
  };

  const handleVerifyUserOtp = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onAuthenticate({
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        name: userName.trim() || 'Pathly Customer',
        phone: '+91 ' + userPhone.replace(/^(\+91|0)/, ''),
        state: userState,
        city: userCity,
        role: 'user',
        isPro: false
      });
    }, 800);
  };

  const handleAgentRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName || !agentPhone) {
      setAuthError('Please fill in your name and contact number');
      return;
    }
    const chosenPlan = AGENT_PRICING_PLANS.find(p => p.id === selectedAgentPlan)!;
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onAuthenticate({
        id: 'agt_' + Math.random().toString(36).substring(2, 9),
        name: agentName,
        phone: '+91 ' + agentPhone.replace(/^(\+91|0)/, ''),
        state: agentState,
        city: agentCity,
        category: agentCategory,
        role: 'agent',
        planId: chosenPlan.id,
        planName: chosenPlan.name
      });
    }, 900);
  };

  const handleAgentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentLoginPhone) {
      setAuthError('Please enter registered phone / Agent ID');
      return;
    }
    if (!agentLoginOtpSent) {
      setAgentLoginOtpSent(true);
      setTimeout(() => {
        setAgentLoginOtp(['8', '1', '3', '5', '9', '2']);
      }, 1000);
      return;
    }
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onAuthenticate({
        id: 'agt_reg_9042',
        name: 'Ratan Bhowmik (Senior Pro)',
        phone: '+91 ' + agentLoginPhone,
        state: 'Tripura',
        city: 'Agartala',
        category: 'Plumber',
        role: 'agent',
        planId: 'annual',
        planName: 'Annual VIP Partner Pass'
      });
    }, 800);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#0a2323] via-[#0f3d38] to-[#124b4b] text-[#f7f5ed] font-sans flex flex-col justify-between selection:bg-[#f27e68] selection:text-white">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#f27e68]/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 -right-32 w-[32rem] h-[32rem] bg-[#38bdf8]/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-32 left-1/3 w-[30rem] h-[30rem] bg-[#2dd4bf]/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.035] text-[20vw] font-serif font-black tracking-tighter text-white pointer-events-none whitespace-nowrap">
          PATHLY
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(#2dd4bf_1px,transparent_1px)] [background-size:36px_36px] opacity-[0.07]" />
      </div>

      {/* Header */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-black/10">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#f27e68] to-[#f6a08f] shadow-lg shadow-[#f27e68]/30 animate-bounce" style={{ animationDuration: '3s' }}>
            <Wrench className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#0a2323]"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-bold tracking-tight text-white">Pathly</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Northeast India
              </span>
            </div>
            <p className="text-xs text-emerald-100/70">Help, close to home — across 7 NE states.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExploreGuest}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full border border-white/20 bg-white/5 hover:bg-white/15 text-[#f7f5ed] transition-all hover:scale-105 active:scale-95"
          >
            <span>Explore as Guest</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#f27e68]" />
          </button>
        </div>
      </header>

      {/* Main Stage */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-10 grid lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Col — Brand + Floating Badges */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-400/30 w-fit backdrop-blur-sm shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-emerald-300 tracking-wide">
              24/7 Verified Network • Assam • Meghalaya • Tripura • Manipur • Mizoram • Nagaland • Arunachal Pradesh
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-[1.1]">
              Trusted local help,{' '}
              <span className="bg-gradient-to-r from-[#f27e68] via-[#fbd38d] to-[#6ee7b7] bg-clip-text text-transparent underline decoration-[#f27e68]/50 decoration-wavy decoration-2">
                across Northeast India.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-emerald-100/80 max-w-xl font-light leading-relaxed">
              Connect with verified local electricians, plumbers, house help, and nearby essentials in 40+ cities across all 7 Northeast states with fair transparent pricing and 0% agent commission.
            </p>
          </div>

          {/* Floating Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {designTags.map((tag, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-md hover:bg-white/[0.12] hover:border-[#f27e68]/40 transition-all hover:scale-[1.02] shadow-sm group"
              >
                <span className="text-lg group-hover:scale-125 transition-transform">{tag.icon}</span>
                <span className="text-xs font-medium text-white/90">{tag.text}</span>
              </div>
            ))}
          </div>

          {/* Stats Row */}
          <div className="pt-4 flex items-center gap-6 border-t border-white/10 text-xs text-emerald-200/80">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white font-serif">7</span>
              <span>NE States<br />Covered</span>
            </div>
            <div className="h-7 w-px bg-white/15" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white font-serif">40+</span>
              <span>Cities<br />Active</span>
            </div>
            <div className="h-7 w-px bg-white/15" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white font-serif">14+</span>
              <span>Help<br />Categories</span>
            </div>
            <div className="h-7 w-px bg-white/15" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-emerald-300 font-serif">₹0</span>
              <span>Commission<br />for Agents</span>
            </div>
          </div>
        </div>

        {/* Right Col — Dual Portal Card */}
        <div className="lg:col-span-6 w-full max-w-xl mx-auto">
          <div className="relative rounded-3xl bg-[#0d2e2b]/85 border border-white/20 p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all">
            
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#f27e68]/30 rounded-full blur-2xl pointer-events-none" />

            {/* Dual Role Switcher */}
            <div className="relative mb-6 p-1 rounded-2xl bg-[#071d1b] border border-white/10 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => { setPortalMode('user'); setAuthError(''); }}
                className={`relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  portalMode === 'user'
                    ? 'bg-gradient-to-r from-[#f27e68] to-[#e66c54] text-white shadow-lg shadow-[#f27e68]/30'
                    : 'text-emerald-200/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Login as User</span>
                {portalMode === 'user' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-1 bg-white rounded-full" />}
              </button>
              <button
                type="button"
                onClick={() => { setPortalMode('agent'); setAuthError(''); }}
                className={`relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  portalMode === 'agent'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'text-emerald-200/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Login as Agent</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-400 text-black">PRICING</span>
                {portalMode === 'agent' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-1 bg-white rounded-full" />}
              </button>
            </div>

            {/* Error Display */}
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2 animate-shake">
                <span className="font-bold">⚠️</span> {authError}
              </div>
            )}

            {/* ===== USER PORTAL ===== */}
            {portalMode === 'user' && (
              <div className="space-y-5">
                
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-white">
                      {userTab === 'login' ? 'Welcome Back!' : 'Create Customer Account'}
                    </h3>
                    <p className="text-xs text-emerald-200/70">
                      {userTab === 'login' ? 'Sign in to access verified local services' : "Join Northeast India's largest local services network"}
                    </p>
                  </div>
                  <div className="flex items-center bg-[#071d1b] rounded-lg p-0.5 border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => { setUserTab('login'); setUserOtpSent(false); }}
                      className={`px-3 py-1.5 rounded-md font-semibold transition ${userTab === 'login' ? 'bg-[#f27e68] text-white' : 'text-white/60 hover:text-white'}`}
                    >Log In</button>
                    <button
                      type="button"
                      onClick={() => { setUserTab('signup'); setUserOtpSent(false); }}
                      className={`px-3 py-1.5 rounded-md font-semibold transition ${userTab === 'signup' ? 'bg-[#f27e68] text-white' : 'text-white/60 hover:text-white'}`}
                    >Sign Up</button>
                  </div>
                </div>

                {/* Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isVerifying}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white text-gray-900 font-semibold text-sm shadow-md hover:bg-gray-50 transition-all hover:scale-[1.01] active:scale-98 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center gap-3 text-xs text-white/40">
                  <div className="flex-1 h-px bg-white/15" />
                  <span>or with Mobile Number</span>
                  <div className="flex-1 h-px bg-white/15" />
                </div>

                {/* Mobile + OTP */}
                {!userOtpSent ? (
                  <form onSubmit={handleSendUserOtp} className="space-y-3.5">
                    
                    {userTab === 'signup' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-emerald-100/90 mb-1">Your Full Name</label>
                          <input
                            type="text" required value={userName} onChange={(e) => setUserName(e.target.value)}
                            placeholder="Your full name"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#071d1b] border border-white/15 text-white text-sm outline-none focus:border-[#f27e68] focus:ring-1 focus:ring-[#f27e68]"
                          />
                        </div>

                        {/* State + City Selector */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-emerald-100/90 mb-1">Your State</label>
                            <select
                              value={userState} onChange={(e) => setUserState(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl bg-[#071d1b] border border-white/15 text-white text-sm outline-none focus:border-[#f27e68] appearance-none"
                            >
                              {NE_STATES.map(s => (
                                <option key={s.name} value={s.name} className="bg-[#071d1b] text-white">{s.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-emerald-100/90 mb-1">Your City</label>
                            <div className="relative">
                              <select
                                value={userCity} onChange={(e) => setUserCity(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-[#071d1b] border border-white/15 text-white text-sm outline-none focus:border-[#f27e68] appearance-none"
                              >
                                {userCities.map(c => (
                                  <option key={c} value={c} className="bg-[#071d1b] text-white">📍 {c}</option>
                                ))}
                              </select>
                              <MapPin className="w-4 h-4 text-[#f27e68] absolute right-3 top-3 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-emerald-100/90 mb-1">Mobile Number</label>
                      <div className="flex items-center rounded-xl bg-[#071d1b] border border-white/15 focus-within:border-[#f27e68] overflow-hidden">
                        <span className="px-3.5 py-2.5 text-xs font-bold text-emerald-400 bg-white/5 border-r border-white/10">+91</span>
                        <input
                          type="tel" required maxLength={10} value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="98765 43210"
                          className="flex-1 px-3.5 py-2.5 bg-transparent text-white text-sm outline-none placeholder:text-white/30 tracking-wider"
                        />
                      </div>
                    </div>

                    <button type="submit" className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#f27e68] to-[#e66c54] text-white font-bold text-sm shadow-lg shadow-[#f27e68]/30 hover:opacity-95 transition flex items-center justify-center gap-2">
                      <span>{userTab === 'login' ? 'Send Login OTP' : 'Send Verification Code'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between">
                      <div>
                        <span>OTP sent to <strong>+91 {userPhone}</strong></span>
                        <span className="block text-[10px] text-emerald-300">Code auto-generated for testing: <strong>742910</strong></span>
                      </div>
                      <button type="button" onClick={() => setUserOtpSent(false)} className="text-[11px] underline text-[#f27e68] hover:text-white">Change</button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-emerald-100/90 mb-2 text-center">Enter 6-Digit Verification Code</label>
                      <div className="flex justify-center gap-2">
                        {userOtpCode.map((digit, idx) => (
                          <input
                            key={idx} id={`user-otp-${idx}`} type="text" maxLength={1} value={digit}
                            onChange={(e) => {
                              const val = e.target.value.slice(-1);
                              const newArr = [...userOtpCode]; newArr[idx] = val; setUserOtpCode(newArr);
                              if (val && idx < 5) document.getElementById(`user-otp-${idx + 1}`)?.focus();
                            }}
                            className="w-10 h-12 text-center text-lg font-bold rounded-xl bg-[#071d1b] border border-white/20 text-white focus:border-[#f27e68] focus:ring-1 focus:ring-[#f27e68] outline-none"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-emerald-200/70">
                      <span>Resend code in: <strong className="text-white">{otpCountdown}s</strong></span>
                      {otpCountdown === 0 && (
                        <button type="button" onClick={() => setOtpCountdown(30)} className="text-[#f27e68] hover:underline font-semibold">Resend OTP</button>
                      )}
                    </div>

                    <button
                      type="button" onClick={handleVerifyUserOtp} disabled={isVerifying}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#f27e68] to-[#e66c54] text-white font-bold text-sm shadow-lg shadow-[#f27e68]/30 hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /><span>Verify & Enter Pathly</span></>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ===== AGENT PORTAL ===== */}
            {portalMode === 'agent' && (
              <div className="space-y-5">
                
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-serif font-bold text-white">Agent Partner Gateway</h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">0% Commission</span>
                    </div>
                    <p className="text-xs text-emerald-200/70">Earn 100% direct pay from local customers across NE India</p>
                  </div>
                  <div className="flex items-center bg-[#071d1b] rounded-lg p-0.5 border border-white/10 text-xs">
                    <button type="button" onClick={() => setAgentTab('plans')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${agentTab === 'plans' ? 'bg-emerald-600 text-white' : 'text-white/60 hover:text-white'}`}>Plans</button>
                    <button type="button" onClick={() => setAgentTab('register')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${agentTab === 'register' ? 'bg-emerald-600 text-white' : 'text-white/60 hover:text-white'}`}>Join</button>
                    <button type="button" onClick={() => setAgentTab('login')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${agentTab === 'login' ? 'bg-emerald-600 text-white' : 'text-white/60 hover:text-white'}`}>Login</button>
                  </div>
                </div>

                {/* AGENT PLANS */}
                {agentTab === 'plans' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {AGENT_PRICING_PLANS.map((plan) => {
                        const isSelected = selectedAgentPlan === plan.id;
                        return (
                          <div
                            key={plan.id} onClick={() => setSelectedAgentPlan(plan.id as any)}
                            className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${
                              isSelected ? 'bg-gradient-to-b from-emerald-900/60 to-[#072421] border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                                : 'bg-[#071d1b]/70 border-white/10 hover:border-white/20'}`}
                          >
                            {plan.featured && <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md">{plan.badge}</span>}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-white">{plan.name}</span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-white/30'}`}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                              </div>
                            </div>
                            <div className="flex items-baseline gap-1 mb-2">
                              <span className="text-2xl font-black text-white font-serif">₹{plan.price}</span>
                              <span className="text-[11px] text-emerald-200/70">{plan.period}</span>
                            </div>
                            <div className="text-[10px] font-medium text-emerald-400 mb-3">{plan.billingTag}</div>
                            <ul className="space-y-1.5 text-[11px] text-emerald-100/80">
                              {plan.perks.slice(0, 3).map((perk, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><span className="leading-tight">{perk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                      <button type="button" onClick={() => setAgentTab('register')}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:opacity-95 transition flex items-center justify-center gap-2">
                        <Crown className="w-4 h-4 text-amber-300" />
                        <span>Proceed with {selectedAgentPlan === 'annual' ? 'Annual VIP Pass (₹799/yr)' : 'Monthly Pass (₹99/mo)'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <p className="text-center text-[11px] text-emerald-200/60">
                        Already registered?{' '}<button type="button" onClick={() => setAgentTab('login')} className="text-emerald-300 font-bold hover:underline">Sign In here</button>
                      </p>
                    </div>
                  </div>
                )}

                {/* AGENT REGISTER */}
                {agentTab === 'register' && (
                  <form onSubmit={handleAgentRegister} className="space-y-3 animate-fadeIn">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-300" />
                        <div>
                          <span className="font-bold text-white">{selectedAgentPlan === 'annual' ? 'Annual VIP Pass (₹799/yr)' : 'Monthly Pass (₹99/mo)'}</span>
                          <span className="block text-[10px] text-emerald-300">0% Commission • Verified Badge</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => setAgentTab('plans')} className="text-[10px] text-[#f27e68] hover:underline">Change Plan</button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-emerald-100/90 mb-1">Your Full Name</label>
                        <input type="text" required value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="e.g. Ratan Bhowmik"
                          className="w-full px-3 py-2 rounded-xl bg-[#071d1b] border border-white/15 text-white text-xs outline-none focus:border-emerald-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-100/90 mb-1">Mobile / WhatsApp</label>
                        <input type="tel" required value={agentPhone} onChange={(e) => setAgentPhone(e.target.value.replace(/\D/g, ''))} placeholder="98765 43210"
                          className="w-full px-3 py-2 rounded-xl bg-[#071d1b] border border-white/15 text-white text-xs outline-none focus:border-emerald-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-emerald-100/90 mb-1">Service Profession</label>
                      <select value={agentCategory} onChange={(e) => setAgentCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#071d1b] border border-white/15 text-white text-xs outline-none focus:border-emerald-400">
                        {["Plumber", "Electrician", "Home help", "Pet care", "Home setup", "AC repair", "Cleaning and pest control", "Salon and massage", "Laundry", "Home painting and renovation"].map(cat => (
                          <option key={cat} value={cat} className="bg-[#071d1b] text-white">{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-emerald-100/90 mb-1">State</label>
                        <select value={agentState} onChange={(e) => setAgentState(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#071d1b] border border-white/15 text-white text-xs outline-none focus:border-emerald-400">
                          {NE_STATES.map(s => <option key={s.name} value={s.name} className="bg-[#071d1b] text-white">{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-100/90 mb-1">City / Work Area</label>
                        <select value={agentCity} onChange={(e) => setAgentCity(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#071d1b] border border-white/15 text-white text-xs outline-none focus:border-emerald-400">
                          {agentCities.map(c => <option key={c} value={c} className="bg-[#071d1b] text-white">📍 {c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-emerald-100/90 mb-1">Experience</label>
                        <select value={agentExp} onChange={(e) => setAgentExp(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#071d1b] border border-white/15 text-white text-xs outline-none focus:border-emerald-400">
                          <option value="1-2 years">1-2 years</option><option value="3-5 years">3-5 years</option>
                          <option value="5+ years">5+ years (Expert)</option><option value="10+ years">10+ years (Master)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-100/90 mb-1">ID Verification</label>
                        <select value={agentIdType} onChange={(e) => setAgentIdType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#071d1b] border border-white/15 text-white text-xs outline-none focus:border-emerald-400">
                          <option value="Aadhaar Card">Aadhaar Card</option><option value="Voter ID Card">Voter ID Card</option><option value="Trade License">Trade License</option>
                        </select>
                      </div>
                    </div>

                    <button type="submit" disabled={isVerifying}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:opacity-95 transition flex items-center justify-center gap-2">
                      {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /><span>Activate Verified Agent Account</span></>}
                    </button>
                  </form>
                )}

                {/* AGENT LOGIN */}
                {agentTab === 'login' && (
                  <form onSubmit={handleAgentLogin} className="space-y-3.5 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-semibold text-emerald-100/90 mb-1">Registered Mobile / Agent ID</label>
                      <div className="flex items-center rounded-xl bg-[#071d1b] border border-white/15 focus-within:border-emerald-400 overflow-hidden">
                        <span className="px-3 py-2.5 text-xs font-bold text-emerald-400 bg-white/5 border-r border-white/10">+91</span>
                        <input type="tel" required value={agentLoginPhone} onChange={(e) => setAgentLoginPhone(e.target.value)} placeholder="94361 24501"
                          className="flex-1 px-3 py-2 bg-transparent text-white text-sm outline-none placeholder:text-white/30" />
                      </div>
                    </div>
                    {agentLoginOtpSent && (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between">
                          <span>Agent OTP sent: <strong>813592</strong></span>
                        </div>
                        <div className="flex justify-center gap-2">
                          {agentLoginOtp.map((digit, idx) => (
                            <input key={idx} type="text" maxLength={1} value={digit}
                              onChange={(e) => { const newArr = [...agentLoginOtp]; newArr[idx] = e.target.value.slice(-1); setAgentLoginOtp(newArr); }}
                              className="w-9 h-11 text-center text-base font-bold rounded-xl bg-[#071d1b] border border-white/20 text-white focus:border-emerald-400 outline-none" />
                          ))}
                        </div>
                      </div>
                    )}
                    <button type="submit" disabled={isVerifying}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:opacity-95 transition flex items-center justify-center gap-2">
                      {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Briefcase className="w-4 h-4" /><span>{agentLoginOtpSent ? 'Verify & Access Agent Dashboard' : 'Send Agent Login OTP'}</span></>}
                    </button>
                    <div className="text-center pt-2">
                      <button type="button" onClick={() => setAgentTab('plans')} className="text-xs text-emerald-300 hover:underline">New Agent? View Membership Plans & Join</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Bottom Guest Link */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-emerald-100/60">
              <span>Just want to take a look around?</span>
              <button type="button" onClick={onExploreGuest} className="font-bold text-[#f27e68] hover:text-white flex items-center gap-1 transition">
                <span>Enter as Guest</span><ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Ticker */}
      <footer className="relative z-20 w-full px-6 py-3 border-t border-white/10 bg-black/20 backdrop-blur-md flex flex-wrap items-center justify-between text-xs text-emerald-200/70 gap-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Radar: <strong>200+ Verified Pros Active</strong> across Guwahati, Shillong, Agartala, Imphal, Aizawl, Kohima & Itanagar</span>
        </div>
        <div className="flex items-center gap-4 text-emerald-300/80">
          <span>🛡️ 100% Identity Verification</span>
          <span>⚡ Direct Phone & WhatsApp Connect</span>
          <span>© 2026 Pathly Services</span>
        </div>
      </footer>
    </div>
  );
};
