// ============================================================
// useVehicleTracking: Simulated GPS vehicle position updates
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { VEHICLES, type Vehicle } from '../data/nerData';

export function useVehicleTracking(updateIntervalMs = 5000) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(VEHICLES);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const simulateMovement = useCallback(() => {
    setVehicles(prev => prev.map(v => {
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
    }));
  }, [updateIntervalMs]);

  useEffect(() => {
    const interval = setInterval(simulateMovement, updateIntervalMs);
    return () => clearInterval(interval);
  }, [simulateMovement, updateIntervalMs]);

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
    activeVehicles,
    delayedVehicles,
    emergencyVehicles,
    getVehiclesByStatus,
    getVehiclesByCargo,
    refresh
  };
}
