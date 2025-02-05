import { Calendar, dateFnsLocalizer, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Event } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-styles.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarViewProps {
  events: Event[];
  isLoading: boolean;
  onSelectSlot: (start: Date) => void;
  onSelectEvent: (event: Event) => void;
}

export default function CalendarView({
  events,
  isLoading,
  onSelectSlot,
  onSelectEvent,
}: CalendarViewProps) {
  if (isLoading) {
    return <Skeleton className="w-full h-[800px]" />;
  }

  const formattedEvents = events.map(event => ({
    ...event,
    start: new Date(event.startTime),
    end: new Date(event.endTime),
  }));

  return (
    <Calendar
      localizer={localizer}
      events={formattedEvents}
      startAccessor="start"
      endAccessor="end"
      style={{ height: 800 }}
      onSelectSlot={(slotInfo: SlotInfo) => onSelectSlot(slotInfo.start)}
      onSelectEvent={onSelectEvent}
      selectable
      className="calendar-custom bg-card rounded-lg shadow-sm p-4"
      tooltipAccessor={(event: Event) => event.description || event.title}
      views={["month", "week", "day"]}
    />
  );
}