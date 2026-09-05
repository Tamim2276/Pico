export type Priority = "High" | "Medium" | "Low";

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  category: string;
  dueDate?: string; // ISO string
  createdAt: string; // ISO string
}
