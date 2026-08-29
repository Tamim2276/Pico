import * as SecureStore from 'expo-secure-store';
import { IEventRepository } from '../../domain/repositories/IEventRepository';
import { Event } from '../../domain/entities/Event';

const EVENTS_KEY = 'PICO_EVENTS';

export class LocalEventRepository implements IEventRepository {
  async getEvents(): Promise<Event[]> {
    const data = await SecureStore.getItemAsync(EVENTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  async getEventById(id: string): Promise<Event | null> {
    const events = await this.getEvents();
    return events.find(e => e.id === id) || null;
  }

  async createEvent(eventData: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
    const events = await this.getEvents();
    const newEvent: Event = {
      ...eventData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    events.push(newEvent);
    await SecureStore.setItemAsync(EVENTS_KEY, JSON.stringify(events));
    return newEvent;
  }

  async updateEvent(updatedEvent: Event): Promise<Event> {
    const events = await this.getEvents();
    const index = events.findIndex(e => e.id === updatedEvent.id);
    if (index === -1) throw new Error('Event not found');
    
    events[index] = updatedEvent;
    await SecureStore.setItemAsync(EVENTS_KEY, JSON.stringify(events));
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    const events = await this.getEvents();
    const filteredEvents = events.filter(e => e.id !== id);
    await SecureStore.setItemAsync(EVENTS_KEY, JSON.stringify(filteredEvents));
  }
}
