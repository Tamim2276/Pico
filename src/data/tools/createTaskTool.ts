import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import { LocalTaskRepository } from "@data/local/LocalTaskRepository";
import { CreateTaskUseCase } from "@domain/usecases/task/CreateTaskUseCase";
import { taskEventBus } from "@data/local/taskEvents";

const taskRepo = new LocalTaskRepository();
const createTaskUseCase = new CreateTaskUseCase(taskRepo);

export const createTaskTool: Tool = {
  name: "create_task",
  description: "Create and save a new task or todo item in the user's task list.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "The title or description of the task." },
      priority: { type: "string", enum: ["High", "Medium", "Low"], description: "Task priority (default: Medium)." },
      category: { type: "string", description: "Category like Work, Personal, Shopping, etc." },
      dueDate: { type: "string", description: "Optional due date ISO string or date." }
    },
    required: ["title"]
  },
  execute: async (args: { title?: string; priority?: "High" | "Medium" | "Low"; category?: string; dueDate?: string }): Promise<ToolResult> => {
    const title = (args.title || "").trim();
    if (!title) {
      return { ok: false, message: "Task title is required." };
    }
    try {
      const task = await createTaskUseCase.execute(
        title,
        args.priority || "Medium",
        args.category || "General",
        undefined,
        args.dueDate
      );
      taskEventBus.emit();
      return {
        ok: true,
        message: `✅ Created task: "${task.title}" (Priority: ${task.priority})`,
        data: task,
      };
    } catch (e: any) {
      return { ok: false, message: `Failed to create task: ${e?.message ?? e}` };
    }
  }
};
