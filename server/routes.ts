import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertEventSchema } from "@shared/schema";
import { z } from "zod";
import authRouter from "./routes/auth";

export function registerRoutes(app: Express) {
  // Register auth routes
  app.use("/api/auth", authRouter);

  app.get("/api/events", async (_req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.post("/api/events", async (req, res) => {
    try {
      const event = insertEventSchema.parse(req.body);
      const { event: created, conflicts, suggestions } = await storage.createEvent(event);
      res.json({ event: created, conflicts, suggestions });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid event data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create event" });
      }
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    try {
      const updateData = insertEventSchema.partial().parse(req.body);
      const { event: updated, conflicts, suggestions } = await storage.updateEvent(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json({ event: updated, conflicts, suggestions });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid event data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update event" });
      }
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const deleted = await storage.deleteEvent(id);
    if (!deleted) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(204).end();
  });

  return createServer(app);
}