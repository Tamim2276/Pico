import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Event } from '../../domain/entities/Event';
import { LocalEventRepository } from '../../data/local/LocalEventRepository';
import { CreateEventUseCase } from '../../domain/usecases/event/CreateEventUseCase';
import { GetEventsUseCase } from '../../domain/usecases/event/GetEventsUseCase';

interface EventContextType {
  events: Event[];
  isLoading: boolean;
  createEvent: (title: string, startTime: string, endTime: string, location?: string, description?: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const EventContext = createContext<EventContextType | undefined>(undefined);

const eventRepo = new LocalEventRepository();
const createEventUseCase = new CreateEventUseCase(eventRepo);
const getEventsUseCase = new GetEventsUseCase(eventRepo);

export const EventProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const fetchedEvents = await getEventsUseCase.execute();
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Failed to fetch events", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const createEvent = async (title: string, startTime: string, endTime: string, location?: string, description?: string) => {
    await createEventUseCase.execute(title, startTime, endTime, location, description);
    await fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await eventRepo.deleteEvent(id);
    await fetchEvents();
  };

  return (
    <EventContext.Provider value={{ events, isLoading, createEvent, deleteEvent }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};
