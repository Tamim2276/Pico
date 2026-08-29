import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import { LocalTaskRepository } from "@data/local/LocalTaskRepository";
import { GetTasksUseCase } from "@domain/usecases/task/GetTasksUseCase";

const taskRepo = new LocalTaskRepository();
const getTasksUseCase = new GetTasksUseCase(taskRepo);

export const readTasksTool: Tool = {
  name: "read_tasks",
  description: "List all current tasks and todos in the user's task list.",
  parameters: { type: "object", properties: {} },
  execute: async (): Promise<ToolResult> => {
    try {
      const tasks = await getTasksUseCase.execute();
      if (tasks.length === 0) {
        return { ok: true, message: "You have no tasks in your list." };
      }
      const pending = tasks.filter(t => !t.completed);
      if (pending.length === 0) {
        return { ok: true, message: "All your tasks are completed! 🎉" };
      }
      const lines = pending.slice(0, 5).map(t => `• [${t.priority}] ${t.title}`);
      const more = pending.length > 5 ? `\n…and ${pending.length - 5} more.` : "";
      return {
        ok: true,
        message: `You have ${pending.length} pending task(s):\n${lines.join("\n")}${more}`,
        data: tasks,
      };
    } catch (e: any) {
      return { ok: false, message: `Failed to read tasks: ${e?.message ?? e}` };
    }
  }
};
