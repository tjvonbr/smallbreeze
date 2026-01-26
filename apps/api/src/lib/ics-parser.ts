import ical from 'node-ical';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  allDay: boolean;
}

interface ICalEvent {
  type: string;
  uid?: string;
  summary?: string;
  description?: string;
  start?: Date;
  end?: Date;
  location?: string;
  datetype?: string;
}

export async function parseCalendarUrl(url: string): Promise<CalendarEvent[]> {
  try {
    const rawEvents = await ical.async.fromURL(url);
    return parseEvents(rawEvents);
  } catch (error) {
    console.error(`Failed to parse calendar URL: ${url}`, error);
    return [];
  }
}

function parseEvents(events: Record<string, ICalEvent>): CalendarEvent[] {
  const calendarEvents: CalendarEvent[] = [];

  for (const key in events) {
    const event = events[key];

    if (event.type === 'VEVENT' && event.start) {
      const calendarEvent: CalendarEvent = {
        id: event.uid || key,
        summary: event.summary || 'No Title',
        description: event.description,
        start: new Date(event.start),
        end: event.end ? new Date(event.end) : new Date(event.start),
        location: event.location,
        allDay:
          event.datetype === 'date' ||
          !!(
            event.start &&
            event.end &&
            new Date(event.start).getHours() === 0 &&
            new Date(event.end).getHours() === 0 &&
            new Date(event.start).getMinutes() === 0 &&
            new Date(event.end).getMinutes() === 0
          ),
      };

      calendarEvents.push(calendarEvent);
    }
  }

  return calendarEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function getNextCheckIn(events: CalendarEvent[]): Date | null {
  const now = new Date();
  const futureEvents = events.filter((event) => event.start > now);

  if (futureEvents.length === 0) {
    return null;
  }

  return futureEvents[0].start;
}
