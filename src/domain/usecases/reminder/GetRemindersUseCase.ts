import { IReminderRepository } from '../../repositories/IReminderRepository';
import { Reminder } from '../../entities/Reminder';

export class GetRemindersUseCase {
  constructor(private reminderRepository: IReminderRepository) {}

  async execute(): Promise<Reminder[]> {
    return this.reminderRepository.getReminders();
  }
}
