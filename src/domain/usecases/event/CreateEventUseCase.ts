import { IEventRepository } from '../../repositories/IEventRepository';
import { Event } from '../../entities/Event';

export class CreateEventUseCase {
  constructor(private eventRepository: IEventRepository) {}

  async execute(title: string, startTime: string, endTime: string, location?: string, description?: string): Promise<Event> {
    if (!title.trim() || !startTime || !endTime) {
      throw new Error('Event title, start time, and end time are required.');
    }
    return this.eventRepository.createEvent({
      title,
      startTime,
      endTime,
      location,
      description,
    });
  }
}
