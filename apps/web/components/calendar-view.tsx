'use client';

import React, { useState } from 'react';
import type { DayProps } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { CalendarEvent } from '@/lib/ics-parser';
import DayCell from './day-cell';

interface CalendarViewProps {
  events: CalendarEvent[]
  showOnlyCheckoutDays?: boolean
  listingId?: string
}

export default function CalendarView({ events, showOnlyCheckoutDays = false, listingId }: CalendarViewProps ) {  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        className="rounded-md [&_.rdp-table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-0"
        components={{
          Day: (props: DayProps) => (
            <DayCell
              day={props.day.date}
              events={events}
              selectDate={setSelectedDate}
              showOnlyCheckoutDays={showOnlyCheckoutDays}
              isOutsideMonth={props.modifiers?.outside ?? false}
              listingId={listingId}
            />
          )
        }}
      />
    </div>
  );
} 