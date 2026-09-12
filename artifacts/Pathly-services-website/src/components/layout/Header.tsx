// ============================================================
// Header: Global Header Bar for Pathly with Interactive Command Search
// ============================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bell,
  Search,
  Sun,
  Moon,
  Globe,
  Wifi,
  WifiOff,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Compass,
  MapPin,
  Truck,
  Navigation,
  Route,
  Building2,
  X,
  CornerDownLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowRight,
  User,
  Menu,
  ChevronDown,
  Check,
  Shield
} from 'lucide-react';
import { PathlyLogoMark } from '../brand/PathlyLogo';
import { useTranslation } from '../../i18n/LanguageContext';
import { useRole, ROLES } from '../../lib/roleAccess';
import { useLocation } from 'wouter';
import { 
  NER_DISTRICTS, 
  VEHICLES, 
  INITIAL_ALERTS, 
  NER_LOCALITIES,
  GIS_INFRASTRUCTURE,
  getCargoIcon,
  getRoadStatusColor,
  type NERDistrict,
  type RoadSegment,
  type Vehicle,
  type LogisticsAlert,
  type NERLocality,
  type GISInfrastructure
} from '../../data/nerData';
import { getRoadSegments, useScenario } from '../../lib/scenarioEngine';

interface HeaderProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  alertCount: number;
  onOpenQuickAlerts?: () => void;
  onToggleMobileSidebar?: () => void;
}

import NotificationsDrawer from './NotificationsDrawer';
import OfficerProfileDrawer from './OfficerProfileDrawer';
import OfficerAuthModal, { type OfficerProfile } from '../auth/OfficerAuthModal';
import { requireAuthAction } from '../../lib/authGate';
import { lockScroll, unlockScroll } from '../../lib/scrollLock';

