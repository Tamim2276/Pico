import * as Location from "expo-location";
import type { Tool, ToolResult } from "@domain/services/tools/Tool";

/**
 * Route + ETA tool built entirely on free, keyless/no-card services:
 *  - Photon (komoot, OpenStreetMap-based) for geocoding place names ->
 *    coordinates. (Nominatim was tried first, but RN/Android's networking
 *    layer doesn't reliably let you set a custom User-Agent, which
 *    Nominatim's anti-bot policy needs — Photon doesn't have that
 *    restriction.)
 *  - OSRM's public demo server for routing -> distance + duration
 *
 * Trade-offs vs a paid provider (Google/TomTom/etc):
 *  - Duration is a STATIC estimate based on road speed limits/class, not
 *    live traffic. It won't reflect rush-hour congestion.
 *  - The public OSRM demo server is for light/prototype use, not
 *    production scale (no published hard limit, but it's fair-use).
 *  - Photon is also a shared public instance — same fair-use caveat.
 * Good enough to demo "distance + ETA from A to B" without any billing
 * account anywhere in the chain.
 */

interface LatLon {
  lat: number;
  lon: number;
}

async function geocode(place: string): Promise<LatLon | null> {
  // Using Photon (komoot's free OSM-based geocoder) instead of Nominatim
  // directly. Nominatim actively blocks/rate-limits requests that don't
  // carry a real, identifying User-Agent — and React Native's networking
  // layer on Android is known to silently override a custom "User-Agent"
  // header set via fetch() with a generic "okhttp/x.x" string, which
  // Nominatim's policy treats as unidentified bot traffic and rejects.
  // Photon doesn't enforce that same policy, so it works reliably from RN.
  const url = `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(place)}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(
      `[getRouteTool] geocode("${place}") failed: HTTP ${res.status}`,
    );
    return null;
  }

  const json = await res.json();
  const feature = json?.features?.[0];
  if (!feature) {
    console.warn(
      `[getRouteTool] geocode("${place}") returned no results`,
      json,
    );
    return null;
  }

  const [lon, lat] = feature.geometry.coordinates as [number, number];
  return { lat, lon };
}

async function getCurrentLatLon(): Promise<LatLon | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { lat: pos.coords.latitude, lon: pos.coords.longitude };
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km < 1 ? `${Math.round(meters)} m` : `${km.toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export const getRouteTool: Tool = {
  name: "get_route",
  description:
    "Get driving distance and estimated travel time between two places. If origin is omitted, uses the device's current location. Note: this estimate does not account for live traffic.",
  parameters: {
    type: "object",
    properties: {
      origin: {
        type: "string",
        description:
          "Starting place/address. Leave empty to use the device's current location.",
      },
      destination: {
        type: "string",
        description: "Destination place or address, e.g. 'Gulshan 2, Dhaka'.",
      },
    },
    required: ["destination"],
  },
  execute: async ({
    origin,
    destination,
  }: {
    origin?: string;
    destination?: string;
  }): Promise<ToolResult> => {
    const dest = destination?.trim();
    if (!dest) {
      return { ok: false, message: "Where do you want directions to?" };
    }

    try {
      const [originPoint, destPoint] = await Promise.all([
        origin?.trim() ? geocode(origin.trim()) : getCurrentLatLon(),
        geocode(dest),
      ]);

      if (!originPoint) {
        return {
          ok: false,
          message: origin?.trim()
            ? `I couldn't find "${origin}".`
            : "I need location access to find your starting point.",
        };
      }
      if (!destPoint) {
        return { ok: false, message: `I couldn't find "${dest}".` };
      }

      const osrmUrl =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${originPoint.lon},${originPoint.lat};${destPoint.lon},${destPoint.lat}` +
        `?overview=false`;

      const res = await fetch(osrmUrl);
      const json = await res.json();

      if (json.code !== "Ok" || !json.routes?.length) {
        return {
          ok: false,
          message: "I couldn't calculate a route between those two points.",
        };
      }

      const route = json.routes[0];
      const distance = formatDistance(route.distance);
      const duration = formatDuration(route.duration);

      return {
        ok: true,
        message:
          `${dest} is about ${distance} away, roughly ${duration} by car ` +
          `(based on road distance — doesn't account for current traffic).`,
        data: {
          distanceMeters: route.distance,
          durationSeconds: route.duration,
          origin: originPoint,
          destination: destPoint,
        },
      };
    } catch (e: any) {
      return {
        ok: false,
        message: `Couldn't get directions: ${e?.message ?? e}`,
      };
    }
  },
};
