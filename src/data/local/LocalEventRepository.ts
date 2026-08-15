import AsyncStorage from '@react-native-async-storage/async-storage';
import { IEventRepository } from '../../domain/repositories/IEventRepository';
import { Event } from '../../domain/entities/Event';

const EVENTS_KEY = 'PICO_EVENTS';

export class LocalEventRepository implements IEventRepository {
  async getEvents(): Promise<Event[]> {
    const data = await AsyncStorage.getItem(EVENTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  async getEventById(id: string): Promise<Event | null> {
    const events = await this.getEvents();
    return events.find(e => e.id === id) || null;
  }

  async createEvent(eventData: Omit<Event, 'id'>): Promise<Event> {
    const events = await this.getEvents();
    const newEvent: Event = {
      ...eventData,
      id: Date.now().toString(),
    };
    events.push(newEvent);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    return newEvent;
  }

  async updateEvent(updatedEvent: Event): Promise<Event> {
    const events = await this.getEvents();
    const index = events.findIndex(e => e.id === updatedEvent.id);
    if (index === -1) throw new Error('Event not found');
    
    events[index] = updatedEvent;
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    return updatedEvent;
  }

  async deleteTask(id: string): Promise<void> {
    const events = await this.getEvents();
    const filteredEvents = events.filter(e => e.id !== id);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(filteredEvents));
  }
}
