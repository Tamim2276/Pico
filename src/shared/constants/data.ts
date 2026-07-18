import type { Task, CalendarEvent } from "@shared/types";

export const COLORS = {
  primary: "#3D3B8E",
  primaryDark: "#2A2870",
  accent: "#00BFA6",
  background: "#F8F9FF",
  surface: "#FFFFFF",
  textPrimary: "#1A1A2E",
  textSecondary: "#6B7280",
  textHint: "#9CA3AF",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  divider: "#E5E7EB",
  inputBg: "#F1F2FF",
};

// Dark-mode counterpart to COLORS — same keys, applied via ThemeContext
export const DARK_COLORS: typeof COLORS = {
  primary: "#8785D6",
  primaryDark: "#3D3B8E",
  accent: "#00BFA6",
  background: "#12121C",
  surface: "#1C1C2A",
  textPrimary: "#F1F1F6",
  textSecondary: "#ACACC2",
  textHint: "#7B7B92",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#F87171",
  divider: "#2E2E42",
  inputBg: "#252536",
};

// Mirrors the "My Tasks" screen design
export const TASKS: Task[] = [
  {
    id: "1",
    title: "Review Q4 Report",
    priority: "High",
    dueDate: "Due Today",
    category: "Work",
    completed: false,
  },
  {
    id: "2",
    title: "Buy groceries",
    priority: "Low",
    dueDate: "Kitchen",
    category: "Kitchen",
    completed: false,
  },
  {
    id: "3",
    title: "Team standup",
    priority: "Medium",
    dueDate: "Completed",
    category: "Work",
    completed: true,
  },
  {
    id: "4",
    title: "Design review",
    priority: "Medium",
    dueDate: "Tomorrow",
    category: "Design",
    completed: false,
  },
];

// Mirrors the "Calendar" screen design (Today's Events, July 1, 2026)
export const EVENTS: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Meeting",
    timeStart: "09:00",
    timeEnd: "10:30",
    location: "Room 4B",
    type: "meeting",
    attendeeAvatars: ["👩", "👨", "🧑"],
    attendeesCount: 3,
  },
  {
    id: "2",
    title: "Project Review",
    timeStart: "13:00",
    timeEnd: "14:00",
    location: "Zoom Call",
    type: "review",
  },
  {
    id: "3",
    title: "Gym Session",
    timeStart: "17:30",
    timeEnd: "18:30",
    location: "FitCenter Prime",
    type: "personal",
  },
];

// Number of event dots rendered under each day cell in the calendar grid
export const EVENT_DOTS_BY_DAY: Record<number, number> = {
  1: 2,
  2: 1,
  4: 1,
  6: 2,
  8: 1,
};
