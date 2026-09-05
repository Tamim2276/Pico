import { ITaskRepository } from '../../repositories/ITaskRepository';
import { Task, Priority } from '../../entities/Task';

export class CreateTaskUseCase {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(title: string, priority: Priority = 'Medium', category: string = 'General', description?: string, dueDate?: string): Promise<Task> {
    if (!title.trim()) {
      throw new Error('Task title cannot be empty.');
    }
    return this.taskRepository.createTask({
      title,
      description,
      dueDate,
      priority,
      category,
      completed: false,
    });
  }
}
