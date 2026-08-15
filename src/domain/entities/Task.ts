export interface Task {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  dueDate?: string; // ISO string
  createdAt: string; // ISO string
}
