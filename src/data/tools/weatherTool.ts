import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import * as Location from "expo-location";

const getWeatherDescription = (code: number): { text: string; icon: string; advice?: string } => {
  if (code === 0) return { text: "Clear Sky", icon: "☀️", advice: "Beautiful clear skies today!" };
  if (code === 1 || code === 2 || code === 3) return { text: "Partly Cloudy", icon: "⛅", advice: "Great weather for outdoor activities." };
  if (code === 45 || code === 48) return { text: "Foggy", icon: "🌫️", advice: "Drive carefully in low visibility." };
  if (code >= 51 && code <= 55) return { text: "Light Drizzle", icon: "🌦️", advice: "You might want a light umbrella or jacket." };
  if (code >= 61 && code <= 65) return { text: "Rain", icon: "🌧️", advice: "Rain expected — bring an umbrella today!" };
  if (code >= 71 && code <= 77) return { text: "Snow", icon: "❄️", advice: "Bundle up, it's freezing!" };
  if (code >= 80 && code <= 82) return { text: "Rain Showers", icon: "🌦️", advice: "Passing showers likely today." };
  if (code >= 95) return { text: "Thunderstorm", icon: "⛈️", advice: "Thunderstorms expected — stay indoors if possible!" };
  return { text: "Pleasant", icon: "🌤️" };
};

export const weatherTool: Tool = {
  name: "get_weather",
  description: "Get real-time weather, temperature, and forecast for the user's current location.",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "Optional city name to look up weather for." },
    },
  },
  execute: async (args: { city?: string }): Promise<ToolResult> => {
    let lat = 23.8103; // Default Dhaka fallback
    let lon = 90.4125;
    let locationName = "your location";

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getLastKnownPositionAsync({}) || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc) {
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
          try {
            const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            if (geo) {
              locationName = geo.city || geo.subregion || geo.region || "Current Area";
            }
          } catch {
            // ignore reverse geocode error
          }
        }
      }
    } catch {
      // location permission skipped, use fallback
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.current) {
        return { ok: false, message: "Weather service currently unavailable." };
      }

      const temp = Math.round(data.current.temperature_2m);
      const feelsLike = Math.round(data.current.apparent_temperature);
      const humidity = data.current.relative_humidity_2m;
      const wind = Math.round(data.current.wind_speed_10m);
      const condition = getWeatherDescription(data.current.weather_code);

      const high = data.daily?.temperature_2m_max?.[0] ? Math.round(data.daily.temperature_2m_max[0]) : temp;
      const low = data.daily?.temperature_2m_min?.[0] ? Math.round(data.daily.temperature_2m_min[0]) : temp;
      const rainChance = data.daily?.precipitation_probability_max?.[0] ?? 0;

      const lines = [
        `🌤️ Weather for ${locationName}:`,
        `━━━━━━━━━━━━━━━━━━`,
        `${condition.icon} ${condition.text} • ${temp}°C (Feels like ${feelsLike}°C)`,
        `🌡️ High: ${high}°C | Low: ${low}°C`,
        `💧 Humidity: ${humidity}% | 💨 Wind: ${wind} km/h`,
      ];

      if (rainChance > 40) {
        lines.push(`🌧️ Rain Probability: ${rainChance}% (Bring an umbrella!)`);
      } else if (condition.advice) {
        lines.push(`💡 ${condition.advice}`);
      }

      return {
        ok: true,
        message: lines.join("\n"),
        data: {
          temp,
          feelsLike,
          condition: condition.text,
          location: locationName,
          high,
          low,
        },
      };
    } catch (e: any) {
      return { ok: false, message: `Could not fetch weather data: ${e?.message ?? e}` };
    }
  },
};
