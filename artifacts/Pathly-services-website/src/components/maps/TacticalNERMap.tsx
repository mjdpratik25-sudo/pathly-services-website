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
  type Vehicle,
  type LogisticsAlert,
  type NERDistrict,
  type NERState,
  type FieldReport,
  getRoadStatusColor,
  getTrafficColor,
  getAlertSeverityColor,
  getCargoIcon,
} from '../../data/nerData';
import { getRoadSegments, useScenario } from '../../lib/scenarioEngine';
import { buildVehicleRoute, resolveTownCoords } from '../../lib/routeGeometry';
import { syncPlace, ensurePlace, shortPlaceName, type PlaceDescriptor } from '../../lib/placeNames';
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
  fieldReports?: FieldReport[];
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

// Mark map tile/overlay images as decorative so assistive tech ignores them
// (the semantic content is provided by markers/labels below the map).
function DecorativeTiles() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const mark = () => {
      container.querySelectorAll('img').forEach((el) => {
        el.setAttribute('alt', '');
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('role', 'presentation');
      });
    };
    mark();
    const t = window.setInterval(mark, 2000);
    return () => window.clearInterval(t);
  }, [map]);
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
  fieldReports = [],
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

  // Subscribe to the scenario engine so the drill's DRILL FEED
  // segment states render live on the tactical map.
  useScenario();

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
  const [vehicleFocus, setVehicleFocus] = useState<{ veh: Vehicle; zoom: number } | null>(null);
  const [focusPlace, setFocusPlace] = useState<PlaceDescriptor | null>(null);

  // Reverse-geocoded place name for the focused vehicle's exact position —
  // instant local fallback first, then upgraded to a precise place.
  useEffect(() => {
    if (!vehicleFocus) {
      setFocusPlace(null);
      return;
    }
    const { currentLat, currentLng } = vehicleFocus.veh;
    setFocusPlace(syncPlace(currentLat, currentLng));
    let active = true;
    ensurePlace(currentLat, currentLng).then((up) => {
      if (active) setFocusPlace(up);
    });
    return () => {
      active = false;
    };
  }, [vehicleFocus]);

  // Center & highlight the matched vehicle when one is selected from the
  // fleet list beside the map (follows live updates each telemetry tick).
  useEffect(() => {
    if (selectedVehicle) {
      setVehicleFocus({ veh: selectedVehicle, zoom: 15 });
    }
  }, [selectedVehicle]);

  // External "View Exact GPS Location on Map" action → tightest zoom.
  useEffect(() => {
    const handler = (e: Event) => {
      const veh = (e as CustomEvent<Vehicle>).detail;
      if (veh && veh.currentLat !== undefined && veh.currentLng !== undefined) {
        setVehicleFocus({ veh, zoom: 17 });
      }
    };
    window.addEventListener('pathly_navigate_vehicle', handler);
    return () => window.removeEventListener('pathly_navigate_vehicle', handler);
  }, []);

  const filteredDistricts = stateFilter === 'ALL' ? NER_DISTRICTS : NER_DISTRICTS.filter((d) => d.state === stateFilter);
  const filteredRoads = getRoadSegments().filter(
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

  const flyCenterExact: [number, number] | null = vehicleFocus
    ? ([vehicleFocus.veh.currentLat, vehicleFocus.veh.currentLng] as [number, number])
    : exactLocation
      ? ([exactLocation.lat, exactLocation.lng] as [number, number])
      : null;
  const flyCenter = (flyCenterExact ?? centerPos) as [number, number];
  const flyZoom = vehicleFocus ? vehicleFocus.zoom : exactLocation ? 12 : zoomLevel;

  const focusedVeh = vehicleFocus?.veh ?? null;
  const focusedRoute = focusedVeh ? buildVehicleRoute(focusedVeh) : null;
  const isExactVehicleFocus = vehicleFocus ? vehicleFocus.zoom >= 16 : false;
  const focusedOriginCoords = focusedVeh ? resolveTownCoords(focusedVeh.origin) : null;
  const focusedDestCoords = focusedVeh ? resolveTownCoords(focusedVeh.destination) : null;

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

  // Highlighted marker for the selected vehicle: pulsing outer ring +
  // larger icon, with the exact GPS coordinates labelled directly on the
  // marker when zoomed to the precise fix.
  const focusIcon = (v: Vehicle, exact: boolean, place?: PlaceDescriptor) => {
    const color = v.status === 'delayed' ? '#e11d48' : '#0B3D6D';
    const placeShort = place ? ` · ${shortPlaceName(place)}` : '';
    const coordsLabel = exact
      ? `<div style="text-align:center;margin-top:3px;font:bold 10px ui-monospace,monospace;color:#0B3D6D;background:rgba(255,255,255,.92);border:1px solid #cbd5e1;border-radius:5px;padding:2px 6px;white-space:nowrap;">${v.currentLat.toFixed(4)}°N, ${v.currentLng.toFixed(4)}°E${placeShort}</div>`
      : '';
    return createDivIcon(
      `<div>
        <style>@keyframes pathlyPulseR{0%{transform:scale(1);opacity:.85}100%{transform:scale(2.1);opacity:0}}</style>
        <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border-radius:50%;border:2px solid ${color};animation:pathlyPulseR 1.8s ease-out infinite;"></div>
          <div style="position:absolute;inset:4px;border-radius:50%;border:1.5px dashed ${color};opacity:.85;"></div>
          <div style="width:34px;height:34px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font-size:17px;color:#fff;font-family:ui-monospace,monospace;font-weight:bold;">${escapeHtml(getCargoIcon(v.cargoType))}</div>
        </div>
        ${coordsLabel}
      </div>`,
      [44, exact ? 76 : 44]
    );
  };

  const hubLabelIcon = (letter: string, color: string) => {
    return createDivIcon(
      `<div style="width:22px;height:22px;border-radius:50%;background:#fff;border:2px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font:bold 12px ui-monospace,monospace;color:${color};">${letter}</div>`
    );
  };

  const alertIcon = (a: LogisticsAlert) => {
    const color = getAlertSeverityColor(a.severity);
    return createDivIcon(
      `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 2px ${color}66,0 2px 6px rgba(0,0,0,.4);"></div>`
    );
  };

  // Objective 5: field-report markers (diamond pin, colour-coded by status)
  const fieldReportIcon = (r: FieldReport) => {
    const color =
      r.status === 'resolved' ? '#138808' :
      r.status === 'verified' || r.status === 'action_taken' ? '#FF9933' :
      r.status === 'under_review' ? '#2563EB' : '#dc2626';
    return createDivIcon(
      `<div style="width:20px;height:20px;transform:rotate(45deg);border-radius:4px;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"></div>`
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
          <DecorativeTiles />

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
            visibleVehicles.filter((v) => v.id !== focusedVeh?.id).map((v) => (
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

          {/* Focused vehicle: highlighted pulsing marker + planned route line */}
          {focusedVeh && showVehicles && (
            <>
              <Marker
                position={[focusedVeh.currentLat, focusedVeh.currentLng]}
                icon={focusIcon(focusedVeh, isExactVehicleFocus, focusPlace ?? undefined)}
                zIndexOffset={1000}
                eventHandlers={{
                  click: () => onSelectVehicle?.(focusedVeh),
                }}
              >
                <Popup>
                  <div style={{ fontSize: 12, minWidth: 180 }}>
                    <strong>{focusedVeh.registrationNo}</strong> · {focusedVeh.status.replace('_', ' ')}
                    <div>{focusedVeh.driverName} · {focusedVeh.type}</div>
                    <div>{focusedVeh.origin} ➔ {focusedVeh.destination}</div>
                    <div>{focusedVeh.speed} km/h · {focusedVeh.progress}% · ETA {focusedVeh.eta}</div>
                    <div className="font-mono">GPS: {focusedVeh.currentLat.toFixed(6)}°N, {focusedVeh.currentLng.toFixed(6)}°E</div>
                    {focusPlace && (
                      <div className="font-mono font-bold" style={{ color: '#0B3D6D', marginTop: 2 }}>
                        Near: {focusPlace.formatted}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>

              {focusedRoute && (
                <>
                  <Polyline
                    positions={focusedRoute.traveled}
                    pathOptions={{ color: '#059669', weight: 6, opacity: 0.95 }}
                  />
                  <Polyline
                    positions={focusedRoute.remaining}
                    pathOptions={{ color: '#64748b', weight: 4, opacity: 0.85, dashArray: '8 10' }}
                  />
                </>
              )}

              {focusedOriginCoords && (
                <Marker
                  position={[focusedOriginCoords.lat, focusedOriginCoords.lng]}
                  icon={hubLabelIcon('O', '#059669')}
                />
              )}
              {focusedDestCoords && (
                <Marker
                  position={[focusedDestCoords.lat, focusedDestCoords.lng]}
                  icon={hubLabelIcon('D', '#0B3D6D')}
                />
              )}
            </>
          )}

          {/* Field Reports — Objective 5: verified/submitted incidents on accessibility map */}
          {fieldReports.map((fr) => (
            <Marker key={fr.id} position={[fr.lat, fr.lng]} icon={fieldReportIcon(fr)}>
              <Popup>
                <div style={{ fontSize: 12, minWidth: 200, maxWidth: 260 }}>
                  <strong>{fr.title}</strong>
                  <div className="text-[10px] text-slate-500">{fr.district}, {fr.state} · {fr.timestamp}</div>
                  <div className="mt-1"><span className="font-bold">Status:</span> {fr.status.replace(/_/g, ' ')} ({fr.syncStatus})</div>
                  <div className="mt-0.5"><span className="font-bold">Severity:</span> {fr.severity}</div>
                  <div className="mt-0.5"><span className="font-bold">Field Officer:</span> {fr.officerName} ({fr.officerId})</div>
                  <div className="mt-1">{fr.description}</div>
                  {fr.actionNote && <div className="mt-1 text-emerald-700"><span className="font-bold">Action:</span> {fr.actionNote}</div>}
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
