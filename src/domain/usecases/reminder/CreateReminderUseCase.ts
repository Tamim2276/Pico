import { IReminderRepository } from '../../repositories/IReminderRepository';
import { Reminder } from '../../entities/Reminder';

export class CreateReminderUseCase {
  constructor(private reminderRepository: IReminderRepository) {}

  async execute(title: string, triggerTime: string): Promise<Reminder> {
    if (!title.trim() || !triggerTime) {
      throw new Error('Reminder title and trigger time are required.');
    }
    return this.reminderRepository.createReminder({
      title,
      triggerTime,
      isCompleted: false,
    });
  }
}
