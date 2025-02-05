import { addMinutes, setMinutes, setHours, isBefore, isAfter } from "date-fns";

export function isOverlapping(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return isBefore(start1, end2) && isAfter(end1, start2);
}

interface TimeSlot {
  start: Date;
  end: Date;
}

export function findAvailableSlots(
  preferredStart: Date,
  duration: number,
  existingEvents: TimeSlot[],
  maxSuggestions: number = 3
): Date[] {
  const suggestions: Date[] = [];
  const workdayStart = 9; // 9 AM
  const workdayEnd = 17; // 5 PM
  
  // Sort existing events by start time
  const sortedEvents = [...existingEvents].sort((a, b) => 
    a.start.getTime() - b.start.getTime()
  );

  // Function to check if a time slot is valid
  const isValidTimeSlot = (start: Date, end: Date): boolean => {
    // Check if within working hours
    const hours = start.getHours();
    if (hours < workdayStart || hours >= workdayEnd) return false;

    // Check if slot overlaps with any existing event
    return !sortedEvents.some(event => 
      isOverlapping(start, end, event.start, event.end)
    );
  };

  // Start with preferred time and look forward
  let currentTime = new Date(preferredStart);
  const endOfWeek = addMinutes(preferredStart, 7 * 24 * 60); // Look ahead 1 week max

  while (currentTime < endOfWeek && suggestions.length < maxSuggestions) {
    const potentialEnd = addMinutes(currentTime, duration);
    
    if (isValidTimeSlot(currentTime, potentialEnd)) {
      suggestions.push(new Date(currentTime));
    }

    // Move to next 30-minute slot
    currentTime = addMinutes(currentTime, 30);
    
    // If we've reached end of day, move to start of next work day
    if (currentTime.getHours() >= workdayEnd) {
      currentTime = setHours(setMinutes(addMinutes(currentTime, 24 * 60), 0), workdayStart);
    }
  }

  return suggestions;
}
