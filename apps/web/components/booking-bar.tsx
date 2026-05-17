import Link from "next/link";
import { CalendarEvent } from "@/lib/ics-parser";
import { isSameDay } from "@/lib/utils";

interface BookingBarProps {
  event: CalendarEvent;
  currentDate: Date;
  isCheckoutOnly?: boolean;
  hasTurnoverToday?: boolean;
  href?: string;
}

export default function BookingBar({ event, currentDate, isCheckoutOnly = false, hasTurnoverToday = false, href }: BookingBarProps) {
  const isStartDate = isSameDay(event.start, currentDate);
  const isEndDate = isSameDay(event.end, currentDate);

  const getBarStyles = () => {
      if (isCheckoutOnly) {
        return "h-6 w-4/5 left-1/2 -translate-x-1/2 rounded-md";
      }
    
    if (isStartDate) {
      return hasTurnoverToday
        ? "h-6 w-[calc(50%-2px)] right-[-1px]"
        : "h-6 w-[calc(50%+1px)] right-[-1px]";
    } else if (isEndDate) {
      return hasTurnoverToday
        ? "h-6 w-[calc(50%-2px)] left-[-1px]"
        : "h-6 w-[calc(50%+1px)] left-[-1px]";
    } else {
      return "h-6 w-[calc(100%+2px)] left-[-1px]";
    }
  };

  const getSvgPath = () => {
    // Use a normalized 0..100 viewBox so percentages scale with the bar
    const b = 12; // bevel in percentage of width/height
    if (isStartDate && isEndDate) {
      return `M ${b} 0 L 100 0 Q 100 50 ${100 - b} 100 L 0 100 Q 0 50 ${b} 0 Z`;
    }
    if (isStartDate) {
      return `M ${b} 0 L 100 0 L 100 100 L 0 100 Q 0 50 ${b} 0 Z`;
    }
    if (isEndDate) {
      return `M 0 0 L 100 0 Q 100 50 ${100 - b} 100 L 0 100 Z`;
    }
    return `M 0 0 L 100 0 L 100 100 L 0 100 Z`;
  };

  const title = `${event.summary} - ${event.start.toLocaleDateString()} to ${event.end.toLocaleDateString()}`;

  if (isCheckoutOnly) {
    const bar = (
      <div
        className={`absolute top-1/2 -translate-y-1/2 flex justify-center items-center bg-primary dark:bg-white ${getBarStyles()} ${href ? "cursor-pointer" : "pointer-events-none"}`}
        title={title}
      >
        <p className="text-xs text-white">{event.listing.nickname}</p>
      </div>
    );
    return href ? (
      <Link href={href} className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        {bar}
      </Link>
    ) : bar;
  }

  const bar = (
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${getBarStyles()} text-primary dark:text-white ${href ? "cursor-pointer" : "pointer-events-none"}`}
      title={title}
    >
      <svg className="w-full h-full block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d={getSvgPath()} fill="currentColor" />
      </svg>
    </div>
  );

  return href ? (
    <Link href={href} className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
      {bar}
    </Link>
  ) : bar;
}
