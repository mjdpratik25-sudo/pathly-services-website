// ============================================================
// AlertCenter: Real-time Alerts & Emergency Disaster Dispatch
// ============================================================

import React, { useState, useEffect } from 'react';
import { lockScroll, unlockScroll } from '../lib/scrollLock';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  MapPin, 
  Clock, 
  Filter, 
  ShieldAlert, 
  Globe, 
  Send,
  X,
  Navigation,
  Smartphone,
  Flame,
  Volume2,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { useLocation } from 'wouter';
import StatusBadge from '../components/common/StatusBadge';
import { useAlerts } from '../hooks/useAlerts';
import { 
  NER_STATES, 
  NER_DISTRICTS, 
  type AlertCategory, 
  type AlertSeverity, 
  type LogisticsAlert, 
  type NERState,
  MULTILINGUAL_LABELS 
} from '../data/nerData';
import { dispatchDriverSms } from '../lib/smsService';
import { sendLocalOrFirebaseNotification } from '../lib/firebaseService';

export default function AlertCenter() {
  const { 
    alerts, 
    activeAlerts, 
    criticalAlerts, 
    acknowledgeAlert, 
    resolveAlert, 
    addAlert 
  } = useAlerts();

  const [categoryFilter, setCategoryFilter] = useState<AlertCategory | 'ALL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAlertForSms, setSelectedAlertForSms] = useState<LogisticsAlert | null>(null);
  const [smsPhoneInput, setSmsPhoneInput] = useState('+919876543210');
  const [smsLang, setSmsLang] = useState<'en' | 'hi' | 'as'>('en');
  const [smsSending, setSmsSending] = useState(false);
  const [smsNotice, setSmsNotice] = useState<string | null>(null);
  const [pushNotice, setPushNotice] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'en' | 'hi' | 'as' | 'bn' | 'mni'>('en');

  // Lock background scroll when modals are open
  useEffect(() => {
    if (showCreateModal || !!selectedAlertForSms) {
      lockScroll();
      return () => {
        unlockScroll();
      };
    }
    return undefined;
  }, [showCreateModal, selectedAlertForSms]);

  const [location, setLocation] = useLocation();
  const alertId = new URLSearchParams(location.split('?')[1] || '').get('alert');
  const selectedAlert = alertId ? alerts.find((a) => a.id === alertId) || null : null;

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AlertCategory>('landslide');
  const [severity, setSeverity] = useState<AlertSeverity>('critical');
  const [state, setState] = useState<NERState>('Assam');
  const [district, setDistrict] = useState('Nagaon');
  const [locationStr, setLocationStr] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedClearTime, setEstimatedClearTime] = useState('12-24 hours');

  const filteredAlerts = alerts.filter((a) => {
    if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    return true;
  });

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    const districtObj = NER_DISTRICTS.find((d) => d.name === district) || NER_DISTRICTS[0];

    addAlert({
      title,
      category,
      severity,
      state,
      district,
      location: locationStr || `${district}, ${state}`,
      description,
      lat: districtObj.lat + (Math.random() - 0.5) * 0.05,
      lng: districtObj.lng + (Math.random() - 0.5) * 0.05,
      reportedAt: 'Just now',
      reportedBy: 'Logistics Command Control',
      affectedRoutes: [`NH corridor near ${district}`],
      estimatedClearTime,
      isActive: true,
      acknowledged: false,
    });

    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setLocationStr('');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {selectedAlert ? (
        /* ===== Alert Detail View ===== */
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back navigation */}
          <button
            onClick={() => setLocation('/alerts')}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Back to Alert Center</span>
          </button>

          {/* Detail Header */}
          <div className={`p-5 rounded-2xl border shadow-sm ${
            selectedAlert.severity === 'critical'
              ? 'border-rose-200/80 dark:border-red-500/30 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 dark:from-red-950/25 dark:via-slate-900 dark:to-slate-900'
              : selectedAlert.severity === 'warning'
              ? 'border-amber-200/80 dark:border-amber-500/30 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/25 dark:via-slate-900 dark:to-slate-900'
              : 'border-blue-200/80 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 dark:from-blue-950/25 dark:via-slate-900 dark:to-slate-900'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  {selectedAlert.category === 'landslide' ? '⛰️' : selectedAlert.category === 'flood' ? '🌊' : selectedAlert.category === 'bridge_closure' ? '🌉' : selectedAlert.category === 'road_damage' ? '🚧' : selectedAlert.category === 'accident' ? '💥' : '⚠️'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge type="severity" value={selectedAlert.severity} />
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold border tracking-wide uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                      {selectedAlert.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">[{selectedAlert.state}]</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {selectedAlert.title}
                  </h2>
                </div>
              </div>
              <span className="text-sm font-mono text-amber-600 dark:text-amber-400 font-bold px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                ⏱ {selectedAlert.estimatedClearTime}
              </span>
            </div>
          </div>

          {/* Meta + Description */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Full Description</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedAlert.description}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[hsl(var(--muted))]/30 border border-slate-200 dark:border-slate-700 space-y-2.5 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">Location</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{selectedAlert.location} ({selectedAlert.district}, {selectedAlert.state})</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={15} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">Reported</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{selectedAlert.reportedAt} — {selectedAlert.reportedBy}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation size={15} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">Affected Corridors</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedAlert.affectedRoutes.join(', ')}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="text-rose-500 dark:text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">Co-ordinates</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedAlert.lat.toFixed(4)}°N, {selectedAlert.lng.toFixed(4)}°E</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => setLocation(`/accessibility?lat=${selectedAlert.lat}&lng=${selectedAlert.lng}&zoom=14&name=${encodeURIComponent(selectedAlert.title)}`)}
                  className="flex-1 min-w-[160px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <MapPin size={14} />
                  <span>Pinpoint on GIS Map</span>
                </button>
                <button
                  onClick={() => setSelectedAlertForSms(selectedAlert)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <Smartphone size={14} />
                  <span>SMS Driver</span>
                </button>
                <button
                  onClick={async () => {
                    const res = await sendLocalOrFirebaseNotification({
                      title: `🚨 ${selectedAlert.title}`,
                      body: `${selectedAlert.location} [${selectedAlert.state}] • ${selectedAlert.description}`,
                      severity: selectedAlert.severity as any,
                      district: selectedAlert.district,
                      state: selectedAlert.state
                    });
                    setPushNotice(res.message);
                    setTimeout(() => setPushNotice(null), 4000);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <Flame size={14} />
                  <span>Web Push</span>
                </button>
              </div>
            </div>

            {/* Side: Related / Recommended */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Recommended Action</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedAlert.severity === 'critical'
                    ? 'Avoid the affected corridor. BRO/SDRF clearance teams are en route. Use the alternate corridors listed above and plan for significant delays.'
                    : selectedAlert.severity === 'warning'
                    ? 'Proceed with caution. Single lane is operational with traffic regulation. Heavy vehicles are advised to use alternate routes.'
                    : 'Monitor live telemetry. Expect heavy congestion; allow additional transit time at the reported checkpoint.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Related Alerts</h3>
                <div className="space-y-1">
                  {alerts.filter((a) => a.id !== selectedAlert.id && a.state === selectedAlert.state).slice(0, 3).map((rel) => (
                    <button
                      key={rel.id}
                      onClick={() => setLocation(`/alerts?alert=${rel.id}`)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors cursor-pointer"
                    >
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${
                        rel.severity === 'critical' ? 'bg-red-600' : rel.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{rel.title}</span>
                    </button>
                  ))}
                  {alerts.filter((a) => a.id !== selectedAlert.id && a.state === selectedAlert.state).length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No other active incidents in {selectedAlert.state}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ===== Main Alert Center Feed ===== */
        <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-rose-200/60 dark:border-slate-700 bg-gradient-to-r from-rose-50/80 via-white to-amber-50/60 dark:from-red-950/40 dark:via-slate-900 dark:to-amber-950/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-600 dark:text-red-400 font-bold">
              Emergency Broadcast & Disaster Telemetry
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            Logistics Disruption & High-Risk Corridor Alert Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated alerts for blocked bridges, landslides, flash floods, and emergency rescue re-routing.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all self-start md:self-auto ring-2 ring-rose-400/20 cursor-pointer"
        >
          <Plus size={15} />
          <span>Broadcast Incident Alert</span>
        </button>
      </div>

      {/* Multilingual Broadcast Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-white via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <Globe size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-slate-700 dark:text-slate-300">Multilingual SMS/IVR Alert Broadcast:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveLang('en')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
              activeLang === 'en'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/20'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setActiveLang('hi')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
              activeLang === 'hi'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/20'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60'
            }`}
          >
            हिंदी
          </button>
          <button
            onClick={() => setActiveLang('as')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
              activeLang === 'as'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/20'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60'
            }`}
          >
            অসমীয়া
          </button>
          <button
            onClick={() => setActiveLang('bn')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
              activeLang === 'bn'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/20'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60'
            }`}
          >
            বাংলা
          </button>
          <button
            onClick={() => setActiveLang('mni')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
              activeLang === 'mni'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/20'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60'
            }`}
          >
            মৈতৈলোন্
          </button>
        </div>
      </div>

      {/* Filter Tabs with Rich Colorful Backgrounds */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
            categoryFilter === 'ALL'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/20'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60'
          }`}
        >
          All Incidents ({alerts.length})
        </button>
        <button
          onClick={() => setCategoryFilter('landslide')}
          className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
            categoryFilter === 'landslide'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25 ring-1 ring-amber-400/20'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/60'
          }`}
        >
          ⛰️ Landslides
        </button>
        <button
          onClick={() => setCategoryFilter('flood')}
          className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
            categoryFilter === 'flood'
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 ring-1 ring-sky-400/20'
              : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800/60'
          }`}
        >
          🌊 Floods
        </button>
        <button
          onClick={() => setCategoryFilter('bridge_closure')}
          className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
            categoryFilter === 'bridge_closure'
              ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25 ring-1 ring-rose-400/20'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60'
          }`}
        >
          🌉 Bridge Closures
        </button>
        <button
          onClick={() => setCategoryFilter('road_damage')}
          className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
            categoryFilter === 'road_damage'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25 ring-1 ring-purple-400/20'
              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/60'
          }`}
        >
          🚧 Road Damage
        </button>
      </div>

      {/* Alert Cards Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAlerts.map((alt) => (
          <div
            key={alt.id}
            className={`p-4.5 rounded-2xl border transition-all shadow-xs hover:shadow-md ${
              alt.severity === 'critical'
                ? 'border-rose-200/80 dark:border-red-500/30 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 dark:from-red-950/20 dark:via-slate-900 dark:to-slate-900'
                : 'border-amber-200/80 dark:border-amber-500/30 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <StatusBadge type="severity" value={alt.severity} />
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">[{alt.state}]</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-[hsl(var(--muted-foreground))]">{alt.reportedAt}</span>
            </div>

            <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2.5">{alt.title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{alt.description}</p>

            <div className="mt-3 p-3 rounded-xl bg-slate-50/80 dark:bg-[hsl(var(--muted))]/40 border border-slate-200/80 dark:border-[hsl(var(--border))] space-y-1 text-xs">
              <div className="flex justify-between gap-3 min-w-0">
                <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">Location:</span>
                <span className="font-bold text-slate-900 dark:text-slate-200 text-right min-w-0">{alt.location}</span>
              </div>
              <div className="flex justify-between gap-3 min-w-0">
                <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">Estimated Clearance:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-right min-w-0">{alt.estimatedClearTime}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 min-w-0">
                <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">Affected Corridors:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-300 break-words">{alt.affectedRoutes.join(', ')}</span>
              </div>
            </div>

            {/* Action Buttons with Colorful Surrounding Gradients */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {alt.acknowledged ? (
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={13} />
                    <span>Acknowledged</span>
                  </span>
                ) : (
                  <button
                    onClick={() => acknowledgeAlert(alt.id)}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    Acknowledge
                  </button>
                )}

                {/* SMS Dispatch Trigger */}
                <button
                  onClick={() => {
                    setSelectedAlertForSms(alt);
                    setSmsNotice(null);
                  }}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  title="Send Multilingual SMS to Driver App"
                >
                  <Smartphone size={12} />
                  <span>SMS Driver</span>
                </button>

                {/* Desktop Push Alert Trigger */}
                <button
                  onClick={async () => {
                    const res = await sendLocalOrFirebaseNotification({
                      title: `🚨 ${alt.title}`,
                      body: `${alt.location} [${alt.state}] • ${alt.description}`,
                      severity: alt.severity as any,
                      district: alt.district,
                      state: alt.state
                    });
                    setPushNotice(res.message);
                    setTimeout(() => setPushNotice(null), 4000);
                  }}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[11px] font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  title="Broadcast Instant Web Push Notification"
                >
                  <Flame size={12} />
                  <span>Web Push</span>
                </button>
              </div>

              {alt.isActive && (
                <button
                  onClick={() => resolveAlert(alt.id)}
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Resolve Alert
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Push Notification Feedback Pill */}
      {pushNotice && (
        <div className="fixed bottom-4 right-4 z-50 p-3 rounded-xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs shadow-2xl backdrop-blur-md flex items-center gap-2 animate-slide-in-up">
          <Bell size={14} className="text-amber-400" />
          <span>{pushNotice}</span>
        </div>
      )}

      {/* Driver SMS Dispatch Modal */}
      {selectedAlertForSms && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAlertForSms(null);
          }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in touch-none overscroll-contain"
        >
          <div className="w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl p-5 space-y-4 animate-slide-in-up overscroll-contain touch-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Smartphone size={18} />
                <span>Dispatch Driver SMS Alert</span>
              </div>
              <button
                onClick={() => setSelectedAlertForSms(null)}
                className="p-1 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))] text-xs space-y-1">
              <p className="font-bold text-[hsl(var(--foreground))]">{selectedAlertForSms.title}</p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">📍 {selectedAlertForSms.location} ({selectedAlertForSms.district}, {selectedAlertForSms.state})</p>
            </div>

            {/* Language Selector */}
            <div>
              <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">SMS Language</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSmsLang('en')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    smsLang === 'en' ? 'bg-indigo-600 text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setSmsLang('hi')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    smsLang === 'hi' ? 'bg-indigo-600 text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  हिंदी (Hindi)
                </button>
                <button
                  type="button"
                  onClick={() => setSmsLang('as')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    smsLang === 'as' ? 'bg-indigo-600 text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  অসমীয়া (Assamese)
                </button>
              </div>
            </div>

            {/* Recipient Phone */}
            <div>
              <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">Driver Mobile Number</label>
              <input
                type="tel"
                value={smsPhoneInput}
                onChange={(e) => setSmsPhoneInput(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs font-mono text-[hsl(var(--foreground))]"
              />
            </div>

            {smsNotice && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                {smsNotice}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setSmsSending(true);
                  const res = await dispatchDriverSms({
                    recipientPhone: smsPhoneInput,
                    hazardType: selectedAlertForSms.category === 'landslide' ? 'landslide' : selectedAlertForSms.category === 'flood' ? 'flood' : 'roadblock',
                    location: selectedAlertForSms.location,
                    recommendedCorridor: selectedAlertForSms.affectedRoutes[0] ? `Bypass via ${selectedAlertForSms.affectedRoutes[0]}` : undefined,
                    language: smsLang
                  });
                  setSmsSending(false);
                  setSmsNotice(res.message);
                  if (res.success) {
                    setTimeout(() => {
                      setSelectedAlertForSms(null);
                      setSmsNotice(null);
                    }, 2500);
                  }
                }}
                disabled={smsSending}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                {smsSending ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Transmit SMS to Driver</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedAlertForSms(null)}
                className="px-4 py-2.5 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Alert Modal */}
      {showCreateModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in touch-none overscroll-contain"
        >
          <div className="w-full max-w-4xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 space-y-4 animate-slide-in-up max-h-[90vh] overflow-y-auto overscroll-contain touch-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2 text-red-400 font-bold text-base">
                <ShieldAlert size={18} />
                <span>Broadcast New Logistics Disruption</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-6 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Incident Headline</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Major Landslide on NH-44 near Umling"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Incident Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
                  >
                    <option value="landslide">⛰️ Landslide</option>
                    <option value="flood">🌊 Flash Flood</option>
                    <option value="bridge_closure">🌉 Bridge Structural Alert</option>
                    <option value="road_damage">🚧 Road Subsidence</option>
                    <option value="accident">💥 Heavy Vehicle Accident</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
                  >
                    <option value="critical">🔴 Critical (Total Blockade)</option>
                    <option value="warning">🟡 Warning (Single Lane Open)</option>
                    <option value="info">🔵 Advisory (Heavy Congestion)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Affected State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
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
                    placeholder="e.g. East Khasi Hills"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Exact Location / Highway Marker</label>
                  <input
                    type="text"
                    placeholder="e.g. NH-44 km 42 near Umling Village"
                    value={locationStr}
                    onChange={(e) => setLocationStr(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-[hsl(var(--foreground))] block mb-1">Disruption Description & Relief Measures</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide details on road blockage, stranded vehicles, and deployed BRO/SDRF teams..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[hsl(var(--muted))]/80 border border-[hsl(var(--border))] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]" style={{ marginTop: 32 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-[hsl(var(--muted))] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Send size={13} />
                  <span>Transmit Broadcast</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
