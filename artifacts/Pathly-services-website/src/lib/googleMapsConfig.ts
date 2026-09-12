// ============================================================
// googleMapsConfig: Google Maps Platform API Key Manager & Health Verifier
// ============================================================

const STORAGE_KEY = 'pathly_google_maps_key';
const DEFAULT_FALLBACK_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export function getGoogleMapsKey(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved.trim();
  } catch {}
  return DEFAULT_FALLBACK_KEY.trim();
}

export function setGoogleMapsKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
    window.dispatchEvent(new CustomEvent('pathly_maps_key_changed', { detail: { key: key.trim() } }));
  } catch {}
}

export function clearGoogleMapsKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('pathly_maps_key_changed', { detail: { key: '' } }));
  } catch {}
}

export interface GoogleMapsKeyTestResult {
  success: boolean;
  message: string;
  status?: string;
}

/**
 * Test Google Maps Platform API Key against Google's Geocoding / Maps service
 */
export async function testGoogleMapsKey(candidateKey?: string): Promise<GoogleMapsKeyTestResult> {
  const key = (candidateKey !== undefined ? candidateKey : getGoogleMapsKey()).trim();

  if (!key) {
    return {
      success: false,
      message: 'No Google Maps API Key provided. Operating on high-performance Tactical GIS (OpenStreetMap).',
      status: 'EMPTY_KEY'
    };
  }

  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Guwahati,Assam&key=${encodeURIComponent(key)}`);
    const data = await res.json();

    if (data.status === 'OK') {
      return {
        success: true,
        message: 'Google Maps API Key verified! Geocoding, Places & JavaScript Maps active.',
        status: 'OK'
      };
    }

    if (data.error_message) {
      if (data.error_message.includes('billing') || data.error_message.includes('Billing')) {
        return {
          success: false,
          message: 'Google Cloud Billing is disabled for this key. Enable billing in Google Cloud Console or use Tactical GIS.',
          status: 'BILLING_NOT_ENABLED'
        };
      }
      return {
        success: false,
        message: data.error_message,
        status: data.status || 'REQUEST_DENIED'
      };
    }

    return {
      success: false,
      message: `Google Maps status: ${data.status || 'Unknown response'}`,
      status: data.status
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error verifying Google Maps API key.',
      status: 'NETWORK_ERROR'
    };
  }
}
