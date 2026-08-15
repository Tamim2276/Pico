import AsyncStorage from '@react-native-async-storage/async-storage';
import { IReminderRepository } from '../../domain/repositories/IReminderRepository';
import { Reminder } from '../../domain/entities/Reminder';

const REMINDERS_KEY = 'PICO_REMINDERS';

export class LocalReminderRepository implements IReminderRepository {
  async getReminders(): Promise<Reminder[]> {
    const data = await AsyncStorage.getItem(REMINDERS_KEY);
    return data ? JSON.parse(data) : [];
  }

  async getReminderById(id: string): Promise<Reminder | null> {
    const reminders = await this.getReminders();
    return reminders.find(r => r.id === id) || null;
  }

  async createReminder(reminderData: Omit<Reminder, 'id'>): Promise<Reminder> {
    const reminders = await this.getReminders();
    const newReminder: Reminder = {
      ...reminderData,
      id: Date.now().toString(),
    };
    reminders.push(newReminder);
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    return newReminder;
  }

  async updateReminder(updatedReminder: Reminder): Promise<Reminder> {
    const reminders = await this.getReminders();
    const index = reminders.findIndex(r => r.id === updatedReminder.id);
    if (index === -1) throw new Error('Reminder not found');
    
    reminders[index] = updatedReminder;
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    return updatedReminder;
  }

  async deleteTask(id: string): Promise<void> {
    const reminders = await this.getReminders();
    const filteredReminders = reminders.filter(r => r.id !== id);
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(filteredReminders));
  }
}
