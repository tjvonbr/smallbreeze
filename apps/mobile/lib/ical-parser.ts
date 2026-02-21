export interface Reservation {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  allDay: boolean;
  source?: string;
}

export function parseICalDate(value: string): string {
  // Handle formats: 20260125 or 20260125T120000 or 20260125T120000Z
  const cleaned = value.replace(/[^0-9TZ]/g, '');

  if (cleaned.length >= 8) {
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);

    if (cleaned.length >= 15) {
      // Has time component
      const hour = cleaned.substring(9, 11);
      const minute = cleaned.substring(11, 13);
      const second = cleaned.substring(13, 15);
      const isUTC = cleaned.endsWith('Z');
      return `${year}-${month}-${day}T${hour}:${minute}:${second}${isUTC ? 'Z' : ''}`;
    }

    // Date only
    return `${year}-${month}-${day}T00:00:00`;
  }

  return value;
}

// Simple iCal parser for VEVENT blocks
export function parseICalText(icalText: string): Reservation[] {
  const events: Reservation[] = [];
  const lines = icalText.split(/\r?\n/);

  let currentEvent: Partial<Reservation> | null = null;

  for (const line of lines) {
    // Handle line continuations (lines starting with space or tab)
    if (line.startsWith(' ') || line.startsWith('\t')) {
      continue;
    }

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.start && currentEvent.end) {
        events.push({
          id: currentEvent.id || Math.random().toString(),
          summary: currentEvent.summary || 'Reserved',
          start: currentEvent.start,
          end: currentEvent.end,
          description: currentEvent.description,
          location: currentEvent.location,
          allDay: true,
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).split(';')[0]; // Handle params like DTSTART;VALUE=DATE
        const value = line.substring(colonIndex + 1);

        if (key === 'UID') {
          currentEvent.id = value;
        } else if (key === 'SUMMARY') {
          currentEvent.summary = value;
        } else if (key === 'DESCRIPTION') {
          currentEvent.description = value;
        } else if (key === 'LOCATION') {
          currentEvent.location = value;
        } else if (key === 'DTSTART') {
          currentEvent.start = parseICalDate(value);
        } else if (key === 'DTEND') {
          currentEvent.end = parseICalDate(value);
        }
      }
    }
  }

  return events;
}
