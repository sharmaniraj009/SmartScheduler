import { events, type Event, type InsertEvent } from "@shared/schema";
import { isOverlapping, findAvailableSlots } from "./utils";

export interface IStorage {
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<{ event: Event; conflicts: Event[]; suggestions: Date[] }>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<{ event: Event | undefined; conflicts: Event[]; suggestions: Date[] }>;
  deleteEvent(id: number): Promise<boolean>;
  findConflicts(startTime: Date, endTime: Date, excludeEventId?: number): Promise<Event[]>;
  suggestAlternativeTimes(startTime: Date, endTime: Date, excludeEventId?: number): Promise<Date[]>;
}

export class MemStorage implements IStorage {
  private events: Map<number, Event>;
  private currentId: number;

  constructor() {
    this.events = new Map();
    this.currentId = 1;
  }

  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async findConflicts(startTime: Date, endTime: Date, excludeEventId?: number): Promise<Event[]> {
    const allEvents = await this.getEvents();
    return allEvents.filter(event => 
      event.id !== excludeEventId && 
      isOverlapping(
        new Date(startTime), 
        new Date(endTime),
        new Date(event.startTime),
        new Date(event.endTime)
      )
    );
  }

  async suggestAlternativeTimes(startTime: Date, endTime: Date, excludeEventId?: number): Promise<Date[]> {
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    const allEvents = await this.getEvents();
    const relevantEvents = allEvents.filter(event => event.id !== excludeEventId);

    return findAvailableSlots(
      new Date(startTime),
      duration,
      relevantEvents.map(event => ({
        start: new Date(event.startTime),
        end: new Date(event.endTime)
      }))
    );
  }

  async createEvent(insertEvent: InsertEvent): Promise<{ event: Event; conflicts: Event[]; suggestions: Date[] }> {
    const startTime = new Date(insertEvent.startTime);
    const endTime = new Date(insertEvent.endTime);

    // Find any conflicts
    const conflicts = await this.findConflicts(startTime, endTime);

    // Generate suggestions if there are conflicts
    const suggestions = conflicts.length > 0 
      ? await this.suggestAlternativeTimes(startTime, endTime)
      : [];

    const id = this.currentId++;
    const event: Event = {
      ...insertEvent,
      id,
      startTime,
      endTime,
      description: insertEvent.description || null,
      location: insertEvent.location || null
    };

    this.events.set(id, event);
    return { event, conflicts, suggestions };
  }

  async updateEvent(id: number, updateEvent: Partial<InsertEvent>): Promise<{ event: Event | undefined; conflicts: Event[]; suggestions: Date[] }> {
    const existingEvent = this.events.get(id);
    if (!existingEvent) return { event: undefined, conflicts: [], suggestions: [] };

    const startTime = updateEvent.startTime ? new Date(updateEvent.startTime) : existingEvent.startTime;
    const endTime = updateEvent.endTime ? new Date(updateEvent.endTime) : existingEvent.endTime;

    // Find any conflicts
    const conflicts = await this.findConflicts(startTime, endTime, id);

    // Generate suggestions if there are conflicts
    const suggestions = conflicts.length > 0 
      ? await this.suggestAlternativeTimes(startTime, endTime, id)
      : [];

    const updatedEvent: Event = {
      ...existingEvent,
      ...updateEvent,
      startTime,
      endTime,
      description: updateEvent.description !== undefined ? (updateEvent.description || null) : existingEvent.description,
      location: updateEvent.location !== undefined ? (updateEvent.location || null) : existingEvent.location,
    };

    this.events.set(id, updatedEvent);
    return { event: updatedEvent, conflicts, suggestions };
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }
}

export const storage = new MemStorage();