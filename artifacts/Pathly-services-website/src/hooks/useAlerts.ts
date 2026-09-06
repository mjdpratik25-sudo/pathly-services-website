// ============================================================
// useAlerts: Alert management system with auto-generation
// ============================================================

import { useState, useCallback } from 'react';
import { INITIAL_ALERTS, type LogisticsAlert, type AlertSeverity, type AlertCategory } from '../data/nerData';

export function useAlerts() {
  const [alerts, setAlerts] = useState<LogisticsAlert[]>(INITIAL_ALERTS);
  const [filter, setFilter] = useState<{ severity?: AlertSeverity; category?: AlertCategory; active?: boolean }>({});

  const filteredAlerts = alerts.filter(a => {
    if (filter.severity && a.severity !== filter.severity) return false;
    if (filter.category && a.category !== filter.category) return false;
    if (filter.active !== undefined && a.isActive !== filter.active) return false;
    return true;
  });

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, isActive: false, acknowledged: true } : a
    ));
  }, []);

  const addAlert = useCallback((alert: Omit<LogisticsAlert, 'id'>) => {
    const id = `ALT-${String(alerts.length + 1).padStart(3, '0')}`;
    setAlerts(prev => [{ ...alert, id }, ...prev]);
  }, [alerts.length]);

  const activeAlerts = alerts.filter(a => a.isActive);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.isActive);
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged && a.isActive);

  return {
    alerts,
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
