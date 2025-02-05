import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Event } from "@shared/schema";
import CalendarView from "./components/CalendarView";
import EventForm from "./components/EventForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Sparkles, Plus, LogIn } from "lucide-react";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [nlpInput, setNlpInput] = useState("");
  const { toast } = useToast();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: async (event: Omit<Event, "id">) => {
      const res = await apiRequest("POST", "/api/events", event);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event created successfully" });
      setSelectedDate(null);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create event", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...event }: Event) => {
      const res = await apiRequest("PATCH", `/api/events/${id}`, event);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event updated successfully" });
      setSelectedEvent(null);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update event",
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event deleted successfully" });
      setSelectedEvent(null);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete event",
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleNlpCreate = async () => {
    if (!nlpInput.trim()) return;
    // Gemini API integration will be added here
    toast({ 
      title: "Processing...",
      description: "Using AI to create your event"
    });
    setNlpInput("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[2000px] mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">AI Calendar</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <LogIn className="h-4 w-4" />
            Sign in with Google
          </Button>
        </div>
      </header>

      <main className="max-w-[2000px] mx-auto p-4 space-y-6">
        {/* NLP Input Section */}
        <div className="flex gap-2 items-center bg-card p-4 rounded-xl shadow-sm border">
          <Input
            placeholder="Create event using AI... (e.g. 'Setup team meeting next Tuesday at 2pm')"
            value={nlpInput}
            onChange={(e) => setNlpInput(e.target.value)}
            className="flex-1 text-base"
          />
          <Button 
            onClick={handleNlpCreate}
            className="gap-2"
            size="lg"
          >
            <Sparkles className="h-4 w-4" />
            Create with AI
          </Button>
        </div>

        <div className="relative">
          <CalendarView
            events={events}
            isLoading={isLoading}
            onSelectSlot={(start) => setSelectedDate(start)}
            onSelectEvent={(event) => setSelectedEvent(event)}
          />
          <Button
            className="absolute bottom-4 right-4 gap-2 shadow-lg"
            onClick={() => setSelectedDate(new Date())}
            size="lg"
          >
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </div>
      </main>

      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <EventForm
            initialDate={selectedDate}
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <EventForm
            event={selectedEvent}
            onSubmit={(data) => updateMutation.mutate(data as Event)}
            onDelete={() => selectedEvent && deleteMutation.mutate(selectedEvent.id)}
            isLoading={updateMutation.isPending || deleteMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}