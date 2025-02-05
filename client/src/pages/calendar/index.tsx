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
import { Calendar as CalendarIcon, Sparkles, Plus, LogIn, AlertCircle } from "lucide-react";
import { parseEventWithGemini } from "@/lib/gemini";
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [nlpInput, setNlpInput] = useState("");
  const [conflicts, setConflicts] = useState<Event[]>([]);
  const [suggestions, setSuggestions] = useState<Date[]>([]);
  const { toast } = useToast();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: async (event: Omit<Event, "id">) => {
      const res = await apiRequest("POST", "/api/events", event);
      return res.json();
    },
    onSuccess: (data) => {
      // Check for conflicts
      if (data.conflicts?.length > 0) {
        setConflicts(data.conflicts);
        setSuggestions(data.suggestions || []);
        toast({ 
          title: "Scheduling Conflict Detected", 
          description: "There are conflicting events. Please choose a different time or review suggestions.",
          variant: "destructive"
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        toast({ title: "Event created successfully" });
        setSelectedDate(null);
        setConflicts([]);
        setSuggestions([]);
      }
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
    onSuccess: (data) => {
      if (data.conflicts?.length > 0) {
        setConflicts(data.conflicts);
        setSuggestions(data.suggestions || []);
        toast({ 
          title: "Scheduling Conflict Detected", 
          description: "There are conflicting events. Please choose a different time or review suggestions.",
          variant: "destructive"
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        toast({ title: "Event updated successfully" });
        setSelectedEvent(null);
        setConflicts([]);
        setSuggestions([]);
      }
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

    const toastId = toast({ 
      title: "Processing with AI...",
      description: "Analyzing your request and creating an event...",
    });

    try {
      const parsedEvent = await parseEventWithGemini(nlpInput);
      if (!parsedEvent) {
        throw new Error("Could not understand the event details. Please try being more specific with the time and title.");
      }

      const result = await createMutation.mutateAsync(parsedEvent);
      if (!result.conflicts?.length) {
        setNlpInput("");
        toast({
          title: "Event created successfully",
          description: `Created "${parsedEvent.title}" starting at ${format(new Date(parsedEvent.startTime), 'PPp')}`,
        });
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Couldn't create event",
        description: error instanceof Error 
          ? error.message 
          : "Please try being more specific with the event details.",
        variant: "destructive",
      });
    }
  };

  const handleSuggestedTime = (suggestedTime: Date) => {
    const duration = selectedEvent 
      ? new Date(selectedEvent.endTime).getTime() - new Date(selectedEvent.startTime).getTime()
      : 3600000; // 1 hour default

    const endTime = new Date(suggestedTime.getTime() + duration);

    if (selectedEvent) {
      updateMutation.mutate({
        ...selectedEvent,
        startTime: suggestedTime,
        endTime,
      });
    } else {
      createMutation.mutate({
        ...(selectedEvent || {}),
        startTime: suggestedTime,
        endTime,
      } as any);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80">
      <header className="border-b bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[2000px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">AI Calendar</h1>
          </div>
          <Button variant="outline" size="lg" className="gap-2 px-6">
            <LogIn className="h-4 w-4" />
            Sign in with Google
          </Button>
        </div>
      </header>

      <main className="max-w-[2000px] mx-auto p-6 space-y-8">
        {/* NLP Input Section */}
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 opacity-25 blur-xl transition-all duration-500 group-hover:opacity-50" />
            <Input
              placeholder="Create event using AI... (e.g. 'Setup team meeting next Tuesday at 2pm')"
              value={nlpInput}
              onChange={(e) => setNlpInput(e.target.value)}
              className="w-full bg-card/50 backdrop-blur-sm text-base py-6 px-6 rounded-2xl border-0 shadow-sm transition-all duration-300 hover:shadow-md focus:shadow-lg"
            />
          </div>
          <Button 
            onClick={handleNlpCreate}
            size="lg"
            className="gap-2 px-8 h-14 rounded-2xl bg-primary hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:scale-105"
          >
            <Sparkles className="h-5 w-5" />
            Create with AI
          </Button>
        </div>

        <div className="relative rounded-[32px] overflow-hidden border bg-card/50 backdrop-blur-sm shadow-xl">
          <CalendarView
            events={events}
            isLoading={isLoading}
            onSelectSlot={(start) => setSelectedDate(start)}
            onSelectEvent={(event) => setSelectedEvent(event)}
          />
          <Button
            className="absolute bottom-6 right-6 gap-2 shadow-lg rounded-2xl px-8 h-14 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105"
            onClick={() => setSelectedDate(new Date())}
            size="lg"
          >
            <Plus className="h-5 w-5" />
            New Event
          </Button>
        </div>
      </main>

      <Dialog open={!!selectedDate} onOpenChange={() => {
        setSelectedDate(null);
        setConflicts([]);
        setSuggestions([]);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          {conflicts.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Scheduling Conflict</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <p>This event conflicts with:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {conflicts.map((conflict) => (
                      <li key={conflict.id}>
                        {conflict.title} ({format(new Date(conflict.startTime), 'PPp')})
                      </li>
                    ))}
                  </ul>
                  {suggestions.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold mb-2">Suggested alternative times:</p>
                      <div className="space-y-2">
                        {suggestions.map((time, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => handleSuggestedTime(time)}
                          >
                            {format(time, 'PPp')}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
          <EventForm
            initialDate={selectedDate}
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEvent} onOpenChange={() => {
        setSelectedEvent(null);
        setConflicts([]);
        setSuggestions([]);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {conflicts.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Scheduling Conflict</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <p>This event conflicts with:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {conflicts.map((conflict) => (
                      <li key={conflict.id}>
                        {conflict.title} ({format(new Date(conflict.startTime), 'PPp')})
                      </li>
                    ))}
                  </ul>
                  {suggestions.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold mb-2">Suggested alternative times:</p>
                      <div className="space-y-2">
                        {suggestions.map((time, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => handleSuggestedTime(time)}
                          >
                            {format(time, 'PPp')}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
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