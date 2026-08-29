import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import * as Battery from "expo-battery";
import { LocalTaskRepository } from "@data/local/LocalTaskRepository";
import { LocalEventRepository } from "@data/local/LocalEventRepository";
import { LocalAuthRepository } from "@data/auth/LocalAuthRepository";

const taskRepo = new LocalTaskRepository();
const eventRepo = new LocalEventRepository();
const authRepo = new LocalAuthRepository();

export const dailyBriefingTool: Tool = {
  name: "daily_briefing",
  description: "Provide a comprehensive morning or daily briefing summarizing tasks, events, and battery status.",
  parameters: {
    type: "object",
    properties: {},
  },
  execute: async (): Promise<ToolResult> => {
    try {
      const user = await authRepo.getCurrentUser();
      const name = user?.fullName?.split(" ")[0] || "there";

      // 1. Battery
      let batteryText = "Battery status unavailable";
      try {
        const level = await Battery.getBatteryLevelAsync();
        const state = await Battery.getBatteryStateAsync();
        const percent = Math.round(level * 100);
        const charging = state === Battery.BatteryState.CHARGING;
        batteryText = `${percent}%${charging ? " ⚡ (Charging)" : ""}`;
      } catch {
        // ignore battery read failure
      }

      // 2. Tasks
      const tasks = await taskRepo.getTasks();
      const pending = tasks.filter(t => !t.completed);
      const highPriority = pending.filter(t => t.priority === "High");

      // 3. Today's Events
      const events = await eventRepo.getEvents();
      const today = new Date();
      const todayEvents = events.filter(e => {
        const d = new Date(e.startTime);
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        );
      });

      // 4. Compose Briefing
      const lines: string[] = [
        `☀️ Daily Briefing for ${name}`,
        `━━━━━━━━━━━━━━━━━━`,
        `🔋 Battery: ${batteryText}`,
      ];

      if (todayEvents.length > 0) {
        lines.push(`📅 Events Today (${todayEvents.length}):`);
        todayEvents.slice(0, 3).forEach(e => {
          const time = new Date(e.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          lines.push(`   • ${e.title} at ${time}`);
        });
      } else {
        lines.push(`📅 Events: No meetings scheduled today.`);
      }

      if (pending.length > 0) {
        lines.push(`📋 Pending Tasks (${pending.length}):`);
        pending.slice(0, 6).forEach(t => {
          const priorityIcon = t.priority === "High" ? "🔴" : t.priority === "Medium" ? "🟡" : "🟢";
          lines.push(`   ${priorityIcon} ${t.title} [${t.priority}]`);
        });
        if (pending.length > 6) {
          lines.push(`   …and ${pending.length - 6} more.`);
        }
      } else {
        lines.push(`📋 Tasks: All caught up! 0 pending tasks.`);
      }

      lines.push(`━━━━━━━━━━━━━━━━━━`);
      lines.push(`Have a productive and great day! 🚀`);

      return {
        ok: true,
        message: lines.join("\n"),
        data: {
          battery: batteryText,
          pendingTasksCount: pending.length,
          todayEventsCount: todayEvents.length,
        },
      };
    } catch (e: any) {
      return { ok: false, message: `Failed to generate briefing: ${e?.message ?? e}` };
    }
  },
};
