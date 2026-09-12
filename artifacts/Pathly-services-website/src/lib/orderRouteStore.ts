// ============================================================
// orderRouteStore: Links Route Planning to Specific Orders & Fleet
// ============================================================
// Stores route decisions made in the Smart Routing Engine against
// specific order/consignment IDs so they can be inspected in
// Fleet Tracking, Cargo Manifest, and Search.
// ============================================================

import type { CargoType } from '../data/nerData';

export interface AssignedOrderRoute {
  orderId: string;
  vehicleId?: string;
  registrationNo?: string;
  driverName?: string;
  routeName: string;
  corridorSummary: string;
  origin: string;
  destination: string;
  cargoType: CargoType;
  priority: 'normal' | 'emergency';
  totalDistanceKm: number;
  estimatedTimeHours: number;
  riskScore: number;
  riskClass: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH' | 'EXTREME';
  terrainDifficulty: string;
  fuelEstimateLiters: number;
  tollCostRupees: number;
  dispatchedAt: string;
  dispatchedBy: string;
  status: 'dispatched' | 'assigned_fleet' | 'in_transit';
  avoidanceNotice?: string;
  alternateReason?: string;
}

export interface DemoOrder {
  orderId: string;
  vehicleId: string;
  registrationNo: string;
  driverName: string;
  driverPhone: string;
  origin: string;
  destination: string;
  cargoType: CargoType;
  cargoDescription: string;
  cargoWeight: number; // tons
  priority: 'normal' | 'emergency';
  corridorNote?: string;
  hasDisruptionRisk?: boolean;
}

export const DEMO_ORDERS: DemoOrder[] = [
  {
    orderId: 'ORD-AS-90412',
    vehicleId: 'NER-V001',
    registrationNo: 'AS-01-AB-1234',
    driverName: 'Ranjan Das',
    driverPhone: '9864011223',
    origin: 'Guwahati',
    destination: 'Tezpur',
    cargoType: 'medicines',
    cargoDescription: 'Essential medicines, vaccines & medical supplies for Tezpur Civil Hospital',
    cargoWeight: 4.2,
    priority: 'emergency',
    corridorNote: 'NH-27 4-lane expressway corridor; flood watch near Nagaon bypass',
  },
  {
    orderId: 'ORD-AR-77210',
    vehicleId: 'NER-V008',
    registrationNo: 'AR-01-J-0123',
    driverName: 'Nabam Taki',
    driverPhone: '9774112233',
    origin: 'Itanagar',
    destination: 'Aalo',
    cargoType: 'construction',
    cargoDescription: 'Pre-fab bridge panels & heavy machinery parts for Siang River bridge project',
    cargoWeight: 10.5,
    priority: 'normal',
    corridorNote: 'High-altitude mountain pass corridor via NH-13 / Trans-Arunachal Highway',
  },
  {
    orderId: 'ORD-ML-33087',
    vehicleId: 'NER-V002',
    registrationNo: 'ML-05-C-5678',
    driverName: 'Bah Kynjah Lyngdoh',
    driverPhone: '9436234567',
    origin: 'Shillong',
    destination: 'Jowai',
    cargoType: 'food_supplies',
    cargoDescription: 'Rice, pulses, cooking oil & PDS supplies for Jowai / Jaintia distribution centers',
    cargoWeight: 2.8,
    priority: 'normal',
    corridorNote: 'Shorter inter-district plateau route (~65 km); stable hill road',
  },
  {
    orderId: 'ORD-MN-51190',
    vehicleId: 'NER-V004',
    registrationNo: 'MN-01-E-3456',
    driverName: 'Thingbaijam Ibochouba',
    driverPhone: '8794556677',
    origin: 'Imphal',
    destination: 'Moreh',
    cargoType: 'agricultural',
    cargoDescription: 'High-value organic seeds, bamboo produce & spices for border trade terminal',
    cargoWeight: 3.5,
    priority: 'normal',
    corridorNote: 'Direct NH-2 currently blocked by landslide/subsidence — AI recommends bypass corridor',
    hasDisruptionRisk: true,
  },
  {
    orderId: 'ORD-MZ-14456',
    vehicleId: 'NER-V006',
    registrationNo: 'MZ-01-G-2345',
    driverName: 'Lalchhuanawma Ralte',
    driverPhone: '9436889900',
    origin: 'Aizawl',
    destination: 'Lunglei',
    cargoType: 'fuel',
    cargoDescription: 'Diesel fuel and essential energy supplies for Lunglei district generators',
    cargoWeight: 8.0,
    priority: 'emergency',
    corridorNote: 'Long-distance high-relief hill highway (NH-54); steep gradients & ridge curves',
  },
];

const STORAGE_KEY = 'pathly_assigned_routes_v1';

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeOrderRoutes(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAllAssignedRoutes(): Record<string, AssignedOrderRoute> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getAssignedRouteForOrder(orderId: string): AssignedOrderRoute | null {
  if (!orderId) return null;
  const all = getAllAssignedRoutes();
  const normalized = orderId.trim().toUpperCase();
  return all[normalized] || null;
}

export function saveOrderRoute(assignment: AssignedOrderRoute): void {
  try {
    const all = getAllAssignedRoutes();
    const key = assignment.orderId.trim().toUpperCase();
    all[key] = {
      ...assignment,
      orderId: key,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    notify();
  } catch (err) {
    console.error('Failed to save assigned route:', err);
  }
}

export function findDemoOrder(orderTokenOrQuery: string): DemoOrder | undefined {
  if (!orderTokenOrQuery) return undefined;
  const q = orderTokenOrQuery.trim().toUpperCase();
  return DEMO_ORDERS.find(
    (o) =>
      o.orderId.toUpperCase() === q ||
      o.vehicleId.toUpperCase() === q ||
      o.registrationNo.toUpperCase() === q
  );
}
