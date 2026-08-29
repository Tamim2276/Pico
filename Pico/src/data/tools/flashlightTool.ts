import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import { torchStore } from "@data/device/torchStore";

/**
 * Turns the device flashlight (torch) on/off.
 *
 * It only flips a boolean in torchStore. The real hardware toggle happens in
 * TorchProvider, which renders a hidden <CameraView enableTorch={...} />.
 */
export const flashlightTool: Tool = {
  name: "toggle_flashlight",
  description:
    "Turn the device flashlight (torch) on or off. Use when the user asks " +
    "to enable, disable, or toggle the flashlight/torch/light.",
  parameters: {
    type: "object",
    properties: {
      state: {
        type: "string",
        enum: ["on", "off"],
        description: "Desired flashlight state.",
      },
    },
    required: ["state"],
  },
  execute: async ({ state }): Promise<ToolResult> => {
    if (state !== "on" && state !== "off") {
      return { ok: false, message: `Invalid flashlight state: "${state}".` };
    }
    const on = state === "on";
    torchStore.set(on);
    return {
      ok: true,
      message: on ? "Flashlight is on. 🔦" : "Flashlight is off.",
    };
  },
};
