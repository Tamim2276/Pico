import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Task, Priority } from '../../domain/entities/Task';
import { LocalTaskRepository } from '../../data/local/LocalTaskRepository';
import { CreateTaskUseCase } from '../../domain/usecases/task/CreateTaskUseCase';
import { GetTasksUseCase } from '../../domain/usecases/task/GetTasksUseCase';

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  createTask: (title: string, priority?: Priority, category?: string, description?: string, dueDate?: string) => Promise<void>;
  toggleTaskCompletion: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const TaskContext = createContext<TaskContextType | undefined>(undefined);

const taskRepo = new LocalTaskRepository();
const createTaskUseCase = new CreateTaskUseCase(taskRepo);
const getTasksUseCase = new GetTasksUseCase(taskRepo);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const fetchedTasks = await getTasksUseCase.execute();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const createTask = async (title: string, priority: Priority = 'Medium', category: string = 'General', description?: string, dueDate?: string) => {
    await createTaskUseCase.execute(title, priority, category, description, dueDate);
    await fetchTasks();
  };

  const toggleTaskCompletion = async (task: Task) => {
    await taskRepo.updateTask({ ...task, completed: !task.completed });
    await fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await taskRepo.deleteTask(id);
    await fetchTasks();
  };

  return (
    <TaskContext.Provider value={{ tasks, isLoading, createTask, toggleTaskCompletion, deleteTask }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
