import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import { LocalTaskRepository } from "@data/local/LocalTaskRepository";
import { taskEventBus } from "@data/local/taskEvents";

const taskRepo = new LocalTaskRepository();

export const completeTaskTool: Tool = {
  name: "mark_task_completed",
  description: "Mark a task or todo item as completed by its title or keyword.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "The title or keyword of the task to complete." },
    },
    required: ["title"],
  },
  execute: async (args: { title?: string }): Promise<ToolResult> => {
    const search = (args.title || "").toLowerCase().trim();
    if (!search) {
      return { ok: false, message: "Task title is required to mark it as completed." };
    }

    try {
      const tasks = await taskRepo.getTasks();
      // Find matching pending task first, or any matching task
      const target = tasks.find(
        t => !t.completed && (t.title.toLowerCase().includes(search) || search.includes(t.title.toLowerCase()))
      ) || tasks.find(
        t => t.title.toLowerCase().includes(search) || search.includes(t.title.toLowerCase())
      );

      if (!target) {
        return {
          ok: false,
          message: `Could not find a task matching "${args.title}".`,
        };
      }

      await taskRepo.updateTask({ ...target, completed: true });
      taskEventBus.emit();

      return {
        ok: true,
        message: `✅ Completed task: "${target.title}"! 🎉`,
        data: target,
      };
    } catch (e: any) {
      return { ok: false, message: `Failed to complete task: ${e?.message ?? e}` };
    }
  },
};
