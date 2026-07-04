export type Priority = "High" | "Medium" | "Low";
export type TaskCategory = "Work" | "Personal" | "Design" | "Kitchen";
export type EventType = "meeting" | "review" | "personal";
export type NotificationType = "task" | "event" | "reminder";

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string;
  category: TaskCategory;
  completed: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  type: EventType;
  attendeeAvatars?: string[];
  attendeesCount?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  isNew: boolean;
  type: NotificationType;
}

export interface AssistantMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  actions?: { label: string; actionId: string }[];
}

export interface ProfileSettings {
  name: string;
  email: string;
  darkMode: boolean;
  pushNotifications: boolean;
  reminderAlerts: boolean;
}
