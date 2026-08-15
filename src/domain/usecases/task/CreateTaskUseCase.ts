import { ITaskRepository } from '../../repositories/ITaskRepository';
import { Task } from '../../entities/Task';

export class CreateTaskUseCase {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(title: string, description?: string, dueDate?: string): Promise<Task> {
    if (!title.trim()) {
      throw new Error('Task title cannot be empty.');
    }
    return this.taskRepository.createTask({
      title,
      description,
      dueDate,
      isCompleted: false,
    });
  }
}
