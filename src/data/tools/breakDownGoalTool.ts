import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import { LocalTaskRepository } from "@data/local/LocalTaskRepository";
import { CreateTaskUseCase } from "@domain/usecases/task/CreateTaskUseCase";
import { taskEventBus } from "@data/local/taskEvents";
import { createLLMProvider } from "@shared/utils/llm";

const taskRepo = new LocalTaskRepository();
const createTaskUseCase = new CreateTaskUseCase(taskRepo);

interface SubTaskPlan {
  title: string;
  priority: "High" | "Medium" | "Low";
  category: string;
}

const parseSubTasksFromResponse = (raw: string, goal: string): SubTaskPlan[] => {
  if (!raw) return getDefaultSubTasks(goal);

  // Try direct JSON array parse
  const arrayMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          title: String(item.title || item.task || "Action step").trim(),
          priority: item.priority === "High" || item.priority === "Low" ? item.priority : "Medium",
          category: String(item.category || "Study/Work").trim(),
        }));
      }
    } catch {
      // JSON parse failed, fall through to regex line extraction
    }
  }

  // Regex fallback: match numbered or bulleted list lines e.g. "1. Outline slides"
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const extracted: SubTaskPlan[] = [];

  for (const line of lines) {
    const match = line.match(/^(?:[-*•]|\d+\.)\s+(.+)$/);
    if (match) {
      const text = match[1].replace(/\*\*/g, "").trim();
      if (text.length > 4) {
        extracted.push({
          title: text,
          priority: extracted.length === 0 ? "High" : extracted.length === 1 ? "High" : "Medium",
          category: "Plan",
        });
      }
    }
  }

  return extracted.length > 0 ? extracted.slice(0, 4) : getDefaultSubTasks(goal);
};

const getDefaultSubTasks = (goal: string): SubTaskPlan[] => {
  const g = goal.toLowerCase();
  if (g.includes("exam") || g.includes("study") || g.includes("test")) {
    return [
      { title: `Review core formulas and concepts for ${goal}`, priority: "High", category: "Study" },
      { title: `Solve 10 practice problems or past papers`, priority: "High", category: "Study" },
      { title: `Final quick revision and summary notes`, priority: "Medium", category: "Study" },
    ];
  }
  if (g.includes("presentation") || g.includes("slide") || g.includes("talk")) {
    return [
      { title: `Draft presentation outline & key talking points`, priority: "High", category: "Work" },
      { title: `Design slide deck visuals & diagrams`, priority: "High", category: "Work" },
      { title: `Conduct 10-minute rehearsal dry-run`, priority: "Medium", category: "Work" },
    ];
  }
  if (g.includes("project") || g.includes("submit") || g.includes("code")) {
    return [
      { title: `Complete main implementation for ${goal}`, priority: "High", category: "Project" },
      { title: `Run end-to-end testing and bug fixing`, priority: "High", category: "Project" },
      { title: `Prepare project documentation & report`, priority: "Medium", category: "Project" },
    ];
  }
  return [
    { title: `Define key requirements & initial setup for ${goal}`, priority: "High", category: "General" },
    { title: `Execute primary milestone deliverables`, priority: "High", category: "General" },
    { title: `Final review and completion check`, priority: "Medium", category: "General" },
  ];
};

export const breakDownGoalTool: Tool = {
  name: "break_down_goal",
  description: "Autonomously decompose a high-level goal or project into 3-4 actionable sub-tasks and add them to the task list.",
  parameters: {
    type: "object",
    properties: {
      goal: { type: "string", description: "The broad goal or project (e.g. 'Software Engineering Presentation', 'Exam preparation')." },
    },
    required: ["goal"],
  },
  execute: async (args: { goal?: string }): Promise<ToolResult> => {
    const goal = (args.goal || "").trim();
    if (!goal) {
      return { ok: false, message: "Please specify a goal to break down." };
    }

    let subtasks: SubTaskPlan[] = [];

    try {
      const provider = createLLMProvider();
      const prompt = `You are an expert productivity coach.\nDecompose this goal into 3-4 concrete actionable subtasks.\nGoal: "${goal}"\nRespond ONLY with a JSON array in this exact format:\n[\n  {"title": "Step 1 title", "priority": "High", "category": "Work"},\n  {"title": "Step 2 title", "priority": "High", "category": "Work"},\n  {"title": "Step 3 title", "priority": "Medium", "category": "Work"}\n]`;

      const response = await provider.generate(prompt);
      subtasks = parseSubTasksFromResponse(response, goal);
    } catch {
      subtasks = getDefaultSubTasks(goal);
    }

    if (subtasks.length === 0) {
      subtasks = getDefaultSubTasks(goal);
    }

    // Save all subtasks to local database
    const created = [];
    for (const sub of subtasks) {
      try {
        const task = await createTaskUseCase.execute(sub.title, sub.priority, sub.category);
        created.push(task);
      } catch (err) {
        console.error("Failed to insert subtask", err);
      }
    }

    // Notify UI reactively
    taskEventBus.emit();

    const taskLines = created.map(t => {
      const icon = t.priority === "High" ? "🔴" : t.priority === "Medium" ? "🟡" : "🟢";
      return `   ${icon} ${t.title} [${t.priority}]`;
    });

    const message = `🎯 Goal Plan Created: "${goal}"\nI've automatically added ${created.length} actionable steps to your tasks list:\n${taskLines.join("\n")}`;

    return {
      ok: true,
      message,
      data: {
        goal,
        tasksCreated: created,
      },
    };
  },
};