export default function Header({
  currentLanguage,
  onLanguageChange,
  isDark,
  onToggleTheme,
  isOnline,
  onToggleOnline,
  alertCount,
  onOpenQuickAlerts,
  onToggleMobileSidebar
}: HeaderProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [timeStr, setTimeStr] = useState('');

  // Subscribe to the scenario engine so header search reflects DRILL FEED segment states.
  useScenario();

  // Modals & Drawers State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  // Lock background scroll when offline modal is active
  useEffect(() => {
    if (showOfflineToast && !isOnline) {
      lockScroll();
      return () => {
        unlockScroll();
      };
    }
    return undefined;
  }, [showOfflineToast, isOnline]);

  // Dismiss offline toast when toggling back to online
  useEffect(() => {
    if (isOnline) setShowOfflineToast(false);
  }, [isOnline]);

  const [officer, setOfficer] = useState<OfficerProfile | null>(() => {
    try {
      localStorage.removeItem('pathly_officer_session');
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const isReload = navEntry?.type === 'reload' || (typeof performance !== 'undefined' && (performance as any).navigation?.type === 1);
      if (isReload) {
        sessionStorage.removeItem('pathly_officer_session');
        return null;
      }
      const saved = sessionStorage.getItem('pathly_officer_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = sessionStorage.getItem('pathly_officer_session');
        setOfficer(saved ? JSON.parse(saved) : null);
      } catch {
        setOfficer(null);
      }
    };
    window.addEventListener('pathly_officer_session_changed', handleSync);
    return () => window.removeEventListener('pathly_officer_session_changed', handleSync);
  }, []);

  const isLoggedIn = !!officer;

  // First-visit "Try High Contrast Mode" tooltip (dismissible, appears once)
  const [showContrastTip, setShowContrastTip] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('pathly_contrast_tip_seen');
    } catch {
      return true;
    }
  });

  const dismissContrastTip = () => {
    try {
      localStorage.setItem('pathly_contrast_tip_seen', '1');
    } catch {}
    setShowContrastTip(false);
  };

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open + focus the global search when the nav-bar search icon is clicked
  useEffect(() => {
    const handleFocusSearch = () => {
      setIsOpen(true);
      searchInputRef.current?.focus();
    };
    window.addEventListener('pathly_focus_search', handleFocusSearch);
    return () => window.removeEventListener('pathly_focus_search', handleFocusSearch);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current && 
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Clear all session/identity data (previous user's profile, demo role,
    // cached session material) before the hard reload below.
    try {
      localStorage.removeItem('pathly_officer_session');
      localStorage.removeItem('pathly_role');
      sessionStorage.removeItem('pathly_officer_session');
      sessionStorage.removeItem('pathly_role');
    } catch {}
    try {
      sessionStorage.clear();
    } catch {}
    setOfficer(null);
    setIsProfileOpen(false);
    try {
      setRole('control_room');
    } catch {}

    // Full page reload → guarantees NO stale React/app state survives after
    // sign-out (the earlier bug where a new session showed the previous
    // admin's name). Lands on the Home dashboard in clean guest/view-only
    // mode — the Sign In prompt is only ever shown on an explicit action,
    // never as an automatic redirect after sign-out.
    window.location.assign('/');
  };

  const handleLoginSuccess = (newOfficer: OfficerProfile) => {
    setOfficer(newOfficer);
    setIsAuthModalOpen(false);
  };

  // Item 8 — demo role switcher (Control Room / Field Officer / Driver)
  const { role, setRole, roleLabel } = useRole();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  // Each role lands on its matching screen when selected.
  const ROLE_HOME: Record<string, string> = {
    control_room: '/',
    field_officer: '/field-reports',
    driver: '/driver-mode',
    admin: '/',
  };

  // Compute Search Results across all platform domains
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return {
        localities: NER_LOCALITIES.slice(0, 3),
        districts: NER_DISTRICTS.slice(0, 3),
        highways: getRoadSegments().slice(0, 2),
        vehicles: VEHICLES.slice(0, 2),
        alerts: INITIAL_ALERTS.slice(0, 2),
        infrastructure: GIS_INFRASTRUCTURE.slice(0, 2),
        pages: [
          { title: 'Route Planner', path: '/routes', desc: 'Find optimal corridors & bypass landslides' },
          { title: 'Fleet GPS Tracking', path: '/tracking', desc: 'Live telematics of critical supply trucks' },
          { title: 'Accessibility GIS Map', path: '/accessibility', desc: 'Topological surveillance & district risk' },
          { title: 'Disruption Alert Center', path: '/alerts', desc: 'Real-time hazard warnings & advisories' },
        ],
        totalCount: 15
      };
    }

    const matchedLocalities = NER_LOCALITIES.filter(loc =>
      loc.name.toLowerCase().includes(q) ||
      loc.city.toLowerCase().includes(q) ||
      loc.district.toLowerCase().includes(q) ||
      loc.pincode.includes(q) ||
      loc.description.toLowerCase().includes(q)
    ).slice(0, 4);

    const matchedInfrastructure = GIS_INFRASTRUCTURE.filter(gis =>
      gis.name.toLowerCase().includes(q) ||
      gis.district.toLowerCase().includes(q) ||
      gis.state.toLowerCase().includes(q) ||
      gis.details.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedDistricts = NER_DISTRICTS.filter(d => 
      d.name.toLowerCase().includes(q) ||
      d.majorTown.toLowerCase().includes(q) ||
      d.state.toLowerCase().includes(q) ||
      d.nhConnected.some(nh => nh.toLowerCase().includes(q))
    ).slice(0, 3);

    const matchedHighways = getRoadSegments().filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.from.toLowerCase().includes(q) ||
      r.to.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    ).slice(0, 2);

    const matchedVehicles = VEHICLES.filter(v =>
      (v.orderToken && v.orderToken.toLowerCase().includes(q)) ||
      v.registrationNo.toLowerCase().includes(q) ||
      v.driverName.toLowerCase().includes(q) ||
      v.cargoType.toLowerCase().includes(q) ||
      v.origin.toLowerCase().includes(q) ||
      v.destination.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedAlerts = INITIAL_ALERTS.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      a.district.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    ).slice(0, 2);

    const pageMatches = [
      { title: 'Command Center Dashboard', path: '/', desc: 'Overview metrics & radar' },
      { title: 'GIS Accessibility Map', path: '/accessibility', desc: 'Interactive road network & district vulnerability' },
      { title: 'Route Planner', path: '/routes', desc: 'Predictive multi-corridor route optimizer' },
      { title: 'GPS Vehicle Tracking', path: '/tracking', desc: 'Live telemetry of essential supply fleet' },
      { title: 'Alert Center', path: '/alerts', desc: 'Broadcast emergency disaster & flood alerts' },
      { title: 'Field Reports', path: '/field-reports', desc: 'Crowdsourced ground hazard reports' },
      { title: 'Analytics & Supply Chain', path: '/analytics', desc: 'District resilience & freight efficiency' },
      { title: 'System Settings', path: '/settings', desc: 'Language, themes & offline sync options' }
    ].filter(p => p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)).slice(0, 2);

    const total = 
      matchedLocalities.length +
      matchedInfrastructure.length +
      matchedDistricts.length + 
      matchedHighways.length + 
      matchedVehicles.length + 
      matchedAlerts.length + 
      pageMatches.length;

    return {
      localities: matchedLocalities,
      infrastructure: matchedInfrastructure,
      districts: matchedDistricts,
      highways: matchedHighways,
      vehicles: matchedVehicles,
      alerts: matchedAlerts,
      pages: pageMatches,
      totalCount: total
    };
  }, [searchQuery]);

  // Flattened items list for keyboard navigation
  const flatItems = useMemo(() => {
    const items: { type: string; action: () => void; id: string }[] = [];

    searchResults.localities.forEach(loc => {
      items.push({
        type: 'locality',
        id: `loc-${loc.id}`,
        action: () => {
          window.dispatchEvent(new CustomEvent('pathly_navigate_location', {
            detail: { lat: loc.lat, lng: loc.lng, zoom: 17, name: loc.name, district: loc.district }
          }));
          setLocation(`/accessibility?lat=${loc.lat}&lng=${loc.lng}&zoom=17&name=${encodeURIComponent(loc.name)}&district=${encodeURIComponent(loc.district)}`);
          setIsOpen(false);
          setSearchQuery('');
        }
      });
    });

    searchResults.infrastructure.forEach(gis => {
      items.push({
        type: 'infrastructure',
        id: `gis-${gis.id}`,
        action: () => {
          window.dispatchEvent(new CustomEvent('pathly_navigate_location', {
            detail: { lat: gis.lat, lng: gis.lng, zoom: 17, name: gis.name, district: gis.district }
          }));
          setLocation(`/accessibility?lat=${gis.lat}&lng=${gis.lng}&zoom=17&name=${encodeURIComponent(gis.name)}&district=${encodeURIComponent(gis.district)}`);
          setIsOpen(false);
          setSearchQuery('');
        }
      });
    });

    searchResults.districts.forEach(d => {
      items.push({
        type: 'district',
        id: `district-${d.id}`,
        action: () => {
          window.dispatchEvent(new CustomEvent('pathly_navigate_location', {
            detail: { lat: d.lat, lng: d.lng, zoom: 16, name: d.name, districtId: d.id }
          }));
          setLocation(`/accessibility?district=${d.id}&search=${encodeURIComponent(d.majorTown || d.name)}&lat=${d.lat}&lng=${d.lng}&zoom=16`);
          setIsOpen(false);
          setSearchQuery('');
        }
      });
    });

    searchResults.highways.forEach(h => {
      items.push({
        type: 'highway',
        id: `highway-${h.id}`,
        action: () => {
          setLocation(`/routes?from=${encodeURIComponent(h.from)}&to=${encodeURIComponent(h.to)}`);
          setIsOpen(false);
          setSearchQuery('');
        }
      });
    });

    searchResults.vehicles.forEach(v => {
      items.push({
        type: 'vehicle',
        id: `vehicle-${v.id}`,
        action: () => {
          setLocation(`/tracking?vehicle=${v.id}&search=${encodeURIComponent(v.orderToken || v.registrationNo)}`);
          setIsOpen(false);
          setSearchQuery('');
        }
      });
    });

    searchResults.alerts.forEach(a => {
      items.push({
        type: 'alert',
        id: `alert-${a.id}`,
        action: () => {
          setLocation(`/alerts?alert=${a.id}`);
          setIsOpen(false);
          setSearchQuery('');
        }
      });
    });

    searchResults.pages.forEach(p => {
      items.push({
        type: 'page',
        id: `page-${p.path}`,
        action: () => {
          setLocation(p.path);
          setIsOpen(false);
          setSearchQuery('');
        }
      });
    });

    return items;
  }, [searchResults, setLocation]);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        flatItems[selectedIndex].action();
      } else if (searchQuery.trim()) {
        // Fallback: search on accessibility map with query
        setLocation(`/accessibility?search=${encodeURIComponent(searchQuery.trim())}`);
        setIsOpen(false);
      }
    }
  };

  const handleSelectItem = (action: () => void) => {
    if (!requireAuthAction('Global Search')) return;
    action();
  };

  return (
    <header className={`h-16 lg:h-[72px] border-b px-2.5 sm:px-4 lg:px-6 flex items-center justify-between sticky top-0 z-50 gap-2 sm:gap-4 ${isDark ? 'bg-[#111316] border-[#2a2e35]' : 'bg-white border-slate-300'}`}>
      {/* Left: Mobile hamburger + Pathly P+pin logo mark + Command Name */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 -ml-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          aria-label="Open Navigation Menu"
          title="Open Menu"
        >
          <Menu size={22} />
        </button>
        <PathlyLogoMark size={36} />
        <div className="flex flex-col justify-center leading-tight select-none">
          <span className="text-[9px] uppercase tracking-wide text-slate-500 font-medium truncate max-w-[85px] sm:max-w-none">
            {t('pathlyNetwork')}
          </span>
          <span className="text-[11px] lg:text-[13px] text-slate-700 dark:text-slate-200 font-bold hidden sm:inline">
            {t('routeIntelligence')}
          </span>
        </div>
      </div>

      {/* Center: Global Interactive Search Bar */}
      <div ref={searchContainerRef} className="relative flex-1 min-w-0 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
        {/* Mobile: search icon button that opens the search */}
        <button
          type="button"
          onClick={() => { setIsOpen(true); searchInputRef.current?.focus(); }}
          className="sm:hidden w-9 h-9 flex items-center justify-center border rounded text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1a1d21] border-slate-300 dark:border-[#3a3f47] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Open Search"
        >
          <Search size={16} />
        </button>
        {/* Desktop / tablet: full search input */}
        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
              setSelectedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-9 py-2 text-xs lg:text-sm bg-white dark:bg-[#1a1d21] border border-slate-300 dark:border-[#3a3f47] rounded focus:outline-none focus:border-[#0B3D6D] dark:focus:border-[#FFC107] focus:ring-2 focus:ring-[#0B3D6D]/20 dark:focus:ring-[#FFC107]/20 text-slate-900 dark:text-white placeholder:text-[#6B7280] dark:placeholder:text-slate-400 font-medium transition-colors"
          />

          {/* Quick Clear (when a query is present) */}
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md transition-colors cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown Popup */}
        {isOpen && (
          <div 
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[calc(100vw-2rem)] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl rounded-2xl shadow-2xl overflow-hidden z-[100] animate-fade-in divide-y divide-slate-100 dark:divide-slate-800 max-h-[480px] overflow-y-auto border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            style={{ opacity: 1, isolation: 'isolate' }}
          >
            {/* Header Status in Dropdown */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono font-semibold">
              <span className="min-w-0 truncate">{searchQuery ? `Search results for "${searchQuery}"` : 'Quick Navigation & Logistics Directory'}</span>
              <span className="shrink-0 whitespace-nowrap text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">{searchResults.totalCount} matches</span>
            </div>

            {/* A0. In-Depth Localities & Neighborhoods */}
            {searchResults.localities.length > 0 && (
              <div className="p-2 bg-blue-500/5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1.5">
                  <MapPin size={11} className="shrink-0" />
                  <span className="min-w-0">In-Depth Localities & Neighborhoods ({searchResults.localities.length})</span>
                </div>
                <div className="space-y-1 mt-1">
                  {searchResults.localities.map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => handleSelectItem(() => {
                        window.dispatchEvent(new CustomEvent('pathly_navigate_location', {
                          detail: { lat: loc.lat, lng: loc.lng, zoom: 17, name: loc.name, district: loc.district }
                        }));
                        setLocation(`/accessibility?lat=${loc.lat}&lng=${loc.lng}&zoom=17&name=${encodeURIComponent(loc.name)}&district=${encodeURIComponent(loc.district)}`);
                        setIsOpen(false);
                        setSearchQuery('');
                      })}
                      className="px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                          📍
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {loc.name} <span className="text-[11px] font-normal text-slate-500">({loc.city}, {loc.state})</span>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {loc.description} • PIN {loc.pincode} • {loc.elevation}m ASL
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase">
                          {loc.category.replace('_', ' ')}
                        </span>
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* A1. Strategic GIS Infrastructure (Bridges, Passes, Helipads) */}
            {searchResults.infrastructure.length > 0 && (
              <div className="p-2 bg-emerald-500/5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
                  <Layers size={11} className="shrink-0" />
                  <span className="min-w-0">Strategic GIS Infrastructure</span>
                </div>
                <div className="space-y-1 mt-1">
                  {searchResults.infrastructure.map((gis) => (
                    <div
                      key={gis.id}
                      onClick={() => handleSelectItem(() => {
                        window.dispatchEvent(new CustomEvent('pathly_navigate_location', {
                          detail: { lat: gis.lat, lng: gis.lng, zoom: 17, name: gis.name, district: gis.district }
                        }));
                        setLocation(`/accessibility?lat=${gis.lat}&lng=${gis.lng}&zoom=17&name=${encodeURIComponent(gis.name)}&district=${encodeURIComponent(gis.district)}`);
                        setIsOpen(false);
                        setSearchQuery('');
                      })}
                      className="px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {gis.type === 'strategic_bridge' ? '🌉' : gis.type === 'mountain_pass' ? '⛰️' : gis.type === 'emergency_helipad' ? '🚁' : '⛽'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {gis.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {gis.district}, {gis.state} • Elev: {gis.elevation}m • {gis.details}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">
                          {gis.status}
                        </span>
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* A. Districts Section */}
            {searchResults.districts.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1.5">
                  <MapPin size={11} className="shrink-0" />
                  <span className="min-w-0">Districts & Logistics Hubs</span>
                </div>
                <div className="space-y-1 mt-1">
                  {searchResults.districts.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => handleSelectItem(() => {
                        window.dispatchEvent(new CustomEvent('pathly_navigate_location', {
                          detail: { lat: d.lat, lng: d.lng, zoom: 16, name: d.name, districtId: d.id }
                        }));
                        setLocation(`/accessibility?district=${d.id}&search=${encodeURIComponent(d.majorTown || d.name)}&lat=${d.lat}&lng=${d.lng}&zoom=16`);
                        setIsOpen(false);
                        setSearchQuery('');
                      })}
                      className="px-3 py-2 rounded-xl hover:bg-[hsl(var(--muted))] cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {d.state.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[hsl(var(--foreground))] group-hover:text-blue-400 transition-colors">
                            {d.name} <span className="text-[11px] font-normal text-[hsl(var(--muted-foreground))]">({d.majorTown})</span>
                          </p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {d.state} • NH: {d.nhConnected.join(', ') || 'State Road'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          d.connectivityScore >= 70 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}>
                          {d.connectivityScore}% Score
                        </span>
                        <ChevronRight size={14} className="text-[hsl(var(--muted-foreground))] group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B. Highways Section */}
            {searchResults.highways.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono flex items-center gap-1.5">
                  <Route size={11} className="shrink-0" />
                  <span className="min-w-0">Highways & Road Corridors</span>
                </div>
                <div className="space-y-1 mt-1">
                  {searchResults.highways.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => handleSelectItem(() => {
                        setLocation('/routes');
                        setIsOpen(false);
                        setSearchQuery('');
                      })}
                      className="px-3 py-2 rounded-xl hover:bg-[hsl(var(--muted))] cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {h.type}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[hsl(var(--foreground))] group-hover:text-purple-400 transition-colors">
                            {h.name} <span className="text-[11px] font-normal text-[hsl(var(--muted-foreground))]">({h.from} ➔ {h.to})</span>
                          </p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {h.distance} km • Risk: {h.riskScore}/100 • Bridges: {h.bridgeCount}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span 
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${getRoadStatusColor(h.status)}20`,
                            color: getRoadStatusColor(h.status)
                          }}
                        >
                          {h.status.replace('_', ' ')}
                        </span>
                        <ChevronRight size={14} className="text-[hsl(var(--muted-foreground))] group-hover:text-purple-400 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* C. Vehicles Section */}
            {searchResults.vehicles.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
                  <Truck size={11} className="shrink-0" />
                  <span className="min-w-0">GPS Fleet & Cargo Telemetry</span>
                </div>
                <div className="space-y-1 mt-1">
                  {searchResults.vehicles.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handleSelectItem(() => {
                        setLocation(`/tracking?vehicle=${v.id}&search=${encodeURIComponent(v.orderToken || v.registrationNo)}`);
                        setIsOpen(false);
                        setSearchQuery('');
                      })}
                      className="px-3 py-2 rounded-xl hover:bg-[hsl(var(--muted))] cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{getCargoIcon(v.cargoType)}</span>
                        <div>
                          <p className="text-xs font-mono font-bold text-[hsl(var(--foreground))] group-hover:text-emerald-400 transition-colors">
                            {v.registrationNo} <span className="text-[11px] font-sans font-normal text-[hsl(var(--muted-foreground))]">• {v.driverName}</span>
                          </p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {v.origin} ➔ {v.destination} • ETA: {v.eta}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {v.speed} km/h
                        </span>
                        <ChevronRight size={14} className="text-[hsl(var(--muted-foreground))] group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* D. Incidents & Alerts Section */}
            {searchResults.alerts.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 font-mono flex items-center gap-1.5">
                  <AlertTriangle size={11} className="shrink-0" />
                  <span className="min-w-0">Disruption Alerts & Hazards</span>
                </div>
                <div className="space-y-1 mt-1">
                  {searchResults.alerts.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => handleSelectItem(() => {
                        setLocation('/alerts');
                        setIsOpen(false);
                        setSearchQuery('');
                      })}
                      className="px-3 py-2 rounded-xl hover:bg-[hsl(var(--muted))] cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xs">
                          ⚠️
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[hsl(var(--foreground))] group-hover:text-rose-400 transition-colors truncate max-w-[280px]">
                            {a.title}
                          </p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {a.location}, {a.district} [{a.state}]
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* E. Platform Navigation Pages */}
            {searchResults.pages.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-mono flex items-center gap-1.5">
                  <Compass size={11} className="shrink-0" />
                  <span className="min-w-0">Platform Modules</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                  {searchResults.pages.map((p) => (
                    <div
                      key={p.path}
                      onClick={() => handleSelectItem(() => {
                        setLocation(p.path);
                        setIsOpen(false);
                        setSearchQuery('');
                      })}
                      className="px-3 py-2 rounded-xl hover:bg-[hsl(var(--muted))] cursor-pointer transition-colors group"
                    >
                      <p className="text-xs font-bold text-[hsl(var(--foreground))] group-hover:text-blue-400 transition-colors flex items-center justify-between">
                        <span>{p.title}</span>
                        <ArrowRight size={12} className="text-[hsl(var(--muted-foreground))] group-hover:text-blue-400" />
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                        {p.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Google Maps Exact Coordinate / Query Prompt */}
            <div className="p-2.5 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
              <div
                onClick={() => handleSelectItem(() => {
                  setLocation(searchQuery ? `/accessibility?search=${encodeURIComponent(searchQuery.trim())}` : '/accessibility');
                  setIsOpen(false);
                  setSearchQuery('');
                })}
                className="flex items-center justify-between px-2 py-1.5 text-xs text-blue-400 cursor-pointer rounded-lg hover:text-blue-300"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🗺️</span>
                  <span>
                    {searchQuery ? `Inspect "${searchQuery}" on Google Maps & GIS Radar` : 'Open Full Google Maps & Topological Radar'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold bg-blue-500/20 px-2 py-0.5 rounded">
                  <span>Enter</span>
                  <CornerDownLeft size={10} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right-aligned Pathly Network badge placeholders */}
      <div className="hidden 2xl:flex items-center gap-2 lg:gap-3 shrink-0">
        <div className={`flex flex-col items-center text-[8px] leading-tight select-none ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          <span className={`font-bold text-[10px] ${isDark ? 'text-[#FFC107]' : 'text-[#0B3D6D]'}`}>Pathly</span>
          <span className="font-semibold">Network</span>
        </div>
        <div className={`w-px h-7 ${isDark ? 'bg-[#3a3f47]' : 'bg-slate-300'}`} />
        <div className={`flex flex-col items-center text-[8px] leading-tight select-none ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          <span className={`font-bold text-[11px] ${isDark ? 'text-[#FFC107]' : 'text-[#0B3D6D]'}`}>Regional&nbsp;Command</span>
          <span className="font-semibold">Route Intelligence</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-0.5 sm:gap-2 lg:gap-3 shrink-0">
        {/* Theme Toggle — crescent moon */}
        <div className="relative">
          {showContrastTip && (
            <div role="tooltip" className={`absolute bottom-full right-0 mb-2 z-[100] border shadow-md animate-fade-in ${isDark ? 'bg-[#1a1d21] border-[#FFC107]/50' : 'bg-white border-[#0B3D6D]/40'}`}>
              <div className={`flex items-center gap-2 pl-3 pr-1.5 py-2 text-[11px] font-semibold whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <span>Try {isDark ? 'Light' : 'Dark'} Mode</span>
                <button
                  type="button"
                  onClick={dismissContrastTip}
                  className={`p-0.5 rounded hover:bg-black/10 transition-colors cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                  aria-label="Dismiss hint"
                >
                  <X size={12} />
                </button>
              </div>
              {/* Arrow pointing to the theme toggle button */}
              <span
                className={`absolute top-full right-3 -mt-px w-2.5 h-2.5 rotate-45 border-r border-b ${isDark ? 'bg-[#1a1d21] border-[#FFC107]/50' : 'bg-white border-[#0B3D6D]/40'}`}
              />
            </div>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
              isDark
                ? "bg-[#1a1d21] border-[#FFC107] text-[#FFC107] hover:bg-[#23272d]"
                : "bg-white border-[#0B3D6D] text-[#0B3D6D] hover:bg-slate-100"
            }`}
            title={isDark ? t('switchToLight') : t('switchToDark')}
            aria-label={t('toggleTheme')}
          >
            <Moon size={16} className="sm:w-[18px] sm:h-[18px]" fill={isDark ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
        </div>

        {/* Live IST Clock */}
        <div className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] ${isDark ? 'bg-[#111316] border-[#3a3f47] text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-700'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
          <span>{timeStr}</span>
        </div>

        {/* Item 8 — Role switcher (Control Room / Field Officer / Driver) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setRoleMenuOpen((v) => !v)}
            title="Switch role experience"
            aria-haspopup="menu"
            aria-expanded={roleMenuOpen}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#111316] border-[#3a3f47] text-[#FFC107] hover:bg-[#1a1d21]'
                : 'bg-slate-50 border-slate-300 text-[#0B3D6D] hover:bg-blue-50'
            }`}
          >
            <Shield size={14} />
            <span className="hidden sm:inline">{roleLabel}</span>
            <ChevronDown size={13} className={roleMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>

          {roleMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRoleMenuOpen(false)} />
              <div
                role="menu"
                className={`absolute right-0 top-full mt-1.5 z-50 w-64 border shadow-lg ${isDark ? 'bg-[#16181c] border-[#2a2e35]' : 'bg-white border-slate-200'}`}
              >
                <div className={`px-3 py-2 text-[9px] font-bold uppercase tracking-wider border-b ${isDark ? 'text-slate-400 border-[#2a2e35]' : 'text-slate-500 border-slate-200'}`}>
                  Switch role experience
                </div>
                {ROLES.filter((r) => r.key !== 'admin').map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      if (!requireAuthAction('Switch role experience')) return;
                      setRole(r.key);
                      setRoleMenuOpen(false);
                      setLocation(ROLE_HOME[r.key] ?? '/');
                      window.dispatchEvent(new Event('pathly_role_changed'));
                    }}
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                      role === r.key
                        ? isDark ? 'bg-[#23272d] text-[#FFC107]' : 'bg-blue-50 text-[#0B3D6D]'
                        : isDark ? 'text-slate-200 hover:bg-[#1a1d21]' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5">
                      {role === r.key && <Check size={14} className={isDark ? 'text-[#FFC107]' : 'text-[#0B3D6D]'} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{r.label}</p>
                      <p className={`text-[10px] leading-tight mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{r.scope}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Network Status Toggle / Indicator */}
        <button
          type="button"
          onClick={() => {
            if (isOnline) {
              setShowOfflineToast(true);
              onToggleOnline();
            } else {
              setShowOfflineToast(false);
              onToggleOnline();
              window.location.reload();
            }
          }}
          title={isOnline ? "Network Connected (Click to switch to offline mode)" : "Offline Mode (Click to reconnect online and refresh)"}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
            isOnline
              ? isDark ? "bg-green-900/40 text-green-300 border-green-600" : "bg-green-50 text-green-800 border-green-600 hover:bg-green-100"
              : isDark ? "bg-red-900/30 text-red-300 border-red-600" : "bg-red-50 text-red-700 border-red-400 hover:bg-red-100"
          }`}
        >
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span className="inline">{isOnline ? t('online') : t('offline')}</span>
        </button>

        {/* Language Selector (desktop only, mobile uses the top utility bar) */}
        <div className={`hidden md:flex items-center gap-1 border rounded px-2.5 py-1.5 ${isDark ? 'bg-[#111316] border-[#3a3f47]' : 'bg-white border-slate-300'}`}>
          <Globe size={13} className={isDark ? 'text-[#FFC107]' : 'text-[#0B3D6D]'} />
          <select
            value={currentLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className={`bg-transparent text-xs font-medium focus:outline-none cursor-pointer ${isDark ? 'text-white' : 'text-slate-800'}`}
          >
            <option value="en" className="bg-white">English</option>
            <option value="hi" className="bg-white">हिंदी (Hindi)</option>
            <option value="as" className="bg-white">অসমীয়া (Assamese)</option>
            <option value="bn" className="bg-white">বাংলা (Bengali)</option>
            <option value="mni" className="bg-white">মৈতৈলোন্ (Manipuri)</option>
          </select>
        </div>

        {/* Offline Modal + blurred backdrop — highest layer, dominates all UI including sidebar */}
        {showOfflineToast && !isOnline && (
          <>
            <div
              className="fixed inset-0 z-[9998] bg-black/65 backdrop-blur-md touch-none overscroll-contain"
              onClick={() => setShowOfflineToast(false)}
              onWheel={(e) => e.preventDefault()}
              onTouchMove={(e) => e.preventDefault()}
              aria-hidden="true"
            />
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 touch-none overscroll-contain"
              role="alertdialog"
              aria-modal="true"
              aria-label={t('offline')}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowOfflineToast(false);
              }}
              onWheel={(e) => {
                if (e.target === e.currentTarget) e.preventDefault();
              }}
              onTouchMove={(e) => {
                if (e.target === e.currentTarget) e.preventDefault();
              }}
            >
              <div
                className="w-full max-w-md bg-white dark:bg-[#16181c] border-2 border-red-400 dark:border-red-500 rounded-2xl shadow-2xl overflow-hidden animate-fade-in touch-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <WifiOff size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">Connection Lost</h3>
                      <p className="text-[11px] text-red-100 font-mono">Live Data Stream Interrupted</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOfflineToast(false)}
                    className="p-1.5 text-white/90 hover:text-white rounded-lg hover:bg-white/15 transition-colors"
                    aria-label={t('dismiss')}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="px-5 py-5 flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-center">
                    <WifiOff size={26} className="text-red-600 dark:text-red-400" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {t('offlineMessage')}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Your device has lost connectivity. Data will resume once you are back online.
                  </span>
                </div>
                <div className="px-5 pb-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="flex-1 py-2.5 text-sm font-bold text-white bg-[#0B3D6D] hover:bg-[#0A2F52] rounded-xl transition-colors whitespace-nowrap shadow-sm"
                  >
                    {t('refresh')} &amp; Reconnect
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOfflineToast(false)}
                    className="py-2.5 px-4 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </>
        )}


        {/* Notification Bell (Interactive Alerts Drawer) */}
        <button
          onClick={() => {
            setIsNotificationsOpen(true);
            onOpenQuickAlerts?.();
          }}
          className={`relative p-2.5 rounded border transition-colors cursor-pointer ${isDark ? 'bg-[#111316] hover:bg-[#1a1d21] border-[#3a3f47] text-[#FFC107]' : 'bg-slate-50 hover:bg-blue-50 text-[#0B3D6D] border-slate-300'}`}
          title="Active Logistics Alerts & Incidents"
        >
          <Bell size={18} className={alertCount > 0 ? "text-red-700" : ""} />
          {alertCount > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-700 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {alertCount}
            </span>
          )}
        </button>

        {/* Login/Sign Up button or Profile Avatar */}
        {isLoggedIn ? (
          <button
            onClick={() => setIsProfileOpen(true)}
            className={`flex items-center gap-2 pl-2 border-l hover:opacity-90 transition-opacity cursor-pointer group ${isDark ? 'border-[#3a3f47]' : 'border-slate-200'}`}
            title="Admin Dashboard"
          >
            <div className="w-8 h-8 rounded bg-[#0B3D6D] flex items-center justify-center text-white font-bold text-xs">
              {officer.name.charAt(0)}
            </div>
            <div className="text-left leading-tight hidden lg:block">
              <p className={`text-xs font-bold group-hover:underline ${isDark ? 'text-white' : 'text-[#0B3D6D]'}`}>
                {officer.name}
              </p>
              <p className={`text-[10px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {officer.role || 'Admin'}
              </p>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setLocation('/login')}
            className={`flex items-center gap-2 pl-2 border-l hover:opacity-90 transition-opacity cursor-pointer group ${isDark ? 'border-[#3a3f47]' : 'border-slate-200'}`}
            title="Login or Sign Up"
          >
            <div className="w-8 h-8 rounded bg-[#0B3D6D] flex items-center justify-center text-white">
              <User size={16} />
            </div>
            <div className="text-left leading-tight hidden lg:block">
              <p className={`text-xs font-bold group-hover:underline ${isDark ? 'text-white' : 'text-[#0B3D6D]'}`}>
                Login / Sign Up
              </p>
              <p className={`text-[10px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Access Dashboard
              </p>
            </div>
          </button>
        )}
      </div>

      {/* 1. Notifications Center Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* 2. Officer Profile & Duty Center Drawer */}
      {officer && (
        <OfficerProfileDrawer
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          officer={officer}
          onLogout={handleLogout}
        />
      )}

      {/* 3. Officer Auth / Command Center Login Modal */}
      <OfficerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </header>
  );
}

