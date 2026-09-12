// ============================================================
// useVehicleTracking: Live GPS fleet positions
// Primary: server pipeline (/api/fleet/vehicles) every tick.
// Fallback: in-browser movement simulation ONLY when the
// backend/network is unreachable, so the UI never fabricates
// positions while a real stream exists.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { VEHICLES, type Vehicle } from '../data/nerData';
import { getVehicles, scenarioActive } from '../lib/scenarioEngine';
import { getFleetVehicles, type FleetVehicle } from '../lib/api';

// Map exactly the 10 registry vehicles ID==fixture ID, keeping the
// existing fixture as the static profile base and overlaying ONLY
// live telemetry values from the backend.
function mergeFleetIntoFixtures(fleet: FleetVehicle[]): Vehicle[] {
  return VEHICLES.map(fix => {
    const live = fleet.find(f => f.id === fix.id);
    if (!live) return fix;
    return {
      ...fix,
      currentLat: live.currentLat,
      currentLng: live.currentLng,
      speed: live.speed,
      heading: live.heading,
      status: normalizeStatus(live.status),
      eta: live.eta || fix.eta,
      progress: live.progress,
      source: live.source as Vehicle['source'],
      sourceLabel: live.sourceLabel,
      telemetryStatus: live.telemetryStatus as Vehicle['telemetryStatus'],
      signalAgeMs: live.signalAgeMs,
      distanceTripKm: live.distanceTripKm,
      lastSignalAt: new Date().toISOString(),
    };
  });
}

function normalizeStatus(s: string): Vehicle['status'] {
  if (s === 'delayed') return 'delayed';
  if (s === 'in_transit') return 'in_transit';
  if (s === 'delivered') return 'delivered';
  return 'stopped';
}

export function useVehicleTracking(updateIntervalMs = 5000) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getVehicles());
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [gpsSyncStatus, setGpsSyncStatus] = useState<'idle' | 'synced' | 'queued'>('idle');
  const [serverOnline, setServerOnline] = useState(false);

  const simulateMovement = useCallback(() => {
    setVehicles(prev => {
      const moved = prev.map(v => {
        if (v.status === 'stopped' || v.status === 'delivered' || v.status === 'loading') return v;

        const speedVariation = (Math.random() - 0.5) * 10;
        const newSpeed = Math.max(0, Math.min(80, v.speed + speedVariation));
        const moveDistance = (newSpeed / 3600) * (updateIntervalMs / 1000); // km moved
        const headingRad = (v.heading * Math.PI) / 180;
        const latDelta = (moveDistance / 111) * Math.cos(headingRad);
        const lngDelta = (moveDistance / (111 * Math.cos(v.currentLat * Math.PI / 180))) * Math.sin(headingRad);

        const newProgress = Math.min(100, v.progress + Math.random() * 0.5);
        let newStatus: Vehicle['status'] = v.status;
        if (newProgress >= 100) newStatus = 'delivered';
        else if (newSpeed < 5 && v.status === 'in_transit') newStatus = Math.random() > 0.7 ? 'delayed' : 'in_transit';

        const headingDelta = (Math.random() - 0.5) * 10;

        return {
          ...v,
          currentLat: v.currentLat + latDelta,
          currentLng: v.currentLng + lngDelta,
          speed: Math.round(newSpeed),
          heading: (v.heading + headingDelta + 360) % 360,
          progress: Math.round(newProgress * 10) / 10,
          status: newStatus,
          fuelLevel: Math.max(0, v.fuelLevel - Math.random() * 0.1)
        };
      });

      // Fuse scenario overrides (DRILL FEED) on top so the scripted
      // drill's states (delayed convoy, reroute assignment) are respected
      // instead of being overwritten by the baseline movement sim.
      if (!scenarioActive()) return moved;
      return moved.map(v => {
        const ov = getVehicles().find(x => x.id === v.id);
        if (!ov) return v;
        const hasOverride = ov.status !== v.status || ov.route !== v.route || ov.eta !== v.eta;
        if (!hasOverride) return v;
        return { ...v, status: ov.status, speed: ov.speed, eta: ov.eta, route: ov.route, progress: ov.progress };
      });
    });
  }, [updateIntervalMs]);

  useEffect(() => {
    let alive = true;
    let cancelled = false;
    const tick = async () => {
      if (!navigator.onLine) {
        setGpsSyncStatus('queued');
        simulateMovement();
        return;
      }
      const fleet = await getFleetVehicles();
      if (!alive || cancelled) return;
      if (fleet && fleet.length > 0) {
        setServerOnline(true);
        setGpsSyncStatus('synced');
        setVehicles(mergeFleetIntoFixtures(fleet));
      } else {
        // Backend unreachable → honest offline mode: keep the browser
        // simulation running so the map stays usable, but never claim it
        // is a live GPS uplink.
        setServerOnline(false);
        setGpsSyncStatus('queued');
        simulateMovement();
      }
    };
    tick();
    const interval = setInterval(tick, updateIntervalMs);
    return () => { alive = false; cancelled = true; clearInterval(interval); };
  }, [updateIntervalMs, simulateMovement]);

  // Keep selectedVehicle synced
  useEffect(() => {
    if (selectedVehicle) {
      const updated = vehicles.find(v => v.id === selectedVehicle.id);
      if (updated) setSelectedVehicle(updated);
    }
  }, [vehicles, selectedVehicle]);

  const getVehiclesByStatus = useCallback((status: Vehicle['status']) => {
    return vehicles.filter(v => v.status === status);
  }, [vehicles]);

  const getVehiclesByCargo = useCallback((cargoType: Vehicle['cargoType']) => {
    return vehicles.filter(v => v.cargoType === cargoType);
  }, [vehicles]);

  const activeVehicles = vehicles.filter(v => v.status === 'in_transit' || v.status === 'delayed');
  const delayedVehicles = vehicles.filter(v => v.status === 'delayed');
  const emergencyVehicles = vehicles.filter(v => v.priority === 'emergency');

  const refresh = useCallback(() => {
    simulateMovement();
  }, [simulateMovement]);

  return {
    vehicles,
    selectedVehicle,
    setSelectedVehicle,
    gpsSyncStatus,
    serverOnline,
    activeVehicles,
    delayedVehicles,
    emergencyVehicles,
    getVehiclesByStatus,
    getVehiclesByCargo,
    refresh
  };
}