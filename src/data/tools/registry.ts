import type { Tool } from "@domain/services/tools/Tool";
import { flashlightTool } from "@data/tools/flashlightTool";
import { batteryTool } from "@data/tools/batteryTool";
import { calendarTool } from "@data/tools/calendarTool";
import { locationTool } from "@data/tools/locationTool";
import { notificationTool } from "@data/tools/notificationTool";
import { createTaskTool } from "@data/tools/createTaskTool";
import { readTasksTool } from "@data/tools/readTasksTool";
import { createEventTool } from "@data/tools/createEventTool";

/**
 * The one place every tool is registered.
 * Add a new tool => import it and drop it in this array. Dispatch, the menu,
 * and (later) the LLM specs all pick it up automatically.
 */
export const toolRegistry: Tool[] = [
  flashlightTool,
  batteryTool,
  calendarTool,
  locationTool,
  notificationTool,
  createTaskTool,
  readTasksTool,
  createEventTool,
];

/** look a tool up by the name the LLM emitted */
export const getTool = (name: string): Tool | undefined =>
  toolRegistry.find((t) => t.name === name);

/**
 * The tool list in the shape you feed to Gemma (or any LLM) as its
 * available functions. Strips out `execute` (the model doesn't need it).
 */
export const toolSpecs = () =>
  toolRegistry.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
