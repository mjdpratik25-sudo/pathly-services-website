// ============================================================
// NERMap: Tactical GIS Command & Topographic Intelligence Platform
// Powered by Google Maps Platform (Smooth Terrain & Multispectral Hybrid Engine)
// Key: AIzaSyCDnSPTtAYelKvsL1b-hm3PAiGITgNTJtY
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search,
  MapPin,
  Crosshair,
  X,
  Copy,
  Check,
  Navigation,
  RotateCcw,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  Activity,
  Send,
  Building2,
  ChevronDown,
  Mountain,
  Radio,
} from 'lucide-react';
import {
  NER_DISTRICTS,
  ROAD_SEGMENTS,
  GIS_INFRASTRUCTURE,
  type Vehicle,
  type LogisticsAlert,
  type NERDistrict,
  type NERState,
  type RoadSegment,
  type GISInfrastructure,
  getCargoIcon,
  getRoadStatusColor,
  getTrafficColor,
} from '../../data/nerData';
import { geocodeAddress, reverseGeocode, searchSuggestions, type GeocodingResult } from '../../lib/geocodeService';
import { sendFast2SmsOtp } from '../../lib/smsService';
import { lockScroll, unlockScroll } from '../../lib/scrollLock';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCDnSPTtAYelKvsL1b-hm3PAiGITgNTJtY';

const POPULAR_HUBS = [
  { name: 'Guwahati Hub', lat: 26.1445, lng: 91.7362, state: 'Assam' },
  { name: 'Shillong Dispatch', lat: 25.5788, lng: 91.8933, state: 'Meghalaya' },
  { name: 'Imphal Valley', lat: 24.817, lng: 93.9368, state: 'Manipur' },
  { name: 'Agartala Port', lat: 23.8315, lng: 91.2868, state: 'Tripura' },
  { name: 'Dimapur Junction', lat: 25.9094, lng: 93.7266, state: 'Nagaland' },
  { name: 'Aizawl Corridor', lat: 23.7271, lng: 92.7176, state: 'Mizoram' },
  { name: 'Itanagar Transit', lat: 27.0844, lng: 93.6053, state: 'Arunachal' },
  { name: 'Silchar Junction', lat: 24.8333, lng: 92.7789, state: 'Assam' },
  { name: 'Tawang High Pass', lat: 27.5861, lng: 91.8594, state: 'Arunachal' }
];

export interface ExactLocationResult {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId?: string;
  types?: string[];
}

