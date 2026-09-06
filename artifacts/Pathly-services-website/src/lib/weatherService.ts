// ============================================================
// weatherService: Live OpenWeatherMap & IMD Radar Telemetry Engine
// ============================================================

import { INITIAL_WEATHER, type WeatherData } from '../data/nerData';

const STORAGE_KEY = 'pathly_openweathermap_key';
export const DEFAULT_OPENWEATHER_KEY = '2352991569540ce7175ec3304f1ca5d1';
const DEFAULT_FALLBACK_KEY = import.meta.env.VITE_OPENWEATHERMAP_API_KEY || DEFAULT_OPENWEATHER_KEY;

export function getOpenWeatherMapKey(): string {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_FALLBACK_KEY;
}

export function setOpenWeatherMapKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearOpenWeatherMapKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface LiveWeatherResult {
  district: string;
  state: string;
  temperature: number;
  rainfall: number; // mm in last 1h/3h
  humidity: number;
  windSpeed: number;
  condition: 'clear' | 'cloudy' | 'rain' | 'heavy_rain' | 'drizzle' | 'fog';
  visibility: number;
  landslideWarning: boolean;
  floodWarning: boolean;
  isLiveApi: boolean;
  rawDescription?: string;
  stationName?: string;
  timestamp: string;
}

/**
 * Test OpenWeatherMap API connection with given or stored key
 */
export async function testOpenWeatherMapConnection(apiKey?: string): Promise<{
  success: boolean;
  message: string;
  sampleData?: LiveWeatherResult;
}> {
  const key = (apiKey || getOpenWeatherMapKey()).trim();
  if (!key) {
    return {
      success: false,
      message: 'No OpenWeatherMap API key provided. Please enter a valid key from openweathermap.org.'
    };
  }

  try {
    // Query Guwahati (26.1445, 91.7362)
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=26.1445&lon=91.7362&appid=${key}&units=metric`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.cod !== 200) {
      return {
        success: false,
        message: data.message || `HTTP ${res.status}: Failed to authenticate with OpenWeatherMap.`
      };
    }

    const rain1h = data.rain?.['1h'] || data.rain?.['3h'] || 0;
    const weatherMain = (data.weather?.[0]?.main || '').toLowerCase();
    let condition: LiveWeatherResult['condition'] = 'clear';
    if (weatherMain.includes('rain') && rain1h > 15) condition = 'heavy_rain';
    else if (weatherMain.includes('rain')) condition = 'rain';
    else if (weatherMain.includes('drizzle')) condition = 'drizzle';
    else if (weatherMain.includes('fog') || weatherMain.includes('mist')) condition = 'fog';
    else if (weatherMain.includes('cloud')) condition = 'cloudy';

    const sample: LiveWeatherResult = {
      district: 'Kamrup Metropolitan',
      state: 'Assam',
      temperature: Math.round(data.main.temp * 10) / 10,
      rainfall: Math.round(rain1h * 10) / 10,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
      condition,
      visibility: Math.min(10, Math.round((data.visibility || 10000) / 1000)),
      floodWarning: rain1h > 40,
      landslideWarning: rain1h > 35,
      isLiveApi: true,
      rawDescription: data.weather?.[0]?.description,
      stationName: data.name,
      timestamp: new Date().toLocaleTimeString('en-IN')
    };

    return {
      success: true,
      message: `Connected successfully to OpenWeatherMap! Live radar live for station "${data.name}" (${sample.temperature}°C, ${sample.humidity}% Humidity).`,
      sampleData: sample
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Network error connecting to OpenWeatherMap: ${err.message}`
    };
  }
}

/**
 * Fetch live weather for a specific latitude & longitude
 */
export async function fetchLiveWeatherByCoords(
  lat: number,
  lng: number,
  districtName: string,
  stateName: string,
  apiKey?: string
): Promise<WeatherData | null> {
  const key = (apiKey || getOpenWeatherMapKey()).trim();
  if (!key) return null;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${key}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const rainMm = data.rain?.['1h'] || data.rain?.['3h'] || 0;
    const weatherMain = (data.weather?.[0]?.main || '').toLowerCase();
    
    let condition: WeatherData['condition'] = 'clear';
    if (weatherMain.includes('rain') && rainMm > 15) condition = 'heavy_rain';
    else if (weatherMain.includes('rain')) condition = 'rain';
    else if (weatherMain.includes('drizzle')) condition = 'drizzle';
    else if (weatherMain.includes('fog') || weatherMain.includes('mist')) condition = 'fog';
    else if (weatherMain.includes('cloud')) condition = 'cloudy';

    return {
      district: districtName,
      state: stateName as any,
      temperature: Math.round(data.main.temp * 10) / 10,
      humidity: data.main.humidity,
      rainfall: Math.round(rainMm * 10) / 10,
      windSpeed: Math.round(data.wind.speed * 3.6),
      visibility: Math.min(10, Math.round((data.visibility || 10000) / 1000)),
      condition,
      floodWarning: rainMm > 40 && (stateName === 'Assam' || stateName === 'Tripura'),
      landslideWarning: rainMm > 35 && (stateName === 'Meghalaya' || stateName === 'Mizoram' || stateName === 'Arunachal Pradesh' || stateName === 'Sikkim'),
      forecast24h: data.weather?.[0]?.description || 'Live OpenWeatherMap satellite scan'
    };
  } catch {
    return null;
  }
}
