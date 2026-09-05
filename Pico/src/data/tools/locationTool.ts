import * as Location from "expo-location";
import type { Tool, ToolResult } from "@domain/services/tools/Tool";

/** Returns the device's current GPS coordinates. */
export const locationTool: Tool = {
  name: "current_location",
  description: "Get the device's current GPS latitude and longitude.",
  parameters: { type: "object", properties: {} },
  execute: async (): Promise<ToolResult> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { ok: false, message: "I need location access to find where you are." };
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude, accuracy } = pos.coords;

    return {
      ok: true,
      message:
        `You're at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}` +
        (accuracy ? ` (±${Math.round(accuracy)} m).` : "."),
      data: pos.coords,
    };
  },
};
