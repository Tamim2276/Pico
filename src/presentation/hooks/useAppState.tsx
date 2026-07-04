import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  Task,
  CalendarEvent,
  NotificationItem,
  AssistantMessage,
  ProfileSettings,
} from "@shared/types";
import {
  INITIAL_TASKS,
  INITIAL_EVENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_MESSAGES,
  INITIAL_PROFILE,
} from "@shared/constants/data";

// Lightweight shared app state (tasks/events/notifications/profile),
// lifted here so Home/Tasks/Calendar/Profile/Assistant screens can all
// read and update the same in-memory data. No persistence/backend yet —
// this mirrors how the original web prototype held state, just adapted
// to this project's Clean Architecture layout (lives in presentation/hooks
// since it's UI-facing state, not a domain use case).

interface AppStateShape {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  messages: AssistantMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AssistantMessage[]>>;
  profile: ProfileSettings;
  setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>;
  insightActive: boolean;
  setInsightActive: React.Dispatch<React.SetStateAction<boolean>>;
  toastMessage: string | null;
  triggerToast: (msg: string) => void;
}

const AppStateContext = createContext<AppStateShape | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS
  );
  const [messages, setMessages] = useState<AssistantMessage[]>(INITIAL_MESSAGES);
  const [profile, setProfile] = useState<ProfileSettings>(INITIAL_PROFILE);
  const [insightActive, setInsightActive] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <AppStateContext.Provider
      value={{
        tasks,
        setTasks,
        events,
        setEvents,
        notifications,
        setNotifications,
        messages,
        setMessages,
        profile,
        setProfile,
        insightActive,
        setInsightActive,
        toastMessage,
        triggerToast,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
