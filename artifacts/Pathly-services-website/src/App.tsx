// ============================================================
// Pathly: Regional Logistics & Route Intelligence Command
// Root Application Shell & Router
// ============================================================

import React, { useState, useEffect } from 'react';
import { Route, Switch, Link, useLocation } from 'wouter';
import Sidebar, { MobileSidebarToggle } from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { lockScroll, unlockScroll } from './lib/scrollLock';
import { PathlyLogoMark } from './components/brand/PathlyLogo';
import Dashboard from './pages/Dashboard';
import AccessibilityMap from './pages/AccessibilityMap';
import RoutePlanner from './pages/RoutePlanner';
import VehicleTracking from './pages/VehicleTracking';
import DriverMode from './pages/DriverMode';
import AlertCenter from './pages/AlertCenter';
import FieldReports from './pages/FieldReports';
import Analytics from './pages/Analytics';
import EmergencyScenarioDemo from './pages/EmergencyScenarioDemo';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AuthGatePrompt from './components/auth/AuthGatePrompt';
import { isDemoMode } from './lib/demoConfig';
import { RoleProvider, useRole } from './lib/roleAccess';
import NotFound from './pages/not-found';
import { useAlerts } from './hooks/useAlerts';
import { useOfflineSync } from './hooks/useOfflineSync';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';
import {
  AboutPage, VisionMissionPage, ContactPage, HelpPage,
  TermsPage, PrivacyPage, RTIPage, CopyrightPage,
  AccessibilityStatementPage, ScreenReaderPage, SitemapPage, DisclaimerPage
} from './pages/FooterPages';

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="w-full bg-[#0B3D6D] text-white" style={{ borderTop: '4px solid #FF9933' }}>
      <div className="px-4 lg:px-6 py-7 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-[#FF9933] font-bold text-sm mb-2">{t('pathlyNetwork')}</p>
          <p className="text-[11px] leading-relaxed text-white/80 max-w-xs">
            Pathly Regional Logistics &amp; Route Intelligence system for real-time
            accessibility monitoring, weather telemetry and fleet coordination across
            the assigned regional corridor.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[#FF9933] uppercase tracking-wider text-[11px] mb-2">{t('footerAbout')}</p>
          <ul className="space-y-1.5 text-[11px]">
            <li><a href="/about" className="text-white hover:text-[#FF9933] transition-colors">{t('aboutPortal')}</a></li>
            <li><a href="/vision-mission" className="text-white hover:text-[#FF9933] transition-colors">{t('visionMission')}</a></li>
            <li><a href="/contact" className="text-white hover:text-[#FF9933] transition-colors">{t('contactUs')}</a></li>
            <li><a href="/help" className="text-white hover:text-[#FF9933] transition-colors">{t('help')}</a></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-[#FF9933] uppercase tracking-wider text-[11px] mb-2">{t('footerPolicies')}</p>
          <ul className="space-y-1.5 text-[11px]">
            <li><a href="/terms" className="text-white hover:text-[#FF9933] transition-colors">{t('terms')}</a></li>
            <li><a href="/privacy" className="text-white hover:text-[#FF9933] transition-colors">{t('privacy')}</a></li>
            <li><a href="/rti" className="text-white hover:text-[#FF9933] transition-colors">{t('rti')}</a></li>
            <li><a href="/copyright" className="text-white hover:text-[#FF9933] transition-colors">{t('copyright')}</a></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-[#FF9933] uppercase tracking-wider text-[11px] mb-2">{t('footerAccessibility')}</p>
          <ul className="space-y-1.5 text-[11px]">
            <li><a href="/accessibility-statement" className="text-white hover:text-[#FF9933] transition-colors">{t('accessStatement')}</a></li>
            <li><a href="/screen-reader" className="text-white hover:text-[#FF9933] transition-colors">{t('screenReader')}</a></li>
            <li><a href="/sitemap" className="text-white hover:text-[#FF9933] transition-colors">{t('sitemap')}</a></li>
            <li><a href="/disclaimer" className="text-white hover:text-[#FF9933] transition-colors">{t('disclaimer')}</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/20" />

      <div className="w-full bg-[#0A3560] px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-white/70">
        <div className="flex items-center gap-2">
          <PathlyLogoMark size={16} strokeColor="#FF9933" />
          <span>{t('contentOwned')}</span>
        </div>
        <span>{t('lastUpdated')}&nbsp;&nbsp;|&nbsp;&nbsp;{t('visitors')}</span>
      </div>
    </footer>
  );
}

// Redirects away from routes the current role cannot access (Item 8).
function RoleRouteGuard() {
  const { can } = useRole();
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (!can(location === '/' ? '/' : location)) setLocation('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, can]);
  return null;
}

function MainNav({ isDark }: { isDark: boolean }) {
  const { can } = useRole();
  const [location] = useLocation();
  const allItems = [
    { href: '/', label: 'Home' },
    { href: '/accessibility', label: 'Accessibility' },
    { href: '/routes', label: 'Routes' },
    { href: '/tracking', label: 'Tracking' },
    { href: '/driver-mode', label: 'Driver Mode' },
    { href: '/alerts', label: 'Alerts' },
    { href: '/field-reports', label: 'Field Reports' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/scenario', label: 'Scenario Drill' },
  ];
  const items = allItems.filter((item) => can(item.href));
  return (
    <nav
      className={`px-2 sm:px-4 lg:px-6 h-11 sm:h-12 flex items-center justify-between overflow-x-auto scrollbar-none gap-3 ${isDark ? 'bg-[#111316]' : 'bg-white'}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-shrink-0 text-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium whitespace-nowrap rounded transition-colors ${
              active
                ? isDark
                  ? 'text-[#FFC107] font-bold bg-[#1e2228]'
                  : 'text-[#0B3D6D] font-bold bg-blue-50/80'
                : isDark
                  ? 'text-slate-300 hover:text-[#FFC107] hover:bg-[#23272d]'
                  : 'text-slate-600 hover:text-[#0B3D6D] hover:bg-slate-100'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TopUtilityBar({
  currentLanguage,
  onLanguageChange,
  isDark,
  onToggleTheme,
}: {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="w-full bg-[#0A3560] text-white text-[11px] select-none gov-util-bar">
      <div className="relative px-4 lg:px-6 h-7 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="#main-content" className="text-white/80 hover:text-white hover:underline">
            {t('skip')}
          </a>
        </div>

        {/* Centered Pathly brand accent */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center gap-1.5 text-white/90">
          <PathlyLogoMark size={16} strokeColor="#FFC107" />
          <span className="text-[12px] leading-none font-bold tracking-[0.28em] uppercase text-[#FFC107]/90">
            Pathly
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-white/60 hidden sm:inline">{t('language')}</span>
          <select
            value={currentLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-[#0A3560] text-white text-[11px] border border-white/40 px-1 py-0.5 focus:outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="as">অসমীয়া</option>
            <option value="bn">বাংলা</option>
            <option value="mni">মৈতৈলোন্</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Always open directly in Light Mode by default for anyone visiting the website.
  const [isDark, setIsDark] = useState<boolean>(false);

  // Language State
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    try {
      return localStorage.getItem('ner_language') || 'en';
    } catch {
      return 'en';
    }
  });

  // Mobile sidebar drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Desktop sidebar collapse: content area must expand to fill freed space
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const { activeAlerts } = useAlerts();
  const { isOnline, setIsOnline } = useOfflineSync();
  const [location] = useLocation();
  const { t } = useTranslation();

  // Apply light/dark class on html element so the entire app (incl. modals)
  // switches together. Persist the choice.
  useEffect(() => {
    try {
      localStorage.setItem('ner_dark_mode', isDark ? 'true' : 'false');
    } catch {}

    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    try {
      localStorage.setItem('ner_language', lang);
    } catch {}
  };

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location]);

  // Lock body scroll when mobile sidebar is open (shared with drawer overlays)
  useEffect(() => {
    if (isMobileSidebarOpen) {
      lockScroll();
      return () => {
        unlockScroll();
      };
    }
    return undefined;
  }, [isMobileSidebarOpen]);

  // ---- Fully isolated, standalone Login screen ----
  // Rendered as its own shell with NO dashboard chrome: no sidebar, no
  // horizontal nav, no breadcrumb, no search/bell/status/clock. Only the
  // accessibility utility bar + a minimal logo strip remain.
  if (location === '/login') {
    return (
      <LanguageProvider language={currentLanguage}>
      <div className={`min-h-screen flex flex-col ${isDark ? 'bg-black text-slate-100 gov-shell-dark' : 'bg-[#F5F6F8] text-slate-900 gov-shell-light'}`}>
        {/* Accessibility utility bar (kept as part of the shell) */}
        <TopUtilityBar
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
        />

        {/* Minimal top strip: only the Pathly P+pin logo mark + name */}
        <div className={`w-full border-b ${isDark ? 'border-[#2a2e35] bg-[#111316]' : 'border-slate-300 bg-white'}`}>
          <div className="px-4 lg:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PathlyLogoMark size={38} />
              <div className="flex flex-col justify-center leading-tight select-none">
                <span className={`text-[9px] uppercase tracking-wide font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('pathlyNetwork')}
                </span>
                <span className={`text-[17px] font-bold leading-tight ${isDark ? 'text-white' : 'text-[#0B3D6D]'}`}>
                  Pathly Regional Command
                </span>
                <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                  {t('routeIntelligence')}
                </span>
              </div>
            </div>
            <span className={`hidden sm:inline text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Secure Portal Access
            </span>
          </div>
        </div>

        {/* Centered empty-viewport login card */}
        <div className="flex-1 flex items-center justify-center py-8">
          <Login isDark={isDark} onToggleTheme={handleToggleTheme} />
        </div>
      </div>
      </LanguageProvider>
    );
  }

  return (
    <RoleProvider>
    <LanguageProvider language={currentLanguage}>
    <div className={`min-h-screen flex ${isDark ? 'bg-black text-slate-100 gov-shell-dark' : 'bg-[#F5F6F8] text-slate-900 gov-shell-light'}`}>
      {/* Role-aware route guard (redirects inaccessible routes to home) */}
      <RoleRouteGuard />
      {/* Guest view-only gate: raises the Sign In / Sign Up prompt on actions */}
      <AuthGatePrompt />
      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          onWheel={(e) => e.preventDefault()}
          onTouchMove={(e) => e.preventDefault()}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs touch-none overscroll-contain"
        />
      )}

      {/* Sidebar Navigation - fixed rail on desktop, off-canvas drawer on mobile */}
      <div className={`${isMobileSidebarOpen ? 'block fixed inset-y-0 left-0 z-[60] shadow-2xl' : 'hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-30'} ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'}`}>
        <Sidebar
          alertCount={activeAlerts.length}
          isDark={isDark}
          collapsed={isMobileSidebarOpen ? false : sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Main Content Area - flex-1 fills remaining width, offset right of the fixed sidebar */}
      <div className={`flex-1 flex flex-col min-w-0 ${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'}`}>
        {/* Top utility bar (full width above header) */}
        <TopUtilityBar
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
        />

        <Header
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
          isOnline={isOnline}
          onToggleOnline={() => {
            if (!isOnline) {
              setIsOnline(true);
              window.location.reload();
            } else {
              setIsOnline(false);
            }
          }}
          alertCount={activeAlerts.length}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((v) => !v)}
        />

        {/* Proper 3-band tricolor strip directly under header */}
        <div className="gov-tricolor" aria-hidden="true" />

        {/* Standalone-data banner — shows while no external API keys are configured */}
        {isDemoMode() && (
          <div className="w-full bg-[#FFF4E0] border-b border-[#E5A633] text-[#7A4E00]">
            <div className="px-4 lg:px-6 py-1.5 flex items-center justify-between gap-3">
              <p className="text-[10px] sm:text-[11px] font-semibold flex items-center gap-1.5">
                <span className="font-black uppercase tracking-wider">STANDALONE</span>
                <span className="hidden sm:inline">— all weather, maps, routing and SMS run on the built-in regional data feed. No external API keys configured.</span>
              </p>
              <a href="/settings" className="text-[10px] font-bold underline flex-shrink-0">Configure keys &rsaquo;</a>
            </div>
          </div>
        )}

        {/* Horizontal main navigation menu */}
        <div className={`w-full border-b ${isDark ? 'border-[#3a3f47] bg-[#111316]' : 'border-slate-300 bg-white'}`}>
          <MainNav isDark={isDark} />
        </div>

        {/* Breadcrumbs */}
        <div className={`w-full border-b ${isDark ? 'border-[#3a3f47] bg-[#111316]' : 'border-slate-300 bg-white'}`}>
          <div
            className={`px-4 lg:px-6 py-1.5 text-[11px] flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
          >
            <span>Home</span>
            <span className="text-slate-400">›</span>
            <span>Center</span>
            <span className="text-slate-400">›</span>
            <span className={`font-semibold ${isDark ? 'text-[#FFC107]' : 'text-[#0B3D6D]'}`}>Regional Sector</span>
          </div>
        </div>

        <main id="main-content" className="flex-1 w-full px-4 lg:px-6 py-4">
          <Switch>
            <Route path="/">
              {() => <Dashboard isSidebarOpen={!sidebarCollapsed} />}
            </Route>
            <Route path="/accessibility">
              {() => <AccessibilityMap isSidebarOpen={!sidebarCollapsed} />}
            </Route>
            <Route path="/routes" component={RoutePlanner} />
            <Route path="/tracking">
              {() => <VehicleTracking isSidebarOpen={!sidebarCollapsed} />}
            </Route>
            <Route path="/driver-mode" component={DriverMode} />
            <Route path="/alerts" component={AlertCenter} />
            <Route path="/field-reports" component={FieldReports} />
            <Route path="/scenario" component={EmergencyScenarioDemo} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/settings">
              {() => (
                <Settings
                  currentLanguage={currentLanguage}
                  onLanguageChange={handleLanguageChange}
                  isDark={isDark}
                  onToggleTheme={handleToggleTheme}
                />
              )}
            </Route>
            <Route path="/about" component={AboutPage} />
            <Route path="/vision-mission" component={VisionMissionPage} />
            <Route path="/contact" component={ContactPage} />
            <Route path="/help" component={HelpPage} />
            <Route path="/terms" component={TermsPage} />
            <Route path="/privacy" component={PrivacyPage} />
            <Route path="/rti" component={RTIPage} />
            <Route path="/copyright" component={CopyrightPage} />
            <Route path="/accessibility-statement" component={AccessibilityStatementPage} />
            <Route path="/screen-reader" component={ScreenReaderPage} />
            <Route path="/sitemap" component={SitemapPage} />
            <Route path="/disclaimer" component={DisclaimerPage} />
            <Route component={NotFound} />
          </Switch>
        </main>

        {/* Full-width official footer */}
        <Footer />
      </div>

      {/* Mobile Sidebar Toggle Button — removed; Header has its own hamburger */}
    </div>
    </LanguageProvider>
    </RoleProvider>
  );
}
