import { ITaskRepository } from '../../repositories/ITaskRepository';
import { Task } from '../../entities/Task';

export class GetTasksUseCase {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(): Promise<Task[]> {
    return this.taskRepository.getTasks();
  }
}
