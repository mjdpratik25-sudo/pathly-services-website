// ============================================================
// GoogleNERMap: Bulletproof Google Maps Platform Component with Exact Location Search
// Uses free Nominatim/OSRM geocoding as primary engine (no billing required)
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
  Compass,
  Building2,
  Layers,
  Loader2,
  ChevronDown,
  Maximize2,
  Minimize2,
  Plus,
  Minus
} from 'lucide-react';
import {
  NER_DISTRICTS,
  ROAD_SEGMENTS,
  GIS_INFRASTRUCTURE,
  NER_LOCALITIES,
  type Vehicle,
  type LogisticsAlert,
  type NERDistrict,
  type NERState,
  type RoadSegment,
  getCargoIcon,
  getRoadStatusColor,
  getTrafficColor
} from '../../data/nerData';
import NERMap from './NERMap';
import TacticalNERMap from './TacticalNERMap';
import { lockScroll, unlockScroll } from '../../lib/scrollLock';
import { geocodeAddress, reverseGeocode, searchSuggestions, type GeocodingResult } from '../../lib/geocodeService';
import { Activity, Gauge, Send } from 'lucide-react';
import { sendFast2SmsOtp } from '../../lib/smsService';

export interface ExactLocationResult {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId?: string;
  types?: string[];
}

interface GoogleNERMapProps {
  vehicles?: Vehicle[];
  alerts?: LogisticsAlert[];
  selectedDistrict?: NERDistrict | null;
  selectedVehicle?: Vehicle | null;
  onSelectDistrict?: (district: NERDistrict) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onLocationSelected?: (location: ExactLocationResult) => void;
  showRoads?: boolean;
  showAlerts?: boolean;
  showVehicles?: boolean;
  enableSearch?: boolean;
  initialLocation?: ExactLocationResult | null;
  height?: string;
  zoomLevel?: number;
  centerPos?: [number, number];
  stateFilter?: NERState | 'ALL';
  isSidebarOpen?: boolean;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

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

export default function GoogleNERMap(props: GoogleNERMapProps) {
  const {
    vehicles = [],
    alerts = [],
    selectedDistrict,
    selectedVehicle,
    onSelectDistrict,
    onSelectVehicle,
    onLocationSelected,
    showRoads = true,
    showAlerts = true,
    showVehicles = true,
    enableSearch = true,
    height = '640px',
    zoomLevel = 7,
    centerPos = [26.1, 92.8],
    stateFilter = 'ALL',
    isSidebarOpen = true,
  } = props;

  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const googleMapInstance = useRef<any>(null);
  const trafficLayerInstance = useRef<any>(null);
  const geocoderInstance = useRef<any>(null);
  const searchedMarkerRef = useRef<any>(null);
  const searchedCircleRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);

