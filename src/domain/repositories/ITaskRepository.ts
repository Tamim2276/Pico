import { Task } from '../entities/Task';

export interface ITaskRepository {
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task>;
  updateTask(task: Task): Promise<Task>;
  deleteTask(id: string): Promise<void>;
}
