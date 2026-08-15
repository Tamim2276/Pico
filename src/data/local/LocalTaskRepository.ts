import AsyncStorage from '@react-native-async-storage/async-storage';
import { ITaskRepository } from '../../domain/repositories/ITaskRepository';
import { Task } from '../../domain/entities/Task';

const TASKS_KEY = 'PICO_TASKS';

export class LocalTaskRepository implements ITaskRepository {
  async getTasks(): Promise<Task[]> {
    const data = await AsyncStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  }

  async getTaskById(id: string): Promise<Task | null> {
    const tasks = await this.getTasks();
    return tasks.find(t => t.id === id) || null;
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const tasks = await this.getTasks();
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    return newTask;
  }

  async updateTask(updatedTask: Task): Promise<Task> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === updatedTask.id);
    if (index === -1) throw new Error('Task not found');
    
    tasks[index] = updatedTask;
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    const tasks = await this.getTasks();
    const filteredTasks = tasks.filter(t => t.id !== id);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(filteredTasks));
  }
}
