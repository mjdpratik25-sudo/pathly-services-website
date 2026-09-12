// ============================================================
// useAlerts: Alert management system with auto-generation
// Merges: baseline alerts + scenario (DRILL FEED) alerts +
// live GPS pipeline alerts fetched from /api/fleet/alerts.
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { INITIAL_ALERTS, type LogisticsAlert, type AlertSeverity, type AlertCategory, type NERState, type GpsSource } from '../data/nerData';
import { useScenario } from '../lib/scenarioEngine';
import { getFleetAlerts, type FleetAlertItem } from '../lib/api';

const FLEET_ALERT_PREFIX = 'FLT-';

function normalizeFleetAlert(a: FleetAlertItem): LogisticsAlert {
  const severity = (a.severity === 'critical' || a.severity === 'warning' || a.severity === 'info' ? a.severity : 'warning') as AlertSeverity;
  const category = (['geofence', 'speeding', 'route_deviation', 'unauthorized_stop', 'telemetry'].includes(a.category) ? a.category : 'telemetry') as AlertCategory;
  const source = (a.source === 'driver_mobile' || a.source === 'real' ? a.source : 'simulator') as GpsSource;
  const time = new Date(a.created_at);
  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  return {
    id: `${FLEET_ALERT_PREFIX}${a.id}`,
    category,
    severity,
    title: a.title,
    description: a.description,
    location: `${a.vehicle_id} @ ${a.lat.toFixed(3)}°, ${a.lng.toFixed(3)}°`,
    district: '—',
    state: 'Assam' as NERState,
    lat: a.lat,
    lng: a.lng,
    reportedAt: `${hh}:${mm}`,
    reportedBy: 'GPS Telemetry Service',
    affectedRoutes: ['Live GPS telemetry'],
    estimatedClearTime: 'Auto-cleared by telemetry',
    isActive: a.is_active === 1,
    acknowledged: false,
    source,
    sourceLabel: a.sourceLabel ?? (source === 'driver_mobile' ? 'Driver Mobile Location' : source === 'real' ? 'Real GPS Device' : 'Vehicle Stream (Field Telemetry)'),
  };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<LogisticsAlert[]>(INITIAL_ALERTS);
  const [fleetAlerts, setFleetAlerts] = useState<LogisticsAlert[]>([]);
  const [dismissedFleetIds, setDismissedFleetIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<{ severity?: AlertSeverity; category?: AlertCategory; active?: boolean }>({});
  const { scenario } = useScenario();

  // Poll the live GPS pipeline alerts (geofence entry/exit, speeding,
  // route deviation, unauthorized stop) into the same Alert Center UI.
  useEffect(() => {
    let alive = true;
    let cancelled = false;
    const poll = async () => {
      if (!navigator.onLine) return;
      const items = await getFleetAlerts();
      if (!alive || cancelled || !items) return;
      setFleetAlerts(items.map(normalizeFleetAlert));
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => { alive = false; cancelled = true; clearInterval(interval); };
  }, []);

  const visibleFleetAlerts = fleetAlerts.filter(a => !dismissedFleetIds.has(a.id) && a.isActive);

  // Merge scenario-driven (DRILL FEED) alerts on top of baseline + live.
  const effectiveAlerts: LogisticsAlert[] = [...scenario.extraAlerts, ...visibleFleetAlerts, ...alerts];

  const filteredAlerts = effectiveAlerts.filter(a => {
    if (filter.severity && a.severity !== filter.severity) return false;
    if (filter.category && a.category !== filter.category) return false;
    if (filter.active !== undefined && a.isActive !== filter.active) return false;
    return true;
  });

  const acknowledgeAlert = useCallback((alertId: string) => {
    if (alertId.startsWith(FLEET_ALERT_PREFIX)) {
      setDismissedFleetIds(prev => new Set([...prev, alertId]));
      return;
    }
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    if (alertId.startsWith(FLEET_ALERT_PREFIX)) {
      setDismissedFleetIds(prev => new Set([...prev, alertId]));
      return;
    }
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, isActive: false, acknowledged: true } : a
    ));
  }, []);

  const addAlert = useCallback((alert: Omit<LogisticsAlert, 'id'>) => {
    const id = `ALT-${String(alerts.length + 1).padStart(3, '0')}`;
    setAlerts(prev => [{ ...alert, id }, ...prev]);
  }, [alerts.length]);

  const activeAlerts = effectiveAlerts.filter(a => a.isActive);
  const criticalAlerts = effectiveAlerts.filter(a => a.severity === 'critical' && a.isActive);
  const unacknowledgedAlerts = effectiveAlerts.filter(a => !a.acknowledged && a.isActive);

  return {
    alerts: effectiveAlerts,
    filteredAlerts,
    filter,
    setFilter,
    acknowledgeAlert,
    resolveAlert,
    addAlert,
    activeAlerts,
    criticalAlerts,
    unacknowledgedAlerts,
    totalActive: activeAlerts.length,
    totalCritical: criticalAlerts.length
  };
}