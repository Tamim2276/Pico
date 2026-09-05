import { Event } from '../entities/Event';

export interface IEventRepository {
  getEvents(): Promise<Event[]>;
  getEventById(id: string): Promise<Event | null>;
  createEvent(event: Omit<Event, 'id'>): Promise<Event>;
  updateEvent(event: Event): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
}
