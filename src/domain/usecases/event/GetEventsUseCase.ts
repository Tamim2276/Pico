import { IEventRepository } from '../../repositories/IEventRepository';
import { Event } from '../../entities/Event';

export class GetEventsUseCase {
  constructor(private eventRepository: IEventRepository) {}

  async execute(): Promise<Event[]> {
    return this.eventRepository.getEvents();
  }
}
