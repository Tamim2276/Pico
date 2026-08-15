import { Reminder } from '../entities/Reminder';

export interface IReminderRepository {
  getReminders(): Promise<Reminder[]>;
  getReminderById(id: string): Promise<Reminder | null>;
  createReminder(reminder: Omit<Reminder, 'id'>): Promise<Reminder>;
  updateReminder(reminder: Reminder): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;
}
