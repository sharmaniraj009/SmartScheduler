import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for storing user preferences and settings
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  timeZone: text("time_zone").notNull().default("UTC"),
  preferences: jsonb("preferences").default({}).notNull(),
});

// Events table with enhanced features
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  creatorId: integer("creator_id").references(() => users.id).notNull(),
  category: text("category"),
  color: text("color"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"),
  aiSuggested: boolean("ai_suggested").default(false),
});

// Tasks integrated with calendar events
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").default(false),
  priority: text("priority").default("medium"),
  userId: integer("user_id").references(() => users.id).notNull(),
  relatedEventId: integer("related_event_id").references(() => events.id),
});

// Event participants and their responses
export const eventParticipants = pgTable("event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status").default("pending"), // pending, accepted, declined, tentative
  availability: jsonb("availability").default([]),
});

// Generate insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertEventSchema = createInsertSchema(events)
  .omit({ id: true })
  .extend({
    startTime: z.string().or(z.date()),
    endTime: z.string().or(z.date()),
  });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertEventParticipantSchema = createInsertSchema(eventParticipants).omit({ id: true });

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertEventParticipant = z.infer<typeof insertEventParticipantSchema>;

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type EventParticipant = typeof eventParticipants.$inferSelect;