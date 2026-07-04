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

// --- Added: mock/initial data for Home, Profile, and shared app state ---
// Purely additive — does not change any of the exports above.
import {
  Task,
  CalendarEvent,
  NotificationItem,
  AssistantMessage,
  ProfileSettings,
} from "@shared/types";

export const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Review Q4 Report",
    priority: "High",
    dueDate: "Due Today",
    category: "Work",
    completed: false,
  },
  {
    id: "task-2",
    title: "Buy groceries",
    priority: "Low",
    dueDate: "Kitchen",
    category: "Kitchen",
    completed: false,
  },
  {
    id: "task-3",
    title: "Team standup",
    priority: "Medium",
    dueDate: "Completed",
    category: "Work",
    completed: true,
  },
  {
    id: "task-4",
    title: "Design review",
    priority: "Medium",
    dueDate: "Tomorrow",
    category: "Design",
    completed: false,
  },
];

export const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: "event-1",
    title: "Team Meeting",
    timeStart: "09:00",
    timeEnd: "10:30",
    location: "Room 4B",
    type: "meeting",
    attendeesCount: 5,
  },
  {
    id: "event-2",
    title: "Project Review",
    timeStart: "13:00",
    timeEnd: "14:00",
    location: "Zoom Call",
    type: "review",
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Task Reminder",
    description:
      "Review the quarterly product roadmap with the design team at 2:00 PM.",
    time: "2 min ago",
    isNew: true,
    type: "task",
  },
  {
    id: "notif-2",
    title: "Event Starting Soon",
    description:
      '"AI Ethics Workshop" is starting in 15 minutes. Join the virtual meeting room.',
    time: "10 min ago",
    isNew: true,
    type: "event",
  },
  {
    id: "notif-3",
    title: "New Reminder Set",
    description:
      'Pico added "Buy groceries" to your Kitchen list for tomorrow morning.',
    time: "5 hours ago",
    isNew: false,
    type: "reminder",
  },
];

export const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: "msg-1",
    sender: "assistant",
    text: "I noticed a free gap at 2 PM. Want me to schedule something?",
    timestamp: "Just now",
    actions: [
      { label: "Yes, check tasks", actionId: "check_tasks" },
      { label: "Not now", actionId: "not_now" },
    ],
  },
];

export const INITIAL_PROFILE: ProfileSettings = {
  name: "Alex Johnson",
  email: "alex.johnson@pico-ai.com",
  darkMode: false,
  pushNotifications: true,
  reminderAlerts: true,
};
