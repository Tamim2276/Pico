import * as Battery from "expo-battery";
import type { Tool, ToolResult } from "@domain/services/tools/Tool";

/** Reports the current battery level and whether the device is charging. */
export const batteryTool: Tool = {
  name: "battery_status",
  description: "Report the device battery level and charging state.",
  parameters: { type: "object", properties: {} },
  execute: async (): Promise<ToolResult> => {
    const level = await Battery.getBatteryLevelAsync(); // 0..1, or -1 if unknown
    const state = await Battery.getBatteryStateAsync();

    if (level < 0) {
      return { ok: false, message: "Couldn't read the battery level on this device." };
    }

    const pct = Math.round(level * 100);
    const charging =
      state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;

    return {
      ok: true,
      message: `Battery is at ${pct}%${charging ? " and charging ⚡" : "."}`,
      data: { level: pct, charging },
    };
  },
};
