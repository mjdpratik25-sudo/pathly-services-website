// ============================================================
// Sidebar: Formal Departmental Navigation for Pathly Regional Command Portal
// ============================================================

import React from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Map,
  Route,
  Truck,
  Bell,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  Radio,
  Menu,
  X,
  Navigation
} from 'lucide-react';
import { PathlyLogoMark } from '../brand/PathlyLogo';
import { useTranslation } from '../../i18n/LanguageContext';
import { useRole, useFilteredNav } from '../../lib/roleAccess';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  section?: string;
}

interface SidebarProps {
  alertCount?: number;
  isDark?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
}

export default function Sidebar({ alertCount = 0, isDark = false, collapsed = false, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const [location] = useLocation();
  const { t } = useTranslation();

  const navItems: NavItem[] = [
    { 
      path: '/', 
      label: t('sidebarCommandCenter'), 
      icon: <LayoutDashboard size={18} />,
      section: t('sidebarCommand')
    },
    { 
      path: '/accessibility', 
      label: t('sidebarAccessibility'), 
      icon: <Map size={18} /> 
    },
    { 
      path: '/routes', 
      label: t('sidebarRoutePlanner'), 
      icon: <Route size={18} /> 
    },
    { 
      path: '/tracking', 
      label: t('sidebarVehicleTracking'), 
      icon: <Truck size={18} />,
      section: t('sidebarOperations')
    },
    {
      path: '/driver-mode',
      label: t('sidebarDriverMode'),
      icon: <Navigation size={18} />,
    },
    { 
      path: '/alerts', 
      label: t('sidebarAlertCenter'), 
      icon: <Bell size={18} />, 
      badge: alertCount 
    },
    { 
      path: '/field-reports', 
      label: t('sidebarFieldReports'), 
      icon: <FileText size={18} />,
      section: t('sidebarIntelligence')
    },
    { 
      path: '/analytics', 
      label: t('sidebarAnalytics'), 
      icon: <BarChart3 size={18} /> 
    },
    { 
      path: '/scenario', 
      label: t('sidebarScenarioDemo'), 
      icon: <Radio size={18} />,
      section: t('sidebarIntelligence')
    },
  ];

  const visibleNav = useFilteredNav(navItems);

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <aside
      className={`sticky top-0 h-screen flex flex-col overflow-hidden transition-all duration-300 ease-in-out select-none
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
        ${isDark ? 'bg-[#111316] text-[#FFC107] border-r border-[#2a2e35]' : 'bg-slate-50 text-[#0B3D6D] border-r border-slate-300'}`}
    >
      {/* 1. Brand Logo Header */}
      <div className={`flex items-center justify-between px-4 h-16 border-b flex-shrink-0 ${isDark ? 'bg-[#1a1d21] border-[#2a2e35]' : 'border-slate-300 bg-white'}`}>
        <Link href="/" onClick={onCloseMobile} className="flex items-center gap-3 cursor-pointer group">
          <div className="flex-shrink-0">
            <PathlyLogoMark size={34} />
          </div>
          {!collapsed && (
            <div className="animate-fade-in flex flex-col justify-center overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className={`text-base font-bold tracking-tight leading-none ${isDark ? 'text-white' : 'text-[#0B3D6D]'}`}>
                  Pathly
                </span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 text-white uppercase ${isDark ? 'bg-[#FFC107] text-black' : 'bg-[#0B3D6D] text-white'}`}>
                  {t('sidebarBrand')}
                </span>
              </div>
              <p className={`text-[10px] font-medium leading-tight mt-1 truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Pathly Network · Regional Command
              </p>
            </div>
          )}
        </Link>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* 2. Scrollable Navigation + Grid Status (pinned footer stays at bottom) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-none">
        <nav className={`py-5 px-3 flex flex-col overflow-x-hidden ${collapsed ? 'gap-3' : 'gap-1.5'}`}>
        {visibleNav.map((item, index) => {
          const active = isActive(item.path);
          const showSection = item.section && !collapsed && (index === 0 || visibleNav[index - 1]?.section !== item.section);

          return (
            <React.Fragment key={item.path}>
              {showSection && (
                <div className={`pt-4 pb-2 px-3 text-[10px] font-semibold tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {item.section}
                </div>
              )}
              <Link href={item.path} onClick={onCloseMobile}>
                <div
                  className={`group relative flex items-center gap-3 px-3 ${collapsed ? 'py-3.5' : 'py-3'} rounded text-xs transition-colors duration-150 cursor-pointer border ${
                    active
                      ? isDark
                        ? 'bg-[#23272d] text-[#FFC107] border-[#FFC107]/40 font-bold'
                        : 'bg-[#0B3D6D]/8 text-[#0B3D6D] border-[#0B3D6D]/20 font-bold'
                      : isDark
                        ? 'text-[#D6B94A] hover:bg-[#1a1d21] hover:border-[#3a3f47] border-transparent font-medium'
                        : 'text-[#0B3D6D] hover:bg-white hover:border-slate-300 border-transparent font-medium'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  {active && (
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 ${isDark ? 'bg-[#FFC107]' : 'bg-[#FF9933]'}`} />
                  )}

                  {/* Icon Container */}
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
                      isDark
                        ? active ? 'text-[#FFC107]' : 'text-[#D6B94A]'
                        : active ? 'text-[#0B3D6D]' : 'text-[#0B3D6D]'
                    }`}
                  >
                    {item.icon}
                  </div>

                  {/* Label */}
                  {!collapsed && (
                    <span className="truncate flex-1">
                      {item.label}
                    </span>
                  )}

                  {/* Badges */}
                  {!collapsed && item.badge && item.badge > 0 ? (
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      active
                        ? isDark ? 'bg-[#FFC107] text-black border-transparent' : 'bg-[#FF9933] text-white border-transparent'
                        : 'bg-[#7A1F1F] text-white border-transparent'
                    }`}>
                      {item.badge}
                    </span>
                  ) : null}

                  {/* Collapsed Badge Dot */}
                  {collapsed && item.badge && item.badge > 0 ? (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#7A1F1F] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  ) : null}
                </div>
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* 3. Operational Grid Status */}
      {!collapsed && (
        <div className={`mx-3 mb-3 p-3 rounded flex items-center gap-2.5 ${isDark ? 'bg-[#1a1d21] border border-[#2a2e35]' : 'bg-white border border-slate-300'}`}>
          <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-bold flex items-center gap-1 leading-none ${isDark ? 'text-green-400' : 'text-green-700'}`}>
              <span>{t('liveRegionalGrid')}</span>
            </p>
            <p className={`text-[9px] truncate mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('corridorsSynchronized')}
            </p>
          </div>
          <Activity size={14} className={`flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
        </div>
      )}
      </div>

      {/* 4. Bottom Footer: Settings & Collapse Toggle (pinned to the sidebar bottom—mt-auto docks it to the bottom edge, sticky keeps it docked while the nav scrolls) */}
      <div className={`mt-auto sticky bottom-0 border-t p-3.5 space-y-2 flex-shrink-0 ${isDark ? 'border-[#2a2e35] bg-[#16181c]' : 'border-slate-300 bg-white'}`}>
        <Link href="/settings">
          <div
            className={`group flex items-center gap-3 px-3 py-3 rounded text-xs transition-colors duration-150 cursor-pointer border ${
              isActive('/settings')
                ? isDark
                  ? 'bg-[#23272d] text-[#FFC107] border-[#FFC107]/40 font-bold'
                  : 'bg-[#0B3D6D]/8 text-[#0B3D6D] border-[#0B3D6D]/20 font-bold'
                : isDark
                  ? 'text-[#D6B94A] hover:bg-[#1a1d21] hover:border-[#3a3f47] border-transparent font-medium'
                  : 'text-[#0B3D6D] hover:bg-slate-50 hover:border-slate-300 border-transparent font-medium'
            }`}
            title={collapsed ? t('settingsTip') : undefined}
          >
            <div
              className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${isDark ? 'text-[#FFC107]' : 'text-[#0B3D6D]'}`}
            >
              <Settings size={18} />
            </div>
            {!collapsed && <span className="truncate">{t('settings')}</span>}
          </div>
        </Link>

        {/* Collapse Toggle — hidden on mobile (sidebar is a drawer, not collapsible) */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors cursor-pointer group hover:border ${isDark ? 'text-slate-400 hover:text-[#FFC107] hover:bg-[#1a1d21] hover:border-[#3a3f47]' : 'text-slate-600 hover:text-[#0B3D6D] hover:bg-slate-50'}`}
          title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${isDark ? 'text-slate-400 group-hover:text-[#FFC107]' : 'text-slate-500 group-hover:text-[#0B3D6D]'}`}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </div>
          {!collapsed && <span className="text-xs">{t('collapseNavigation')}</span>}
        </button>
      </div>
    </aside>
  );
}

// Mobile sidebar toggle button (for small screens)
export function MobileSidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded bg-[#0B3D6D] border border-white/30 text-white shadow-md"
      title="Open Menu"
    >
      <Menu size={20} />
    </button>
  );
}