export interface NERMapProps {
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

export default function NERMap({
  vehicles = [],
  alerts = [],
  selectedDistrict,
  selectedVehicle,
  onSelectDistrict,
  onSelectVehicle,
  showRoads: initialShowRoads = true,
  showAlerts = true,
  showVehicles = true,
  height = '640px',
  zoomLevel = 7,
  centerPos = [26.1445, 91.7362],
  stateFilter = 'ALL',
}: NERMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const googleMapInstance = useRef<any>(null);
  const trafficLayerInstance = useRef<any>(null);
  const geocoderInstance = useRef<any>(null);
  const searchedMarkerRef = useRef<any>(null);
  const searchedCircleRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  // Default to smooth Google Terrain relief (never harsh)
  const [mapType, setMapType] = useState<'roadmap' | 'terrain' | 'satellite' | 'hybrid'>('terrain');
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [roadsEnabled, setRoadsEnabled] = useState(initialShowRoads);
  const [isLoaded, setIsLoaded] = useState(false);

  // Selected Entities
  const [selectedRoad, setSelectedRoad] = useState<RoadSegment | null>(null);
  const [selectedGisInfra, setSelectedGisInfra] = useState<GISInfrastructure | null>(null);
  const [trackedVehicle, setTrackedVehicle] = useState<Vehicle | null>(null);
  const [exactLocation, setExactLocation] = useState<ExactLocationResult | null>(null);

  // Layout & Extended View
  const [isExtended, setIsExtended] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Lock background scroll when map is extended to fullscreen
  useEffect(() => {
    if (isExtended) {
      lockScroll();
      return () => {
        unlockScroll();
      };
    }
    return undefined;
  }, [isExtended]);

  // Search & Presets
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showOrderPresets, setShowOrderPresets] = useState(false);
  const [showSearchPresets, setShowSearchPresets] = useState(false);
  const [vehicleSuggestions, setVehicleSuggestions] = useState<Vehicle[]>([]);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SMS Dispatch
  const [smsSending, setSmsSending] = useState(false);
  const [smsNotice, setSmsNotice] = useState<string | null>(null);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (googleMapInstance.current) {
      const cur = googleMapInstance.current.getZoom() ?? 7;
      googleMapInstance.current.setZoom(cur + 1);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (googleMapInstance.current) {
      const cur = googleMapInstance.current.getZoom() ?? 7;
      googleMapInstance.current.setZoom(Math.max(1, cur - 1));
    }
  }, []);

  const handleToggleExtended = useCallback(() => {
    setIsExtended((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExtended) setIsExtended(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    const timer = setTimeout(() => {
      if (googleMapInstance.current) {
        (window as any).google?.maps?.event?.trigger(googleMapInstance.current, 'resize');
      }
    }, 150);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isExtended]);

  // Exact Location Pin Dropper
  const setExactLocationPin = useCallback((loc: ExactLocationResult, zoom = 16) => {
    const map = googleMapInstance.current;
    const google = (window as any).google;
    if (!map || !google?.maps) return;

    setExactLocation(loc);
    map.panTo({ lat: loc.lat, lng: loc.lng });
    map.setZoom(zoom);

    if (searchedMarkerRef.current) searchedMarkerRef.current.setMap(null);
    if (searchedCircleRef.current) searchedCircleRef.current.setMap(null);

    const circle = new google.maps.Circle({
      strokeColor: '#0284c7',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#38bdf8',
      fillOpacity: 0.15,
      map,
      center: { lat: loc.lat, lng: loc.lng },
      radius: 400,
    });
    searchedCircleRef.current = circle;

    const marker = new google.maps.Marker({
      position: { lat: loc.lat, lng: loc.lng },
      map,
      title: loc.name || loc.formattedAddress,
      animation: google.maps.Animation?.DROP,
      icon: {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: '#0284c7',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 1.8,
        anchor: new google.maps.Point(12, 22),
      },
      zIndex: 9999,
    });
    searchedMarkerRef.current = marker;
  }, []);

  // Track Vehicle
  const handleTrackVehicle = useCallback((veh: Vehicle) => {
    setTrackedVehicle(veh);
    setSelectedRoad(null);
    setSelectedGisInfra(null);
    setSearchQuery(veh.orderToken || veh.registrationNo);
    setShowSuggestions(false);
    setShowOrderPresets(false);
    onSelectVehicle?.(veh);
    const map = googleMapInstance.current;
    if (map) {
      map.panTo({ lat: veh.currentLat, lng: veh.currentLng });
      map.setZoom(15);
    }
  }, [onSelectVehicle]);

  // GPS Locate Me
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const map = googleMapInstance.current;
        if (map) {
          map.panTo({ lat: latitude, lng: longitude });
          map.setZoom(16);
        }
        const res = await reverseGeocode(latitude, longitude);
        setExactLocationPin({
          name: res?.name || 'My Current Location',
          formattedAddress: res?.formattedAddress || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          lat: latitude,
          lng: longitude,
        }, 16);
        if (res?.formattedAddress) {
          setSearchQuery(res.formattedAddress);
        }
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Reset View
  const handleResetView = () => {
    setIsResetting(true);
    setSearchQuery('');
    setExactLocation(null);
    setTrackedVehicle(null);
    setSelectedRoad(null);
    setSelectedGisInfra(null);
    setVehicleSuggestions([]);
    setShowSuggestions(false);
    setShowOrderPresets(false);
    setShowSearchPresets(false);
    if (searchedMarkerRef.current) searchedMarkerRef.current.setMap(null);
    if (searchedCircleRef.current) searchedCircleRef.current.setMap(null);
    const map = googleMapInstance.current;
    if (map) {
      map.panTo({ lat: centerPos[0] || 26.1445, lng: centerPos[1] || 91.7362 });
      map.setZoom(zoomLevel || 7);
    }
    setTimeout(() => setIsResetting(false), 600);
  };

  // Load Google Maps Script
  useEffect(() => {
    let isMounted = true;

    const loadGoogleScript = async () => {
      try {
        if ((window as any).google?.maps) {
          if (isMounted) initMap((window as any).google);
          return;
        }

        const existingScript = document.getElementById('google-maps-tactical-script');
        if (existingScript) {
          existingScript.addEventListener('load', () => {
            if (isMounted && (window as any).google?.maps) initMap((window as any).google);
          });
          return;
        }

        const script = document.createElement('script');
        script.id = 'google-maps-tactical-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted && (window as any).google?.maps) initMap((window as any).google);
        };
        document.head.appendChild(script);
      } catch (err) {
        console.warn('Tactical GIS Google Maps initialization note:', err);
      }
    };

    loadGoogleScript();

    return () => {
      isMounted = false;
      markersRef.current.forEach(m => m?.setMap?.(null));
      polylinesRef.current.forEach(p => p?.setMap?.(null));
      if (searchedMarkerRef.current) searchedMarkerRef.current.setMap(null);
      if (searchedCircleRef.current) searchedCircleRef.current.setMap(null);
    };
  }, []);

  // Initialize Map
  const initMap = (google: any) => {
    if (!mapRef.current || !google?.maps) return;
    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: centerPos[0], lng: centerPos[1] },
        zoom: zoomLevel,
        mapTypeId: google.maps.MapTypeId.TERRAIN, // Smooth shaded terrain relief by default
        gestureHandling: 'greedy',
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        rotateControl: false,
        scaleControl: true,
      });

      const trafficLayer = new google.maps.TrafficLayer();
      if (trafficEnabled) trafficLayer.setMap(map);

      googleMapInstance.current = map;
      trafficLayerInstance.current = trafficLayer;
      geocoderInstance.current = new google.maps.Geocoder();

      map.addListener('click', async (e: any) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        map.panTo({ lat, lng });
        map.setZoom(16);
        const result = await reverseGeocode(lat, lng);
        if (result) {
          setExactLocationPin({
            name: result.name,
            formattedAddress: result.formattedAddress,
            lat,
            lng,
            placeId: result.placeId,
          }, 16);
          setSearchQuery(result.formattedAddress);
        } else {
          setExactLocationPin({
            name: 'Tactical GPS Point',
            formattedAddress: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
            lat,
            lng,
          }, 16);
        }
      });

      setIsLoaded(true);
    } catch (_) {}
  };

  // Sync map type
  useEffect(() => {
    if (!googleMapInstance.current || !(window as any).google?.maps) return;
    const MapTypeId = (window as any).google.maps.MapTypeId;
    const id =
      mapType === 'terrain'
        ? MapTypeId.TERRAIN
        : mapType === 'satellite'
        ? MapTypeId.SATELLITE
        : mapType === 'hybrid'
        ? MapTypeId.HYBRID
        : MapTypeId.ROADMAP;
    googleMapInstance.current.setMapTypeId(id);
  }, [mapType]);

  // Sync traffic
  useEffect(() => {
    if (!trafficLayerInstance.current || !googleMapInstance.current) return;
    trafficLayerInstance.current.setMap?.(trafficEnabled ? googleMapInstance.current : null);
  }, [trafficEnabled]);

  // Search input typing
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    const trimmed = value.trim().toLowerCase();
    if (trimmed.length >= 1) {
      const matched = vehicles.filter(
        (v) =>
          (v.orderToken && v.orderToken.toLowerCase().includes(trimmed)) ||
          v.id.toLowerCase().includes(trimmed) ||
          v.registrationNo.toLowerCase().includes(trimmed) ||
          v.driverName.toLowerCase().includes(trimmed) ||
          v.cargoDescription.toLowerCase().includes(trimmed)
      );
      setVehicleSuggestions(matched);
      setShowSuggestions(matched.length > 0);
    } else {
      setVehicleSuggestions([]);
      setShowSuggestions(false);
    }

    if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
    if (trimmed.length >= 2) {
      suggestionsTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await searchSuggestions(value);
          setSuggestions(res.slice(0, 5));
          setShowSuggestions(true);
        } catch {
          setSuggestions([]);
        }
      }, 250);
    } else {
      setSuggestions([]);
    }
  };

  // Search Submit
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // 1. Match Vehicle / Order Token
    const qLower = query.toLowerCase();
    const matchVeh = vehicles.find(
      (v) =>
        (v.orderToken && v.orderToken.toLowerCase() === qLower) ||
        v.id.toLowerCase() === qLower ||
        v.registrationNo.toLowerCase() === qLower
    );
    if (matchVeh) {
      handleTrackVehicle(matchVeh);
      return;
    }

    // 2. Match GIS Infrastructure (Bridges / Passes)
    const matchGis = GIS_INFRASTRUCTURE.find((g) => g.name.toLowerCase().includes(qLower));
    if (matchGis) {
      setSelectedGisInfra(matchGis);
      setExactLocationPin({
        name: matchGis.name,
        formattedAddress: `${matchGis.details} • ${matchGis.district}, ${matchGis.state} • Elev: ${matchGis.elevation}m ASL`,
        lat: matchGis.lat,
        lng: matchGis.lng,
      }, 16);
      setShowSuggestions(false);
      return;
    }

    // 3. Match District
    const matchDist = NER_DISTRICTS.find((d) => d.name.toLowerCase().includes(qLower));
    if (matchDist) {
      onSelectDistrict?.(matchDist);
      setExactLocationPin({
        name: matchDist.name,
        formattedAddress: `${matchDist.name} (${matchDist.majorTown}), ${matchDist.state} • Elev: ${matchDist.elevation}m ASL`,
        lat: matchDist.lat,
        lng: matchDist.lng,
      }, 15);
      setShowSuggestions(false);
      return;
    }

    // 4. Geocode Location
    setIsSearching(true);
    try {
      const geo = await geocodeAddress(query);
      if (geo) {
        setExactLocationPin({
          name: geo.name || query,
          formattedAddress: geo.formattedAddress,
          lat: geo.lat,
          lng: geo.lng,
        }, 16);
        setShowSuggestions(false);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // SMS notification sender
  const handleSendRoadAlert = async (road: RoadSegment) => {
    setSmsSending(true);
    setSmsNotice(null);
    try {
      const res = await sendFast2SmsOtp('9864011223');
      if (res.success) {
        setSmsNotice('Tactical alert dispatched to regional transport gateways.');
      } else {
        setSmsNotice(`Dispatch notice: ${res.message || 'Queued to gateway'}`);
      }
    } catch {
      setSmsNotice('Alert logged to regional logistics gateway.');
    } finally {
      setSmsSending(false);
      setTimeout(() => setSmsNotice(null), 4000);
    }
  };

  // Render Overlays on Map
  useEffect(() => {
    const map = googleMapInstance.current;
    const google = (window as any).google;
    if (!map || !isLoaded || !google?.maps) return;

    try {
      markersRef.current.forEach(m => m?.setMap?.(null));
      polylinesRef.current.forEach(p => p?.setMap?.(null));
      markersRef.current = [];
      polylinesRef.current = [];

      // A. Road Polylines
      if (roadsEnabled) {
        ROAD_SEGMENTS.forEach((road) => {
          const roadColor = trafficEnabled ? getTrafficColor(road.trafficCongestion) : getRoadStatusColor(road.status);
          const isBlocked = road.status === 'blocked';
          const isSelected = selectedRoad?.id === road.id;

          const polyline = new google.maps.Polyline({
            path: [
              { lat: road.fromLat, lng: road.fromLng },
              { lat: road.toLat, lng: road.toLng },
            ],
            geodesic: true,
            strokeColor: isSelected ? '#ffffff' : roadColor,
            strokeOpacity: 0.95,
            strokeWeight: isSelected ? 8 : isBlocked ? 6 : 5,
            map,
            zIndex: isSelected ? 50 : 10,
          });

          polyline.addListener('click', () => {
            setSelectedRoad(road);
            setTrackedVehicle(null);
            setSelectedGisInfra(null);
          });

          polylinesRef.current.push(polyline);
        });
      }

      // B. Districts
      const filteredDistricts = stateFilter === 'ALL'
        ? NER_DISTRICTS
        : NER_DISTRICTS.filter(d => d.state === stateFilter);

      filteredDistricts.forEach((district) => {
        const marker = new google.maps.Marker({
          position: { lat: district.lat, lng: district.lng },
          map,
          title: district.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: '#0B3D6D',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
          },
          zIndex: 10,
        });
        marker.addListener('click', () => {
          onSelectDistrict?.(district);
          setExactLocationPin({
            name: district.majorTown ? `${district.majorTown} (${district.name})` : district.name,
            formattedAddress: `${district.name}, ${district.state}, India • Elevation: ${district.elevation}m ASL`,
            lat: district.lat,
            lng: district.lng,
          }, 15);
        });
        markersRef.current.push(marker);
      });

      // C. Strategic GIS Infrastructure (Mountain Passes & Heavy Bridges)
      GIS_INFRASTRUCTURE.forEach((gis) => {
        const iconSymbol = gis.type === 'strategic_bridge' ? '🌉' : gis.type === 'mountain_pass' ? '⛰️' : '🚁';
        const marker = new google.maps.Marker({
          position: { lat: gis.lat, lng: gis.lng },
          map,
          title: `${gis.name} (${gis.type.replace('_', ' ')})`,
          label: {
            text: iconSymbol,
            fontSize: '14px',
          },
          zIndex: 80,
        });

        marker.addListener('click', () => {
          setSelectedGisInfra(gis);
          setExactLocationPin({
            name: gis.name,
            formattedAddress: `${gis.details} • ${gis.district}, ${gis.state} • Elev: ${gis.elevation}m ASL${
              gis.waterLevelMeters ? ` • Water Level: ${gis.waterLevelMeters}m (Max: ${gis.maxFloodTolerance}m)` : ''
            }`,
            lat: gis.lat,
            lng: gis.lng,
          }, 16);
        });

        markersRef.current.push(marker);
      });

      // D. Vehicles / Tactical Convoys
      if (showVehicles) {
        vehicles.forEach((veh) => {
          const isTracked = trackedVehicle?.id === veh.id;
          const marker = new google.maps.Marker({
            position: { lat: veh.currentLat, lng: veh.currentLng },
            map,
            title: `${veh.orderToken} - ${veh.driverName}`,
            animation: isTracked ? google.maps.Animation?.BOUNCE : undefined,
            icon: {
              path: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
              scale: isTracked ? 1.4 : 1.1,
              fillColor: isTracked ? '#2563eb' : '#0B3D6D',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
              anchor: new google.maps.Point(12, 12),
            },
            zIndex: isTracked ? 9999 : 100,
          });
          marker.addListener('click', () => {
            handleTrackVehicle(veh);
          });
          markersRef.current.push(marker);
        });
      }

      // E. Logistics Alerts
      if (showAlerts) {
        alerts.forEach((alert) => {
          const alertColor = alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ? '#d97706' : '#2563eb';
          const marker = new google.maps.Marker({
            position: { lat: alert.lat, lng: alert.lng },
            map,
            title: alert.title,
            icon: {
              path: 'M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10h2v4h-2zm0 6h2v2h-2z',
              scale: 1.2,
              fillColor: alertColor,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
              anchor: new google.maps.Point(12, 12),
            },
            zIndex: 200,
          });
          marker.addListener('click', () => {
            setExactLocationPin({
              name: alert.title,
              formattedAddress: alert.description,
              lat: alert.lat,
              lng: alert.lng,
            }, 15);
          });
          markersRef.current.push(marker);
        });
      }
    } catch (_) {}
  }, [
    isLoaded,
    roadsEnabled,
    showVehicles,
    showAlerts,
    vehicles,
    alerts,
    stateFilter,
    selectedRoad,
    trackedVehicle,
    trafficEnabled,
    onSelectDistrict,
    handleTrackVehicle,
    setExactLocationPin,
  ]);

  return (
    <div
      className={
        isExtended
          ? "fixed inset-0 z-[99999] w-screen h-screen bg-white flex flex-col p-2 sm:p-3 overflow-hidden shadow-2xl"
          : "w-full h-full flex-1 flex flex-col border-2 border-slate-300 bg-white rounded-xl overflow-hidden shadow-xl transition-all isolate"
      }
    >
      {/* External Toolbar matching exact Image 2 design */}
      <div className="px-2 sm:px-4 py-1.5 sm:py-2.5 border-b border-slate-200 bg-white text-slate-800 shadow-sm z-[15] relative flex flex-col gap-1.5 sm:gap-2.5 shrink-0">
        {/* Row 1: Search Form + Layer & Map Type Controls */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5">
          {/* Search Form */}
          <div className="pointer-events-auto flex-1 min-w-[140px] sm:min-w-[200px] w-full sm:w-auto max-w-xl relative">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-1.5">
              <div className="relative flex-1 flex items-center bg-white rounded-xl border border-slate-300 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <div className="pl-3 pr-2 text-slate-400">
                  <Search size={15} />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0 || vehicleSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Search Order Token (e.g. ORD-AS-90412), Reg, or Place..."
                  className="w-full py-2 text-xs font-medium text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none pr-7"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setExactLocation(null);
                      setTrackedVehicle(null);
                      setSelectedGisInfra(null);
                      setSuggestions([]);
                      setVehicleSuggestions([]);
                      setShowSuggestions(false);
                      if (searchedMarkerRef.current) searchedMarkerRef.current.setMap(null);
                      if (searchedCircleRef.current) searchedCircleRef.current.setMap(null);
                    }}
                    className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* GPS Locate Me Button */}
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                className={`h-9 w-9 flex items-center justify-center bg-white rounded-xl border border-slate-300 shadow-xs text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all shrink-0 cursor-pointer ${
                  isLocating ? 'animate-spin text-blue-600' : ''
                }`}
                title="Find my exact GPS location"
              >
                <Crosshair size={16} />
              </button>

              {/* Track / Search Button */}
              <button
                type="submit"
                disabled={isSearching}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                {isSearching ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Track / Search</span>
                )}
              </button>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && (vehicleSuggestions.length > 0 || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white backdrop-blur-md rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 animate-fade-in z-50">
                {vehicleSuggestions.map((veh) => (
                  <button
                    key={veh.id}
                    type="button"
                    onClick={() => handleTrackVehicle(veh)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-blue-600">{veh.orderToken}</span>
                        <span className="text-[10px] text-slate-400 font-mono">[{veh.registrationNo}]</span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate font-medium">
                        {veh.driverName} • {veh.cargoDescription}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
                      {veh.speed} km/h
                    </span>
                  </button>
                ))}
                {suggestions.map((sug, idx) => (
                  <button
                    key={`sug-${idx}`}
                    type="button"
                    onClick={() => {
                      setSearchQuery(sug.name);
                      setShowSuggestions(false);
                      setExactLocationPin({
                        name: sug.name,
                        formattedAddress: sug.formattedAddress,
                        lat: sug.lat,
                        lng: sug.lng,
                      }, 16);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2 transition-colors cursor-pointer"
                  >
                    <Mountain size={13} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-semibold text-slate-800 truncate">{sug.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{sug.formattedAddress}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Controls Group: Roads, Traffic, Styles, Reset */}
          <div
            className="pointer-events-auto flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-xs shrink-0 max-w-full overflow-x-auto scrollbar-none"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Roads Toggle */}
            <button
              type="button"
              onClick={() => setRoadsEnabled(!roadsEnabled)}
              className={`h-8 px-2.5 text-xs font-bold rounded-lg transition-all border flex items-center gap-1.5 cursor-pointer ${
                roadsEnabled
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Toggle Highway Road Network"
            >
              <span>🛣️ Roads</span>
              <span className={`text-[10px] px-1 rounded font-mono ${roadsEnabled ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                ({ROAD_SEGMENTS.length})
              </span>
            </button>

            {/* Traffic Toggle */}
            <button
              type="button"
              onClick={() => setTrafficEnabled(!trafficEnabled)}
              className={`h-8 px-2.5 text-xs font-bold rounded-lg transition-all border flex items-center gap-1.5 cursor-pointer ${
                trafficEnabled
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Toggle Live Traffic Congestion Flow"
            >
              <span className={`w-2 h-2 rounded-full ${trafficEnabled ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
              <span>Traffic</span>
            </button>

            <div className="h-4 w-px bg-slate-300 mx-0.5" />

            <button
              type="button"
              onClick={() => setMapType('terrain')}
              className={`h-8 px-2.5 text-xs rounded-lg transition-all cursor-pointer ${
                mapType === 'terrain'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              Terrain
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`h-8 px-2.5 text-xs rounded-lg transition-all cursor-pointer ${
                mapType === 'satellite'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={`h-8 px-2.5 text-xs rounded-lg transition-all cursor-pointer ${
                mapType === 'roadmap'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={handleResetView}
              disabled={isResetting}
              className="h-8 w-8 flex items-center justify-center text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-200/70 active:scale-90 transition-all cursor-pointer select-none"
              title="Refresh Map & Reset View"
              aria-label="Refresh and reset map view"
            >
              <RotateCcw size={14} className={`transition-transform duration-500 ${isResetting ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Row 2: Quick Presets (Track Orders & Transit Hubs) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 overflow-visible relative z-30">
            {/* Track Orders Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowOrderPresets((prev) => !prev);
                  setShowSearchPresets(false);
                }}
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>📦 Track Orders ({vehicles.length})</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${showOrderPresets ? 'rotate-180' : ''}`} />
              </button>

              {showOrderPresets && (
                <div
                  className="absolute top-full left-0 mt-1.5 w-72 bg-white border border-slate-300 rounded-xl shadow-2xl p-2 z-50 max-h-72 overflow-y-auto space-y-1 divide-y divide-slate-100"
                  style={{ isolation: 'isolate' }}
                >
                  <div className="px-2 py-1 text-[10px] font-mono text-blue-600 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Active Consignments</span>
                    <span className="text-emerald-600 font-bold">{vehicles.length} Live</span>
                  </div>
                  <div className="pt-1 space-y-1">
                    {vehicles.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          handleTrackVehicle(v);
                          setShowOrderPresets(false);
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-blue-50 active:bg-blue-100 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer group border border-transparent hover:border-blue-200"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-blue-600 group-hover:text-blue-700">{v.orderToken}</span>
                            <span className="text-[10px] text-slate-500 font-mono">[{v.registrationNo}]</span>
                          </div>
                          <div className="text-[11px] text-slate-700 font-medium mt-0.5">{v.driverName} • <span className="text-slate-500">{v.cargoDescription}</span></div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">{v.speed} km/h</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Transit Hubs & Ports Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSearchPresets((prev) => !prev);
                  setShowOrderPresets(false);
                }}
                className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Building2 size={13} className="text-blue-600" />
                <span>Transit Hubs & Ports</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${showSearchPresets ? 'rotate-180' : ''}`} />
              </button>

              {showSearchPresets && (
                <div
                  className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-300 rounded-xl shadow-2xl p-2 z-50 max-h-72 overflow-y-auto space-y-1 divide-y divide-slate-100"
                  style={{ isolation: 'isolate' }}
                >
                  <div className="px-2 py-1 text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                    Major Regional Terminals
                  </div>
                  <div className="pt-1 space-y-1">
                    {POPULAR_HUBS.map((hub) => (
                      <button
                        key={hub.name}
                        type="button"
                        onClick={() => {
                          setExactLocationPin({
                            name: hub.name,
                            formattedAddress: `${hub.name}, ${hub.state}, India`,
                            lat: hub.lat,
                            lng: hub.lng,
                          }, 17);
                          setShowSearchPresets(false);
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-xs flex items-center justify-between text-slate-700 transition-colors cursor-pointer group border border-transparent hover:border-slate-300"
                      >
                        <span className="font-bold text-slate-900 group-hover:text-blue-600">📍 {hub.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono font-medium">{hub.state}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Telemetry status info */}
          <div className="hidden sm:flex items-center gap-2.5 text-[11px] text-slate-500 font-mono select-none">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live GPS Active</span>
            </span>
            <span className="text-slate-300">•</span>
            <span>Active Fleet: <strong className="text-blue-600">{vehicles.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Map Canvas Area */}
      <div
        className="relative w-full overflow-hidden flex-1 min-h-0 isolate"
        style={{
          height: isExtended ? '100%' : (height === '100%' || !height ? '100%' : height),
          minHeight: isExtended ? 0 : (height === '100%' ? 350 : 450),
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          width: '100%',
          border: isExtended ? 'none' : '1px solid #E2E8F0',
          borderRadius: isExtended ? '0' : '0.5rem',
        }}
      >
        <div ref={mapRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />

        {/* Top-Right: Extend Map Button */}
        <div className="absolute top-3 right-3 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={handleToggleExtended}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md rounded-xl border border-slate-300 shadow-xl text-xs font-bold text-slate-800 hover:text-blue-600 hover:border-blue-300 hover:bg-slate-50 transition-all cursor-pointer select-none"
            title={isExtended ? 'Exit Extended Map (Esc)' : 'Extend Map to Fullscreen'}
          >
            {isExtended ? (
              <>
                <Minimize2 size={15} className="text-blue-600" />
                <span>Exit Extended</span>
              </>
            ) : (
              <>
                <Maximize2 size={15} className="text-blue-600" />
                <span>Extend Map</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom-Right: Dedicated Zoom In and Out Buttons */}
        <div className="absolute bottom-4 right-4 z-30 pointer-events-auto flex flex-col items-center bg-white shadow-2xl rounded-xl border-2 border-slate-300 overflow-hidden divide-y divide-slate-200 select-none">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-10 flex items-center justify-center text-slate-800 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer active:scale-90 font-bold"
            title="Zoom In (+)"
            aria-label="Zoom in"
          >
            <Plus size={19} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-10 flex items-center justify-center text-slate-800 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer active:scale-90 font-bold"
            title="Zoom Out (-)"
            aria-label="Zoom out"
          >
            <Minus size={19} strokeWidth={2.5} />
          </button>
        </div>

        {/* Bottom Inspector Card for Selected Entity */}
        {selectedGisInfra && (
          <div
            className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3.5 shadow-xl text-slate-800 animate-fade-in space-y-2"
            style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 30, maxWidth: 'calc(100% - 24px)', width: 340 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-xs uppercase">
                  {selectedGisInfra.type.replace('_', ' ')}
                </span>
                <h4 className="font-bold text-xs text-slate-800 mt-1">{selectedGisInfra.name}</h4>
              </div>
              <button onClick={() => setSelectedGisInfra(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                <X size={14} />
              </button>
            </div>
            <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">{selectedGisInfra.details}</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[9px] text-slate-400 block">Elevation</span>
                <span className="font-bold text-blue-600">{selectedGisInfra.elevation}m ASL</span>
              </div>
              {selectedGisInfra.waterLevelMeters ? (
                <div className="p-1.5 rounded bg-sky-50 border border-sky-200">
                  <span className="text-[9px] text-sky-600 block">Flood Water Level</span>
                  <span className="font-bold text-sky-900">{selectedGisInfra.waterLevelMeters}m</span>
                </div>
              ) : (
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[9px] text-slate-400 block">Status</span>
                  <span className="font-bold text-emerald-600 uppercase">{selectedGisInfra.status}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedRoad && (
          <div
            className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3.5 shadow-xl text-slate-800 animate-fade-in space-y-2"
            style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 30, maxWidth: 'calc(100% - 24px)', width: 340 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-xs text-blue-600">{selectedRoad.name}</span>
                <h4 className="font-bold text-xs text-slate-800 mt-0.5">{selectedRoad.from} ➔ {selectedRoad.to}</h4>
              </div>
              <button onClick={() => setSelectedRoad(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Length</span>
                <span className="font-bold text-slate-800">{selectedRoad.distance} km</span>
              </div>
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Condition</span>
                <span className="font-bold text-slate-800 capitalize">{selectedRoad.condition}%</span>
              </div>
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Risk</span>
                <span className={`font-bold capitalize ${selectedRoad.riskScore > 60 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {selectedRoad.riskScore > 60 ? 'High' : 'Low'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSendRoadAlert(selectedRoad)}
              disabled={smsSending}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send size={12} />
              <span>{smsSending ? 'Dispatching...' : 'Dispatch Corridor Alert'}</span>
            </button>
          </div>
        )}

        {/* SMS notice */}
        {smsNotice && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl font-mono text-xs font-bold flex items-center gap-2 animate-bounce">
            <Check size={15} />
            <span>{smsNotice}</span>
          </div>
        )}
      </div>
    </div>
  );
}
