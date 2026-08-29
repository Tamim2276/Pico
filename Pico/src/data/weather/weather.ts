/**
 * Weather data via Open-Meteo (free, no API key) + the "bad weather" thresholds
 * that decide whether an outdoor task is at risk.
 */

export interface HourWeather {
  time: string; // local ISO like "2026-08-23T15:00"
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  windSpeed: number;
}

export interface WeatherVerdict {
  bad: boolean;
  reason: string;
}

// WMO weather codes
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const THUNDER_CODES = new Set([95, 96, 99]);

// Thresholds (confirmed): conservative on purpose so Pico doesn't cry wolf.
const RAIN_PROBABILITY = 60; // %
const HOT_APPARENT_C = 35;
const COLD_APPARENT_C = 5;
const HIGH_WIND_KMH = 40;

const pad = (n: number) => n.toString().padStart(2, "0");

/** Fetch the next ~2 days of hourly forecast for a location. */
export async function fetchHourlyForecast(
  lat: number,
  lon: number
): Promise<HourWeather[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,apparent_temperature,precipitation,precipitation_probability,weather_code,wind_speed_10m` +
    `&forecast_days=2&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API ${res.status}`);
  const data = await res.json();
  const h = data.hourly;
  if (!h || !Array.isArray(h.time)) return [];

  return h.time.map((t: string, i: number) => ({
    time: t,
    temperature: h.temperature_2m?.[i] ?? 0,
    apparentTemperature: h.apparent_temperature?.[i] ?? h.temperature_2m?.[i] ?? 0,
    precipitation: h.precipitation?.[i] ?? 0,
    precipitationProbability: h.precipitation_probability?.[i] ?? 0,
    weatherCode: h.weather_code?.[i] ?? 0,
    windSpeed: h.wind_speed_10m?.[i] ?? 0,
  }));
}

/** Find the forecast row matching an event's local hour. */
export function findHour(forecast: HourWeather[], when: Date): HourWeather | null {
  const key =
    `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}` +
    `T${pad(when.getHours())}:00`;
  return forecast.find((f) => f.time === key) ?? null;
}

/** Apply the thresholds. Returns whether the weather is bad + a short reason. */
export function evaluateWeather(h: HourWeather): WeatherVerdict {
  if (THUNDER_CODES.has(h.weatherCode)) {
    return { bad: true, reason: "thunderstorms expected" };
  }
  if (SNOW_CODES.has(h.weatherCode)) {
    return { bad: true, reason: "snow expected" };
  }
  if (h.precipitationProbability >= RAIN_PROBABILITY || RAIN_CODES.has(h.weatherCode)) {
    return { bad: true, reason: "rain likely" };
  }
  if (h.apparentTemperature >= HOT_APPARENT_C) {
    return { bad: true, reason: `very hot (${Math.round(h.apparentTemperature)}°C)` };
  }
  if (h.apparentTemperature <= COLD_APPARENT_C) {
    return { bad: true, reason: `very cold (${Math.round(h.apparentTemperature)}°C)` };
  }
  if (h.windSpeed >= HIGH_WIND_KMH) {
    return { bad: true, reason: `strong wind (${Math.round(h.windSpeed)} km/h)` };
  }
  return { bad: false, reason: "" };
}
