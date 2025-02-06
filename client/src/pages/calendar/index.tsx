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
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [nlpInput, setNlpInput] = useState("");
  const [conflicts, setConflicts] = useState<Event[]>([]);
  const [suggestions, setSuggestions] = useState<Date[]>([]);
  const { toast } = useToast();
  const { user, login, logout, isLoading: isAuthLoading } = useAuth();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: async (event: Omit<Event, "id">) => {
      const eventWithDefaults = {
        color: null,
        description: null,
        location: null,
        category: null,
        isRecurring: false,
        recurrenceRule: null,
        aiSuggested: true,
        creatorId: 1, // TODO: Replace with actual user ID after auth
        ...event
      };
      const res = await apiRequest("POST", "/api/events", eventWithDefaults);
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

      const eventWithDefaults = {
        color: null,
        description: null,
        location: null,
        category: null,
        isRecurring: false,
        recurrenceRule: null,
        aiSuggested: true,
        creatorId: 1, // TODO: Replace with actual user ID after auth
        ...parsedEvent
      };

      const result = await createMutation.mutateAsync(eventWithDefaults);
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[2000px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-foreground/80" />
            <h1 className="text-lg font-medium">Calendar</h1>
          </div>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => logout()}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => login()}
              disabled={isAuthLoading}
            >
              <LogIn className="h-4 w-4" />
              Sign in with Google
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-[2000px] mx-auto p-6 space-y-6">
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <Input
              placeholder="Type to create event... (e.g. 'Team meeting next Tuesday at 2pm')"
              value={nlpInput}
              onChange={(e) => setNlpInput(e.target.value)}
              className="w-full bg-background text-sm py-5 px-4 rounded-md border shadow-sm"
            />
          </div>
          <Button 
            onClick={handleNlpCreate}
            size="sm"
            className="gap-2 px-4"
          >
            <Sparkles className="h-4 w-4" />
            Create
          </Button>
        </div>

        <div className="rounded-lg overflow-hidden border bg-card/50 backdrop-blur-sm shadow-sm">
          <CalendarView
            events={events}
            isLoading={isLoading}
            onSelectSlot={(start) => setSelectedDate(start)}
            onSelectEvent={(event) => setSelectedEvent(event)}
          />
          <Button
            className="absolute bottom-6 right-6 gap-2 shadow-sm rounded-md"
            onClick={() => setSelectedDate(new Date())}
            size="sm"
            variant="secondary"
          >
            <Plus className="h-4 w-4" />
            Event
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