  const [mapType, setMapType] = useState<'roadmap' | 'terrain' | 'satellite' | 'hybrid'>('roadmap');
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [roadsEnabled, setRoadsEnabled] = useState(showRoads);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Selected road for inspection
  const [selectedRoad, setSelectedRoad] = useState<RoadSegment | null>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsNotice, setSmsNotice] = useState<string | null>(null);

  // Selected Order / Consignment for tracking
  const [trackedVehicle, setTrackedVehicle] = useState<Vehicle | null>(null);
  const [showOrderPresets, setShowOrderPresets] = useState(false);
  const [isExtended, setIsExtended] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Zoom and Extended View Handlers
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
      if (e.key === 'Escape' && isExtended) {
        setIsExtended(false);
      }
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

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [exactLocation, setExactLocation] = useState<ExactLocationResult | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [vehicleSuggestions, setVehicleSuggestions] = useState<Vehicle[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef('');
  const [showSearchPresets, setShowSearchPresets] = useState(false);

  // 1. Safely Load Google Maps Script
  useEffect(() => {
    let isMounted = true;

    const loadGoogleScript = async () => {
      try {
        if ((window as any).google?.maps) {
          if (isMounted) initMap((window as any).google);
          return;
        }

        const scriptId = 'google-maps-script-tag';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        if (script && !script.src.includes(GOOGLE_MAPS_API_KEY)) {
          script.remove();
          script = null as any;
          delete (window as any).google;
        }

        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        }

        script.onload = () => {
          if (isMounted && (window as any).google?.maps) {
            initMap((window as any).google);
          }
        };

        script.onerror = () => {
          if (isMounted) setLoadFailed(true);
        };
      } catch (err) {
        if (isMounted) setLoadFailed(true);
      }
    };

    loadGoogleScript();

    // Catch Google Maps API auth failure (e.g. invalid key, referrer restriction, quota)
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps API authentication failed (gm_authFailure). Falling back to Tactical GIS map.');
      if (isMounted) {
        googleMapInstance.current = null;
        setLoadFailed(true);
      }
    };

    // Fallback trigger: if Google Maps hasn't initialized within 12s (forgiving for slow networks),
    // switch to visible Leaflet NERMap. This timer is cleared in initMap once Google loads.
    const fallbackTimeout = window.setTimeout(() => {
      if (isMounted && !googleMapInstance.current) {
        console.warn('Google Maps did not initialize within 12s. Falling back to Tactical GIS map.');
        setLoadFailed(true);
      }
    }, 12000);
    fallbackTimeoutRef.current = fallbackTimeout;

    // Fallback trigger: watch for Google's injected "didn't load Google Maps correctly" error banner.
    // We ONLY react to the definitive error container class that Google adds on a real render/auth failure,
    // and never to arbitrary page text (which caused false positives / transient falls backs).
    let failObserver: MutationObserver | null = null;
    const observerTarget = mapRef.current;
    if (observerTarget) {
      failObserver = new MutationObserver(() => {
        if (!isMounted || googleMapInstance.current) return;
        const hasErrContainer = observerTarget.querySelector('.gm-err-container, .gm-err-message');
        const text = observerTarget.textContent || '';
        const authErrored = /didn'?t load Google Maps correctly/i.test(text) || /This page can'?t load Google Maps correctly/i.test(text);
        if (hasErrContainer && authErrored) {
          console.warn('Google Maps render error detected. Falling back to Tactical GIS map.');
          setLoadFailed(true);
        }
      });
      failObserver.observe(observerTarget, { childList: true, subtree: true, characterData: true });
    }

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimeout);
      if (fallbackTimeoutRef.current) window.clearTimeout(fallbackTimeoutRef.current);
      failObserver?.disconnect();
      markersRef.current.forEach(m => m?.setMap?.(null));
      polylinesRef.current.forEach(p => p?.setMap?.(null));
      if (searchedMarkerRef.current) searchedMarkerRef.current.setMap(null);
      if (searchedCircleRef.current) searchedCircleRef.current.setMap(null);
    };
  }, []);

  // Set up exact location pinpoint and info window (direct zoom in to exact location)
  const setExactLocationPin = useCallback((loc: ExactLocationResult, zoom = 17) => {
    const map = googleMapInstance.current;
    const google = (window as any).google;
    if (!map || !google?.maps) return;

    setExactLocation(loc);
    setSearchError(null);
    onLocationSelected?.(loc);

    // Smoothly fly to exact point and zoom in directly
    map.panTo({ lat: loc.lat, lng: loc.lng });
    map.setZoom(zoom);

    // Remove existing searched marker/circle
    if (searchedMarkerRef.current) {
      searchedMarkerRef.current.setMap(null);
    }
    if (searchedCircleRef.current) {
      searchedCircleRef.current.setMap(null);
    }

    // High accuracy radar radius circle
    const circle = new google.maps.Circle({
      strokeColor: '#dc2626',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#ef4444',
      fillOpacity: 0.15,
      map,
      center: { lat: loc.lat, lng: loc.lng },
      radius: 400,
    });
    searchedCircleRef.current = circle;

    // Glowing exact pinpoint marker
    const marker = new google.maps.Marker({
      position: { lat: loc.lat, lng: loc.lng },
      map,
      title: loc.name || loc.formattedAddress,
      animation: google.maps.Animation?.DROP,
      icon: {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: '#dc2626',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 1.8,
        anchor: new google.maps.Point(12, 22),
      },
      zIndex: 9999,
    });

    searchedMarkerRef.current = marker;

    // Click on marker opens coordinates
    marker.addListener('click', () => {
      onLocationSelected?.(loc);
      setExactLocation(loc);
    });
  }, [onLocationSelected]);

  const initMap = (google: any) => {
    if (!mapRef.current || !google?.maps) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: centerPos[0], lng: centerPos[1] },
        zoom: zoomLevel,
        mapTypeId: mapType,
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
      infoWindowRef.current = new google.maps.InfoWindow();
      geocoderInstance.current = new google.maps.Geocoder();

      // Google Maps loaded successfully — cancel the fallback timer so it can never flip to Tactical GIS.
      if (fallbackTimeoutRef.current) {
        window.clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }

      google.maps.event.trigger(map, 'resize');

      // Note: Google Places Autocomplete requires billing.
      // We use free Nominatim search suggestions instead (handled in React state).

      // Map click listener: directly zoom in to exact location of click and drop pin
      map.addListener('click', async (e: any) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const targetZoom = 16;

        // Smoothly fly and zoom into the exact clicked point
        map.panTo({ lat, lng });
        map.setZoom(targetZoom);

        // Reverse geocode to show address details
        const result = await reverseGeocode(lat, lng);
        if (result) {
          setExactLocationPin({
            name: result.name,
            formattedAddress: result.formattedAddress,
            lat,
            lng,
            placeId: result.placeId,
          }, targetZoom);
          setSearchQuery(result.formattedAddress);
        } else {
          setExactLocationPin({
            name: 'Exact GPS Point',
            formattedAddress: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
            lat,
            lng,
          }, targetZoom);
        }
      });

      setIsLoaded(true);
    } catch (err) {
      setLoadFailed(true);
    }
  };

  // Track a specific vehicle / order token
  const handleTrackVehicle = useCallback((veh: Vehicle) => {
    setTrackedVehicle(veh);
    setExactLocation(null);
    setSelectedRoad(null);
    setSearchQuery(veh.orderToken || veh.registrationNo);
    setShowSuggestions(false);
    setSearchError(null);
    onSelectVehicle?.(veh);

    const map = googleMapInstance.current;
    if (map) {
      map.panTo({ lat: veh.currentLat, lng: veh.currentLng });
      map.setZoom(15);
    }
  }, [onSelectVehicle]);

  // Debounced search suggestions via free Nominatim + Instant Vehicle Order Token Matching
  const handleSearchInput = useCallback((value: string) => {
    latestQueryRef.current = value.trim().toLowerCase();
    setSearchQuery(value);
    if (searchError) setSearchError(null);

    const trimmed = latestQueryRef.current;

    // 1. Instant match vehicles by Order Token, ID, Reg No, Driver Name, or Cargo
    let matchedVehicles: Vehicle[] = [];
    if (trimmed.length >= 1) {
      matchedVehicles = vehicles.filter(v =>
        (v.orderToken && v.orderToken.toLowerCase().includes(trimmed)) ||
        v.id.toLowerCase().includes(trimmed) ||
        v.registrationNo.toLowerCase().includes(trimmed) ||
        v.driverName.toLowerCase().includes(trimmed) ||
        v.cargoDescription.toLowerCase().includes(trimmed) ||
        v.cargoType.toLowerCase().includes(trimmed)
      );
      setVehicleSuggestions(matchedVehicles);
    } else {
      setVehicleSuggestions([]);
    }

    if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);

    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(trimmed.length >= 1 && matchedVehicles.length > 0);
      return;
    }

    setShowSuggestions(true);

    suggestionsTimeoutRef.current = setTimeout(async () => {
      const results = await searchSuggestions(value.trim());
      // Discard stale results if the query changed while we were debouncing/fetching
      if (trimmed !== latestQueryRef.current) return;
      setSuggestions(results);
    }, 350);
  }, [searchError, vehicles]);

  // Select a suggestion and directly zoom in to exact location
  const handleSelectSuggestion = async (result: GeocodingResult) => {
    setTrackedVehicle(null);
    setSearchQuery(result.formattedAddress);
    setSuggestions([]);
    setVehicleSuggestions([]);
    setShowSuggestions(false);

    // If coordinates are already known, directly zoom into exact location point
    if (result.lat && result.lng && result.lat !== 0 && result.lng !== 0) {
      setExactLocationPin({
        name: result.name,
        formattedAddress: result.formattedAddress,
        lat: result.lat,
        lng: result.lng,
        placeId: result.placeId,
        types: result.types,
      }, 17);
      return;
    }

    // If place needs resolution via Google Maps Geocoder API key
    const google = (window as any).google;
    if (google?.maps?.Geocoder && result.placeId) {
      const geocoder = geocoderInstance.current || new google.maps.Geocoder();
      geocoder.geocode({ placeId: result.placeId }, (res: any, status: any) => {
        if (status === 'OK' && res?.[0]) {
          const loc = res[0].geometry.location;
          const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
          const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
          setExactLocationPin({
            name: result.name,
            formattedAddress: res[0].formatted_address || result.formattedAddress,
            lat,
            lng,
            placeId: result.placeId,
            types: res[0].types,
          }, 17);
          return;
        }
      });
    }

    const geo = await geocodeAddress(result.formattedAddress);
    if (geo) {
      setExactLocationPin(geo, 17);
    }
  };

  // Handle manual search submit: Geocodes directly using Google Maps API key to zoom into exact location
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Clean query from added suffixes like " • Elevation: 15m" or "[district]"
    const cleanQuery = query.split('•')[0].replace(/\[.*?\]/g, '').trim();

    setIsSearching(true);
    setSearchError(null);
    setShowSuggestions(false);

    // 1. Check if user entered an Order Token or Vehicle ID
    const qLower = cleanQuery.toLowerCase();
    const matchedVehicle = vehicles.find(v =>
      (v.orderToken && v.orderToken.toLowerCase() === qLower) ||
      v.id.toLowerCase() === qLower ||
      v.registrationNo.toLowerCase() === qLower ||
      v.registrationNo.toLowerCase().replace(/[\s-]/g, '') === qLower.replace(/[\s-]/g, '')
    );

    if (matchedVehicle) {
      setIsSearching(false);
      handleTrackVehicle(matchedVehicle);
      return;
    }

    // 2. Check if user typed coordinates like "26.1445, 91.7362"
    const matches = cleanQuery.match(/([-+]?\d{1,3}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)/);
    if (matches && matches.length >= 3) {
      const lat = parseFloat(matches[1]);
      const lng = parseFloat(matches[2]);

      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const result = await reverseGeocode(lat, lng);
        setIsSearching(false);
        if (result) {
          setExactLocationPin({
            name: result.name,
            formattedAddress: result.formattedAddress,
            lat,
            lng,
            placeId: result.placeId,
          }, 17);
        } else {
          setExactLocationPin({
            name: 'Exact GPS Coordinate',
            formattedAddress: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            lat,
            lng,
          }, 17);
        }
        return;
      }
    }

    // 3. Fast match in local NER dataset first (localities, districts, infrastructure)
    const localMatch = await geocodeAddress(cleanQuery);
    if (localMatch) {
      setIsSearching(false);
      setExactLocationPin(localMatch, 17);
      return;
    }

    // 4. Geocode address / place name using Google Maps Platform API Key
    const google = (window as any).google;
    if (google?.maps?.Geocoder) {
      try {
        const geocoder = geocoderInstance.current || new google.maps.Geocoder();
        const response: any = await new Promise((resolve) => {
          geocoder.geocode(
            {
              address: cleanQuery,
              componentRestrictions: { country: 'IN' },
            },
            (results: any, status: any) => {
              if (status === 'OK' && results && results[0]) {
                resolve(results[0]);
              } else {
                // Fallback attempt without regional restriction
                geocoder.geocode({ address: cleanQuery }, (res2: any, stat2: any) => {
                  if (stat2 === 'OK' && res2 && res2[0]) {
                    resolve(res2[0]);
                  } else {
                    resolve(null);
                  }
                });
              }
            }
          );
        });

        if (response) {
          const loc = response.geometry.location;
          const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
          const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
          setIsSearching(false);
          setExactLocationPin({
            name: response.formatted_address?.split(',')[0] || query,
            formattedAddress: response.formatted_address || query,
            lat,
            lng,
            placeId: response.place_id,
            types: response.types,
          }, 17);
          return;
        }
      } catch (err) {
        console.warn('Google Maps Geocoder lookup failed, using fallback:', err);
      }
    }

    // 4. Fallback forward geocode via local high-precision NER localities / Nominatim
    const result = await geocodeAddress(query);
    setIsSearching(false);
    if (result) {
      setExactLocationPin({
        name: result.name,
        formattedAddress: result.formattedAddress,
        lat: result.lat,
        lng: result.lng,
        placeId: result.placeId,
        types: result.types,
      }, 17);
    } else {
      setSearchError('No exact location found. Try adding city/town or exact GPS coordinates.');
    }
  };

  // Find My Exact GPS Location (uses free Nominatim reverse geocoding)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setSearchError(null);
    setShowSuggestions(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const result = await reverseGeocode(lat, lng);
        setIsLocating(false);
        if (result) {
          setExactLocationPin({
            name: 'My Current Location',
            formattedAddress: result.formattedAddress,
            lat,
            lng,
          }, 16);
          setSearchQuery(result.formattedAddress);
        } else {
          setExactLocationPin({
            name: 'My Current Location',
            formattedAddress: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
            lat,
            lng,
          }, 16);
        }
      },
      (err) => {
        setIsLocating(false);
        setSearchError('Unable to retrieve current location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Clear exact location
  const handleClearLocation = () => {
    setExactLocation(null);
    setSearchQuery('');
    setSearchError(null);
    if (searchedMarkerRef.current) {
      searchedMarkerRef.current.setMap(null);
      searchedMarkerRef.current = null;
    }
    if (searchedCircleRef.current) {
      searchedCircleRef.current.setMap(null);
      searchedCircleRef.current = null;
    }
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  };

  // Reset to default region view and refresh map state completely
  const handleResetView = () => {
    setIsResetting(true);

    // 1. Clear searched location pin, search radar circle, and info windows
    handleClearLocation();
    setSearchQuery('');
    setSuggestions([]);
    setVehicleSuggestions([]);
    setShowSuggestions(false);
    setShowOrderPresets(false);
    setShowSearchPresets(false);
    setTrackedVehicle(null);
    setSelectedRoad(null);

    // 2. Pan and reset Google Maps zoom & force fresh tile render
    if (googleMapInstance.current) {
      const map = googleMapInstance.current;
      const targetLat = centerPos && centerPos[0] ? centerPos[0] : 26.1445;
      const targetLng = centerPos && centerPos[1] ? centerPos[1] : 91.7362;
      const targetZoom = zoomLevel || 7;

      map.panTo({ lat: targetLat, lng: targetLng });
      map.setZoom(targetZoom);

      const google = (window as any).google;
      if (google?.maps?.event) {
        google.maps.event.trigger(map, 'resize');
      }
    }

    // Stop spin animation after clean transition
    setTimeout(() => {
      setIsResetting(false);
    }, 600);
  };

  // Copy GPS Coordinates
  const handleCopyCoords = () => {
    if (!exactLocation) return;
    const text = `${exactLocation.lat.toFixed(6)}, ${exactLocation.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // 2. Handle Map Type & Traffic
  useEffect(() => {
    if (!googleMapInstance.current || !(window as any).google?.maps) return;
    const MapTypeId = (window as any).google.maps.MapTypeId;
    const id =
      mapType === 'terrain' ? MapTypeId.TERRAIN :
        mapType === 'satellite' ? MapTypeId.SATELLITE :
          mapType === 'hybrid' ? MapTypeId.HYBRID :
            MapTypeId.ROADMAP;
    googleMapInstance.current.setMapTypeId(id);
  }, [mapType]);

  useEffect(() => {
    if (!trafficLayerInstance.current || !googleMapInstance.current) return;
    trafficLayerInstance.current.setMap?.(trafficEnabled ? googleMapInstance.current : null);
  }, [trafficEnabled]);

  // Re-render the map cleanly whenever the sidebar expands/collapses and resizes the content area
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!map) return;
    (window as any).google?.maps?.event?.trigger(map, 'resize');
  }, [isSidebarOpen]);

  // Fly the map to a new controlling center/zoom ONLY when center or zoom explicitly changes from props
  const centerLat = centerPos[0];
  const centerLng = centerPos[1];
  const lastProgrammaticCenter = useRef<[number, number]>([centerLat, centerLng]);
  const lastProgrammaticZoom = useRef<number>(zoomLevel);

  useEffect(() => {
    const map = googleMapInstance.current;
    if (!map || !isLoaded) return;
    if (
      lastProgrammaticCenter.current[0] === centerLat &&
      lastProgrammaticCenter.current[1] === centerLng &&
      lastProgrammaticZoom.current === zoomLevel
    ) {
      return;
    }
    lastProgrammaticCenter.current = [centerLat, centerLng];
    lastProgrammaticZoom.current = zoomLevel;
    (window as any).google?.maps?.event?.trigger(map, 'resize');
    map.panTo({ lat: centerLat, lng: centerLng });
    map.setZoom(zoomLevel);
  }, [centerLat, centerLng, zoomLevel, isLoaded]);

  // When selectedDistrict changes (e.g. searching Agartala, Shillong, Guwahati), fly map to exact location
  useEffect(() => {
    const map = googleMapInstance.current;
    if (map && selectedDistrict && isLoaded) {
      setExactLocationPin({
        name: selectedDistrict.majorTown ? `${selectedDistrict.majorTown} (${selectedDistrict.name})` : selectedDistrict.name,
        formattedAddress: `${selectedDistrict.name}, ${selectedDistrict.state}, India • Elevation: ${selectedDistrict.elevation}m ASL`,
        lat: selectedDistrict.lat,
        lng: selectedDistrict.lng,
      }, 16);
    }
  }, [selectedDistrict, isLoaded, setExactLocationPin]);

  // Global search & navigation listener: directly zoom in to any searched place from any search bar
  useEffect(() => {
    const handleGlobalNav = (e: Event) => {
      const ce = e as CustomEvent<{ lat?: number; lng?: number; zoom?: number; name?: string; district?: string; formattedAddress?: string }>;
      if (ce.detail?.lat && ce.detail?.lng) {
        setExactLocationPin({
          name: ce.detail.name || 'Selected Location',
          formattedAddress: ce.detail.formattedAddress || (ce.detail.district ? `${ce.detail.name || ''}, ${ce.detail.district}` : `${ce.detail.lat.toFixed(5)}, ${ce.detail.lng.toFixed(5)}`),
          lat: ce.detail.lat,
          lng: ce.detail.lng,
        }, ce.detail.zoom || 17);
      }
    };
    window.addEventListener('pathly_navigate_location', handleGlobalNav);
    return () => window.removeEventListener('pathly_navigate_location', handleGlobalNav);
  }, [setExactLocationPin]);

  // 3. Render Markers & Polylines Safely
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
          });

          polylinesRef.current.push(polyline);
        });
      }

      // B. District Markers
      NER_DISTRICTS
        .filter((d) => stateFilter === 'ALL' || d.state === stateFilter)
        .forEach((d) => {
          const color = d.connectivityScore >= 75 ? '#059669' : d.connectivityScore >= 50 ? '#d97706' : '#e11d48';
          const isSelected = selectedDistrict?.id === d.id;

          const marker = new google.maps.Marker({
            position: { lat: d.lat, lng: d.lng },
            map,
            title: d.name,
            icon: {
              path: google.maps.SymbolPath?.CIRCLE || 0,
              scale: isSelected ? 8 : 5,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });

          marker.addListener('click', () => {
            onSelectDistrict?.(d);
            setExactLocationPin({
              name: d.name,
              formattedAddress: `${d.name} (${d.majorTown}), ${d.state}, India • Elevation: ${d.elevation}m ASL`,
              lat: d.lat,
              lng: d.lng,
            }, 16);
          });

          markersRef.current.push(marker);
        });

      // C. Vehicles
      if (showVehicles) {
        vehicles.forEach((v) => {
          const marker = new google.maps.Marker({
            position: { lat: v.currentLat, lng: v.currentLng },
            map,
            title: `${v.registrationNo} (${v.driverName})`,
            icon: {
              path: google.maps.SymbolPath?.FORWARD_CLOSED_ARROW || 1,
              scale: 5,
              fillColor: v.status === 'delayed' ? '#d97706' : '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
              rotation: v.heading || 45,
            },
          });

          marker.addListener('click', () => {
            handleTrackVehicle(v);
          });

          markersRef.current.push(marker);
        });
      }

      // D. Alerts
      if (showAlerts) {
        alerts.forEach((alt) => {
          const marker = new google.maps.Marker({
            position: { lat: alt.lat, lng: alt.lng },
            map,
            title: alt.title,
            label: {
              text: '⚠️',
              fontSize: '14px',
            },
          });

          markersRef.current.push(marker);
        });
      }

      // E. Strategic GIS Infrastructure (Bridges, Mountain Passes, Helipads)
      GIS_INFRASTRUCTURE.forEach((gis) => {
        const iconSymbol = gis.type === 'strategic_bridge' ? '🌉' : gis.type === 'mountain_pass' ? '⛰️' : gis.type === 'emergency_helipad' ? '🚁' : '⛽';
        const marker = new google.maps.Marker({
          position: { lat: gis.lat, lng: gis.lng },
          map,
          title: `${gis.name} (${gis.type.replace('_', ' ')})`,
          label: {
            text: iconSymbol,
            fontSize: '13px',
          },
          zIndex: 80,
        });

        marker.addListener('click', () => {
          setExactLocationPin({
            name: gis.name,
            formattedAddress: `${gis.details} • ${gis.district}, ${gis.state} • Elev: ${gis.elevation}m ASL${gis.waterLevelMeters ? ` • Water Level: ${gis.waterLevelMeters}m (Max: ${gis.maxFloodTolerance}m)` : ''}`,
            lat: gis.lat,
            lng: gis.lng,
          }, 17);
        });

        markersRef.current.push(marker);
      });
    } catch (err) {
      console.warn('Google Maps overlay warning:', err);
    }
  }, [isLoaded, vehicles, alerts, roadsEnabled, showVehicles, showAlerts, selectedDistrict, selectedVehicle, trafficEnabled, selectedRoad, stateFilter, setExactLocationPin]);

  // Initial location prop listener
  useEffect(() => {
    if (props.initialLocation && isLoaded) {
      setExactLocationPin(props.initialLocation, props.zoomLevel || 16);
    }
  }, [props.initialLocation, isLoaded, setExactLocationPin, props.zoomLevel]);

  // If Google Maps fails or is blocked, seamlessly fallback to the OSM tactical map
  if (loadFailed) {
    return <TacticalNERMap {...props} />;
  }

  return (
    <div
      className={
        isExtended
          ? "fixed inset-0 z-[99999] w-screen h-screen bg-white flex flex-col p-0 sm:p-3 overflow-hidden shadow-2xl"
          : "w-full h-full flex-1 flex flex-col border-2 border-slate-300 bg-white rounded-xl overflow-hidden shadow-xl transition-all isolate"
      }
    >
      {/* External Toolbar matching exact design */}
      <div className="px-2 sm:px-4 py-1.5 sm:py-2.5 border-b border-slate-200 bg-white text-slate-800 shadow-sm z-[15] relative flex flex-col gap-1.5 sm:gap-2.5 shrink-0">
        {/* Row 1: Search Form + Layer & Map Type Controls */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5">
          {/* Search Form */}
          {enableSearch && (
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
                        handleClearLocation();
                        setTrackedVehicle(null);
                        setSuggestions([]);
                        setVehicleSuggestions([]);
                        setShowSuggestions(false);
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
                      onClick={() => handleSelectSuggestion(sug)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2 transition-colors cursor-pointer"
                    >
                      <MapPin size={13} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-semibold text-slate-800 truncate">{sug.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{sug.formattedAddress}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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

      {/* Map Canvas area (controls sit in the external toolbar above) */}
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
          borderRadius: isExtended ? '0' : '0.5rem'
        }}
      >
        {/* Map Canvas rendered first */}
        <div
          ref={mapRef}
          className="w-full h-full"
          style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
        />

        {/* Bottom Inspector Card (Only ONE active at a time to prevent UI clutter) */}
        {trackedVehicle ? (
          <div
            className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3.5 shadow-xl text-slate-800 animate-fade-in space-y-2.5"
            style={{ position: 'absolute', bottom: '12px !important', left: '12px !important', top: 'auto !important', right: 'auto !important', zIndex: 30, maxWidth: 'calc(100% - 24px)', width: 340, boxSizing: 'border-box' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-[#0B3D6D] text-white font-mono font-bold text-xs truncate max-w-[120px]">
                    {trackedVehicle.orderToken}
                  </span>
                  <span className="font-mono text-xs text-slate-500 truncate max-w-[100px]">[{trackedVehicle.registrationNo}]</span>
                </div>
                <h4 className="font-bold text-xs text-slate-800 mt-1 truncate">
                  {trackedVehicle.origin} ➔ {trackedVehicle.destination}
                </h4>
              </div>
              <button
                onClick={() => setTrackedVehicle(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Speed</span>
                <span className="font-bold font-mono text-[#0B3D6D]">{trackedVehicle.speed} km/h</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">ETA</span>
                <span className="font-bold text-emerald-600">{trackedVehicle.eta}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Fuel</span>
                <span className="font-bold text-amber-600">{trackedVehicle.fuelLevel.toFixed(2)}%</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">Driver:</span>
                <span className="font-mono text-emerald-600 font-bold truncate text-ellipsis overflow-hidden whitespace-nowrap">{trackedVehicle.driverName} ({trackedVehicle.driverPhone})</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">Cargo ({trackedVehicle.cargoWeight}T):</span>
                <span className="font-medium text-slate-700 truncate text-ellipsis overflow-hidden whitespace-nowrap">{trackedVehicle.cargoDescription}</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-[#0B3D6D] h-full rounded-full transition-all" style={{ width: `${trackedVehicle.progress}%` }} />
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setSmsSending(true);
                const res = await sendFast2SmsOtp(trackedVehicle.driverPhone);
                setSmsSending(false);
                setSmsNotice(`Dispatched Fast2SMS alert to ${trackedVehicle.driverName} (OTP: ${res.otp || 'SENT'})`);
                setTimeout(() => setSmsNotice(null), 4000);
              }}
              className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
            >
              <Send size={12} />
              <span>{smsSending ? 'Sending SMS...' : 'SMS Driver (Fast2SMS)'}</span>
            </button>
            {smsNotice && (
              <p className="text-[10px] text-emerald-600 font-mono text-center animate-fade-in">
                ✓ {smsNotice}
              </p>
            )}
          </div>
        ) : selectedRoad ? (
          <div
            className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3.5 shadow-xl text-slate-800 animate-fade-in space-y-2.5"
            style={{ position: 'absolute', bottom: '12px !important', left: '12px !important', top: 'auto !important', right: 'auto !important', zIndex: 30, maxWidth: 'calc(100% - 24px)', width: 340, boxSizing: 'border-box' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getRoadStatusColor(selectedRoad.status) }} />
                  <h4 className="font-bold text-xs text-slate-800 truncate">{selectedRoad.name}</h4>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{selectedRoad.from} ➔ {selectedRoad.to} ({selectedRoad.distance} km)</p>
              </div>
              <button
                onClick={() => setSelectedRoad(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Road Status</span>
                <span className="font-bold capitalize text-xs" style={{ color: getRoadStatusColor(selectedRoad.status) }}>
                  {selectedRoad.status.replace('_', ' ')}
                </span>
              </div>

              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Traffic Flow</span>
                <span className="font-bold text-xs" style={{ color: getTrafficColor(selectedRoad.trafficCongestion) }}>
                  {selectedRoad.avgSpeedKmH ?? 45} km/h • {selectedRoad.trafficCongestion ?? 'fluent'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">Delay:</span>
                <span className="font-bold text-amber-600">+{selectedRoad.delayMinutes ?? 0} mins</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">Pavement:</span>
                <span className="font-medium text-slate-700 truncate text-ellipsis overflow-hidden whitespace-nowrap">{selectedRoad.pavementType}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setSmsSending(true);
                const res = await sendFast2SmsOtp('9864011223');
                setSmsSending(false);
                setSmsNotice(`Dispatched advisory via Fast2SMS (OTP: ${res.otp || 'SENT'})`);
                setTimeout(() => setSmsNotice(null), 4000);
              }}
              className="w-full py-1.5 px-3 bg-[#0B3D6D] hover:bg-[#093259] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
            >
              <Send size={12} />
              <span>{smsSending ? 'Transmitting SMS...' : 'Broadcast SMS to Drivers'}</span>
            </button>
            {smsNotice && (
              <p className="text-[10px] text-emerald-600 font-mono text-center animate-fade-in">
                ✓ {smsNotice}
              </p>
            )}
          </div>
        ) : exactLocation ? (
          <div
            className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3.5 shadow-xl text-slate-800 animate-fade-in"
            style={{ position: 'absolute', bottom: '12px !important', left: '12px !important', top: 'auto !important', right: 'auto !important', zIndex: 30, maxWidth: 'calc(100% - 24px)', width: 340, boxSizing: 'border-box' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <h4 className="font-bold text-xs text-slate-800 truncate max-w-[200px]">
                  {exactLocation.name}
                </h4>
              </div>
              <button
                onClick={handleClearLocation}
                className="text-slate-400 hover:text-slate-700 p-0.5"
                title="Close pinpoint"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
              {exactLocation.formattedAddress}
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="font-mono text-[#0B3D6D] font-bold">
                {exactLocation.lat.toFixed(5)}, {exactLocation.lng.toFixed(5)}
              </span>
              <button
                onClick={handleCopyCoords}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center gap-1 transition-colors"
              >
                {copiedCoords ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                <span>{copiedCoords ? 'Copied' : 'Copy GPS'}</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Top-Right Corner: Extend Map Option */}
        <div className="absolute top-3 right-3 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={handleToggleExtended}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-300 dark:border-slate-700 shadow-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-slate-800 transition-all cursor-pointer select-none"
            title={isExtended ? 'Exit Extended Map (Esc)' : 'Extend Map to Fullscreen'}
          >
            {isExtended ? (
              <>
                <Minimize2 size={15} className="text-blue-600 dark:text-blue-400" />
                <span>Exit Extended</span>
              </>
            ) : (
              <>
                <Maximize2 size={15} className="text-blue-600 dark:text-blue-400" />
                <span>Extend Map</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom-Right Corner: Dedicated Zoom In (+) and Zoom Out (-) Buttons (straight below Extend Map) */}
        <div
          className="absolute bottom-4 right-4 z-30 pointer-events-auto flex flex-col items-center bg-white dark:bg-slate-900 shadow-2xl rounded-xl border-2 border-slate-300 dark:border-slate-600 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700 select-none"
        >
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-10 flex items-center justify-center text-slate-800 dark:text-slate-100 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-90 font-bold"
            title="Zoom In (+)"
            aria-label="Zoom in"
          >
            <Plus size={19} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-10 flex items-center justify-center text-slate-800 dark:text-slate-100 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-90 font-bold"
            title="Zoom Out (-)"
            aria-label="Zoom out"
          >
            <Minus size={19} strokeWidth={2.5} />
          </button>
        </div>

        {/* Right Side Live Traffic Speed Ticker (positioned safely to left of zoom buttons) */}
        {trafficEnabled && (
          <div className="absolute bottom-4 right-18 pointer-events-none hidden md:flex items-center gap-2 overflow-x-auto scrollbar-none" style={{ zIndex: 9998 }}>
            <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-lg text-[11px] whitespace-nowrap">
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <Activity size={12} className="animate-pulse" />
                <span>LIVE TRAFFIC:</span>
              </span>
              <div className="flex items-center gap-2 text-slate-600 font-mono text-[10px]">
                <span className="text-emerald-600 font-semibold">NH-27 68 km/h</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-600 font-semibold">NH-44 22 km/h</span>
                <span className="text-slate-300">•</span>
                <span className="text-red-600 font-semibold">NH-2 Blocked</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

