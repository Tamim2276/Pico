/**
 * Domain contract for an assistant "tool" (a.k.a. function the LLM can call).
 *
 * This layer knows NOTHING about expo, react-native, or the device.
 * Concrete tools live in the data layer (@data/tools) and implement this.
 *
 * The `parameters` shape is a minimal JSON-Schema so the same object can be
 * handed straight to Gemma (or any LLM) as a tool/function spec later.
 */

export interface ToolParameterSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: "string" | "number" | "boolean";
      description?: string;
      enum?: string[];
    }
  >;
  required?: string[];
}

export interface ToolResult {
  /** true = the action ran; false = validation/permission/runtime failure */
  ok: boolean;
  /** user-facing sentence Pico shows in the chat */
  message: string;
  /** optional structured payload (e.g. weather data) for future tools */
  data?: unknown;
}

export interface Tool {
  /** unique, snake_case — this is what the LLM emits when it wants to call it */
  name: string;
  /** one line the LLM reads to decide when to use this tool */
  description: string;
  /** JSON-schema of the arguments the LLM must supply */
  parameters: ToolParameterSchema;
  /** run the action */
  execute: (args: Record<string, any>) => Promise<ToolResult>;
}
