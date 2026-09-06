// ============================================================
// TacticalNERMap: Free & Open Tactical GIS Platform
// Powered by Leaflet + OpenStreetMap tiles (NO Google key required)
// This is the reliable fallback so maps render even when the
// Google Maps billing is disabled / REQUEST_DENIED.
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Crosshair,
  X,
  Maximize2,
  Minimize2,
  MapPin,
  Radio,
} from 'lucide-react';
import {
  NER_DISTRICTS,
  ROAD_SEGMENTS,
  type Vehicle,
  type LogisticsAlert,
  type NERDistrict,
  type NERState,
  getRoadStatusColor,
  getTrafficColor,
  getAlertSeverityColor,
  getCargoIcon,
} from '../../data/nerData';
import { geocodeAddress, reverseGeocode } from '../../lib/geocodeService';
import { lockScroll, unlockScroll } from '../../lib/scrollLock';

// Fix default marker icons (leaflet's default images break under bundlers)
const iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
const defaultIcon = L.icon({
  iconUrl,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

function createDivIcon(html: string, size: [number, number] = [24, 24]) {
  return L.divIcon({
    html,
    className: '',
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2],
  });
}

export interface TacticalNERMapProps {
  vehicles?: Vehicle[];
  alerts?: LogisticsAlert[];
  selectedDistrict?: NERDistrict | null;
  selectedVehicle?: Vehicle | null;
  onSelectDistrict?: (district: NERDistrict) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  showRoads?: boolean;
  showAlerts?: boolean;
  showVehicles?: boolean;
  height?: string;
  zoomLevel?: number;
  centerPos?: [number, number];
  stateFilter?: NERState | 'ALL';
}

function SetView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Force Leaflet to recalculate its size once it becomes visible (e.g. after a
// provider switch) so the map fills the full available container height.
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => {
      map.invalidateSize();
    }, 50);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

export default function TacticalNERMap({
  vehicles = [],
  alerts = [],
  selectedDistrict,
  selectedVehicle,
  onSelectDistrict,
  onSelectVehicle,
  showRoads = true,
  showAlerts = true,
  showVehicles = true,
  height = '640px',
  zoomLevel = 7,
  centerPos = [26.1445, 91.7362],
  stateFilter = 'ALL',
}: TacticalNERMapProps) {
  const [isExtended, setIsExtended] = useState(false);

  // Lock background scroll when tactical map is extended
  useEffect(() => {
    if (isExtended) {
      lockScroll();
      return () => {
        unlockScroll();
      };
    }
    return undefined;
  }, [isExtended]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [exactLocation, setExactLocation] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const filteredDistricts = stateFilter === 'ALL' ? NER_DISTRICTS : NER_DISTRICTS.filter((d) => d.state === stateFilter);
  const filteredRoads = ROAD_SEGMENTS.filter(
    (r) => stateFilter === 'ALL' || (r as any).state === stateFilter || r.name.toLowerCase().includes(stateFilter.toLowerCase())
  );
  const visibleVehicles = vehicles.length ? vehicles : [];
  const visibleAlerts = alerts.length ? alerts : [];

  const handleLocate = useCallback(() => {
    setIsLocating(true);
    setSearchError(null);
    if (!navigator.geolocation) {
      setSearchError('Geolocation unsupported in this browser.');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setExactLocation({ lat: latitude, lng: longitude, label: 'Your Location' });
        setIsLocating(false);
      },
      (err) => {
        setSearchError('Could not fetch location: ' + err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      setSearchError(null);
      try {
        const res = await geocodeAddress(searchQuery);
        if (res && res.lat && res.lng) {
          setExactLocation({ lat: res.lat, lng: res.lng, label: res.name || searchQuery });
        } else {
          setSearchError('Location not found. Try a district town name.');
        }
      } catch {
        setSearchError('Geocoding failed. Check network.');
      }
    },
    [searchQuery]
  );

  const flyCenter: [number, number] | null = exactLocation
    ? ([exactLocation.lat, exactLocation.lng] as [number, number])
    : (centerPos as [number, number]);
  const flyZoom = exactLocation ? 12 : zoomLevel;

  const containerStyle: React.CSSProperties = isExtended
    ? { position: 'fixed', inset: 0, zIndex: 99999, width: '100vw', height: '100vh' }
    : { width: '100%', height: height === '100%' ? '100%' : height, minHeight: 350 };

  const vehicleIcon = (v: Vehicle) => {
    const color = v.priority === 'emergency' ? '#dc2626' : v.priority === 'high' ? '#ea580c' : '#0B3D6D';
    return createDivIcon(
      `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;">${
        escapeHtml(getCargoIcon(v.cargoType))
      }</div>`
    );
  };

  const alertIcon = (a: LogisticsAlert) => {
    const color = getAlertSeverityColor(a.severity);
    return createDivIcon(
      `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 2px ${color}66,0 2px 6px rgba(0,0,0,.4);"></div>`
    );
  };

  const districtIcon = (d: NERDistrict, isSelected: boolean) => {
    const color = isSelected ? '#FFC107' : '#0B3D6D';
    return createDivIcon(
      `<div style="width:${isSelected ? 20 : 14}px;height:${isSelected ? 20 : 14}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);"></div>`
    );
  };

  return (
    <div className={isExtended ? 'fixed inset-0 z-[99999] bg-white flex flex-col overflow-hidden' : 'w-full h-full flex-1 flex flex-col border-2 border-slate-300 bg-white rounded-xl overflow-hidden shadow-xl relative min-h-0'}>
      {/* Toolbar */}
      <div className="px-2 sm:px-4 py-1.5 sm:py-2.5 border-b border-slate-200 bg-white flex flex-col gap-1.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <form onSubmit={handleSearch} className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search district / town / highway"
                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button type="submit" className="gov-btn gov-btn-secondary flex-shrink-0"><MapPin size={13} /> Go</button>
            <button type="button" onClick={handleLocate} className="gov-btn flex-shrink-0" title="Locate me">
              <Crosshair size={13} /> {isLocating ? 'Locating…' : 'Locate'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setIsExtended((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-slate-300 shadow text-xs font-bold text-slate-800 hover:border-blue-300 cursor-pointer"
            title={isExtended ? 'Exit Extended Map (Esc)' : 'Extend Map to Fullscreen'}
          >
            {isExtended ? <Minimize2 size={15} className="text-blue-600" /> : <Maximize2 size={15} className="text-blue-600" />}
            <span>{isExtended ? 'Exit Extended' : 'Extend Map'}</span>
          </button>
        </div>
        {searchError && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-red-600">{searchError}</span>
            <button type="button" onClick={() => setSearchError(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div className="relative flex-1 min-h-0" style={{ overflow: 'hidden', width: '100%', height: isExtended ? 'calc(100vh - 64px)' : undefined }}>
        <MapContainer
          center={flyCenter}
          zoom={flyZoom}
          scrollWheelZoom={true}
          style={containerStyle}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <SetView center={flyCenter} zoom={flyZoom} />
          <InvalidateSize />

          {/* District markers */}
          {filteredDistricts.map((d) => (
            <Marker
              key={d.id}
              position={[d.lat, d.lng]}
              icon={districtIcon(d, selectedDistrict?.id === d.id)}
              eventHandlers={{ click: () => onSelectDistrict?.(d) }}
            >
              <Popup>
                <div style={{ fontSize: 12, minWidth: 140 }}>
                  <strong>{d.name}</strong> ({d.state})
                  <div>Connectivity: {d.connectivityScore}/100 · {d.connectivityStatus}</div>
                  <div>Terrain: {d.terrain} · Elev: {d.elevation}m</div>
                  <div>Risk: Flood {d.floodRisk} · Slide {d.landslideRisk}</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Road segments */}
          {showRoads &&
            filteredRoads.map((r) => (
              <Polyline
                key={r.id}
                positions={[
                  [r.fromLat, r.fromLng],
                  [r.toLat, r.toLng],
                ]}
                pathOptions={{
                  color: getRoadStatusColor(r.status),
                  weight: r.status === 'blocked' ? 5 : r.status === 'partially_blocked' ? 4 : 3,
                  opacity: 0.9,
                }}
              >
                <Popup>
                  <div style={{ fontSize: 12 }}>
                    <strong>{r.name}</strong>
                    <div>{r.from} ➔ {r.to} · {r.distance} km</div>
                    <div>Status: {r.status.replace('_', ' ')}</div>
                    <div>Risk: {r.riskScore}% · Congestion: {r.trafficCongestion ?? 'N/A'}</div>
                  </div>
                </Popup>
              </Polyline>
            ))}

          {/* Alerts */}
          {showAlerts &&
            visibleAlerts.map((a) => (
              <Marker key={a.id} position={[a.lat, a.lng]} icon={alertIcon(a)}>
                <Popup>
                  <div style={{ fontSize: 12, maxWidth: 220 }}>
                    <strong>{a.title}</strong>
                    <div className="text-[10px] text-slate-500">{a.location}</div>
                    <div>{a.description}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Vehicles */}
          {showVehicles &&
            visibleVehicles.map((v) => (
              <Marker
                key={v.id}
                position={[v.currentLat, v.currentLng]}
                icon={vehicleIcon(v)}
                eventHandlers={{
                  click: () => onSelectVehicle?.(v),
                }}
              >
                <Popup>
                  <div style={{ fontSize: 12, minWidth: 160 }}>
                    <strong>{v.registrationNo}</strong>
                    <div>{v.driverName} · {v.type}</div>
                    <div>{v.origin} ➔ {v.destination}</div>
                    <div>{v.speed} km/h · {v.progress}% · ETA {v.eta}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Exact search location */}
          {exactLocation && (
            <CircleMarker
              center={[exactLocation.lat, exactLocation.lng]}
              radius={10}
              pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.4, weight: 2 }}
            >
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <strong>{exactLocation.label ?? 'Exact GPS Point'}</strong>
                  <div className="font-mono">{exactLocation.lat.toFixed(5)}, {exactLocation.lng.toFixed(5)}</div>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {isExtended && (
            <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 rounded-xl shadow-xl border border-slate-200 px-3 py-2 text-[11px] font-mono text-slate-700 pointer-events-auto">
              <Radio size={12} className="inline text-red-600 mr-1" />
              Tactical OSM Feed · NER Command
            </div>
          )}
        </MapContainer>

        <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 rounded-lg shadow border border-slate-200 px-2.5 py-1.5 text-[10px] font-mono text-slate-600 pointer-events-none">
          OSM · Lat {flyCenter[0].toFixed(2)} · Lng {flyCenter[1].toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
