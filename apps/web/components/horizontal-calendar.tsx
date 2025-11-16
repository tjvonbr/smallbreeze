'use client'

import React from "react"
import { cn } from "@/lib/utils"
import type { ListingWithCalendarLinks } from "@/types/listings"
import type { CalendarEvent } from "@/lib/ics-parser"
import BookingBar from "./booking-bar"
import { isSameDay } from "@/lib/utils"
import Link from "next/link"

interface HorizontalCalendarProps {
  listings: ListingWithCalendarLinks[]
  events: CalendarEvent[]
  startDays?: number
  extendDaysOnScroll?: number
  dayWidthPx?: number
}

function startOfDayUtc(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysBetween(a: Date, b: Date) {
  const msPerDay = 24 * 60 * 60 * 1000
  const a0 = startOfDayUtc(a).getTime()
  const b0 = startOfDayUtc(b).getTime()
  return Math.floor((b0 - a0) / msPerDay)
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export default function HorizontalCalendar({
  listings,
  events,
  startDays = 90,
  extendDaysOnScroll = 60,
  dayWidthPx = 40,
}: HorizontalCalendarProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const today = startOfDayUtc(new Date())
  const initialPastDays = 21
  const [numDays, setNumDays] = React.useState(startDays)
  const [startDate, setStartDate] = React.useState(() => addDays(today, -initialPastDays))
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const headerTrackRef = React.useRef<HTMLDivElement | null>(null)
  const [columnWidth, setColumnWidth] = React.useState(dayWidthPx)
  const [showJumpToToday, setShowJumpToToday] = React.useState(false)

  const totalWidth = numDays * columnWidth
  const todayIndex = daysBetween(startDate, today)

  const syncHeaderPosition = (scrollLeft: number) => {
    const track = headerTrackRef.current
    if (track) track.style.transform = `translateX(-${scrollLeft}px)`
  }

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const threshold = Math.max(200, columnWidth * 2)
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - threshold) {
      setNumDays((d) => d + extendDaysOnScroll)
    }
    if (el.scrollLeft <= threshold) {
      setStartDate((prev) => addDays(prev, -extendDaysOnScroll))
      setNumDays((d) => d + extendDaysOnScroll)
      requestAnimationFrame(() => {
        const node = scrollRef.current
        if (node) node.scrollLeft += extendDaysOnScroll * columnWidth
      })
    }
    syncHeaderPosition(el.scrollLeft)
    const todayLeft = todayIndex * columnWidth
    setShowJumpToToday(Math.abs(el.scrollLeft - todayLeft) > threshold)
  }, [columnWidth, todayIndex, extendDaysOnScroll])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll as EventListener)
  }, [handleScroll])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const compute = () => {
      const width = el.clientWidth
      const col = Math.max(24, Math.floor(width / 7))
      setColumnWidth(col)
      syncHeaderPosition(el.scrollLeft)
      const todayLeft = todayIndex * col
      const threshold = Math.max(200, col * 2)
      setShowJumpToToday(Math.abs(el.scrollLeft - todayLeft) > threshold)
    }
    compute()
    const ro = new ResizeObserver(() => compute())
    ro.observe(el)
    return () => ro.disconnect()
  }, [todayIndex])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (todayIndex >= 0) {
      el.scrollLeft = todayIndex * columnWidth
      syncHeaderPosition(el.scrollLeft)
    }
  }, [columnWidth, todayIndex])

  // Route wheel events to horizontal scroll and prevent page scroll while hovering the calendar
  React.useEffect(() => {
    const wrapper = wrapperRef.current
    const scroller = scrollRef.current
    if (!wrapper || !scroller) return
    const onWheel = (e: WheelEvent) => {
      // Always handle wheel inside the calendar to avoid page scroll
      e.preventDefault()
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      scroller.scrollLeft += delta
      syncHeaderPosition(scroller.scrollLeft)
    }
    wrapper.addEventListener('wheel', onWheel, { passive: false })
    return () => wrapper.removeEventListener('wheel', onWheel as unknown as EventListener)
  }, [columnWidth])

  const daysArray = React.useMemo(() => {
    return Array.from({ length: numDays }, (_, i) => addDays(startDate, i))
  }, [numDays, startDate])

  const eventsByListing = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const arr = map.get(e.listing.id) || []
      arr.push(e)
      map.set(e.listing.id, arr)
    }

    for (const [key, value] of map) {
      value.sort((a, b) => a.start.getTime() - b.start.getTime())
      map.set(key, value)
    }
    return map
  }, [events])

  return (
    <div ref={wrapperRef} className="relative h-full mt-4 flex flex-col border rounded-md p-4 overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex">
          <div className="shrink-0 sticky left-0 z-20 bg-background border-r w-56 px-3 py-2 font-medium">Listing</div>
          <div className="overflow-hidden" style={{ width: 'calc(100% - 14rem)' }}>
            <div ref={headerTrackRef} className="relative will-change-transform" style={{ width: totalWidth }}>
              {/* Today line overlay */}
              {todayIndex >= 0 && todayIndex < numDays && (
                <div className="absolute top-0 bottom-0 w-px bg-primary/70 z-20" style={{ left: todayIndex * columnWidth + 0.5 }} />
              )}
              <div className="grid" style={{ gridTemplateColumns: `repeat(${numDays}, ${columnWidth}px)` }}>
                {daysArray.map((d, i) => {
                  const day = d.getDate()
                  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' })
                  const month = d.toLocaleDateString(undefined, { month: 'short' })
                  const monthStart = d.getDate() === 1
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  const isToday = d.getTime() === today.getTime()
                  return (
                    <div key={i} className={cn("h-12 border-r border-border flex items-center justify-center text-xs text-muted-foreground relative",
                                               monthStart && "bg-muted/30",
                                               isWeekend && "bg-muted/20",
                                               i === todayIndex - 1 && "border-r-0")}
                         title={d.toDateString()}>
                      <div className="flex flex-col items-center">
                        <div className={cn("w-6 h-6 rounded-full p-1 flex items-center justify-center", isToday && "bg-primary")}>
                          <span className={cn("font-medium", isToday && "text-white")}>{day}</span>
                        </div>
                        <span>{weekday}</span>
                      </div>
                      {monthStart && (
                        <div className="absolute -top-6 left-0 text-[10px] text-muted-foreground">{month} {d.getFullYear()}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="relative w-full">
        <div className="flex">
          {/* Fixed nickname column (non-scrollable) */}
          <div className="shrink-0 sticky left-0 z-10 bg-background border-r w-56">
            {listings.map((listing) => {
              const listingEvents = eventsByListing.get(listing.id) || []
              // Next check-in should be the next future booking start, not the current stay
              const nextFuture = listingEvents.find(e => startOfDayUtc(e.start).getTime() > today.getTime())
              const nextCheckIn = nextFuture 
                ? nextFuture.start.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
                : "None"
              
              return (
                <div key={listing.id} className="h-20 flex flex-col border-b border-border px-3 py-2 justify-between text-sm font-medium">
                  <Link href={`/properties/${listing.id}`} className="hover:underline">{listing.nickname}</Link>
                  <div className="text-muted-foreground text-xs">
                    <button
                      type="button"
                      className="hover:underline hover:cursor-pointer"
                      onClick={() => {
                        if (!nextFuture || !scrollRef.current) return
                        const idx = daysBetween(startDate, startOfDayUtc(nextFuture.start))
                        const left = Math.max(0, idx) * columnWidth
                        scrollRef.current.scrollTo({ left, behavior: "smooth" })
                        requestAnimationFrame(() => syncHeaderPosition(left))
                      }}
                      disabled={!nextFuture}
                      aria-label="Scroll to next check-in on calendar"
                      title="Scroll to next check-in on calendar"
                    >
                      {`Next check-in: ${nextCheckIn}`}
                    </button>
                  </div>
                </div>
            )})}
          </div>
          {/* Scrollable day grid only */}
          <div ref={scrollRef} className="relative flex-1 overflow-x-auto overflow-y-hidden no-scrollbar">
            <div className="relative" style={{ width: totalWidth }}>
              {/* Grid background with weekend shading */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${numDays}, ${columnWidth}px)` }}>
                  {daysArray.map((d, i) => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    return (
                      <div
                        key={i}
                        className={cn(
                          "border-r border-border",
                          isWeekend && "bg-muted/10",
                          i === todayIndex - 1 && "border-r-0"
                        )}
                      />
                    )
                  })}
                </div>
                {/* Today line overlay */}
                {todayIndex >= 0 && todayIndex < numDays && (
                  <div className="absolute top-0 bottom-0 w-px bg-primary/70" style={{ left: todayIndex * columnWidth + 0.5 }} />
                )}
              </div>

              {/* Rows and events (reuse BookingBar per-day) */}
              <div className="relative">
                {listings.map((listing) => {
                  const listingEvents = eventsByListing.get(listing.id) || []

                  // Precompute turnover per day for this listing
                  const hasCheckinOn = (date: Date) => listingEvents.some(e => isSameDay(e.start, date))
                  const hasCheckoutOn = (date: Date) => listingEvents.some(e => isSameDay(e.end, date))

                  return (
                    <div key={listing.id} className="relative h-20 border-b border-border odd:bg-muted/5">
                      <div className="relative h-full">
                        {listingEvents.map((evt) => {
                          const eventStartIdx = Math.max(0, daysBetween(startDate, evt.start))
                          const eventEndIdx = Math.min(numDays - 1, Math.max(0, daysBetween(startDate, evt.end)))
                          if (eventStartIdx > numDays - 1) return null

                          const dayBoxes = [] as React.ReactNode[]
                          for (let i = eventStartIdx; i <= eventEndIdx; i++) {
                            const currentDate = addDays(startDate, i)
                            const hasTurnoverToday = hasCheckinOn(currentDate) && hasCheckoutOn(currentDate)
                            dayBoxes.push(
                              <div key={`${evt.id}-${i}`} className="absolute h-full" style={{ left: i * columnWidth, width: columnWidth }}>
                                <div className="relative h-full">
                                  <BookingBar event={evt} currentDate={currentDate} isCheckoutOnly={false} hasTurnoverToday={hasTurnoverToday} />
                                </div>
                              </div>
                            )
                          }
                          return dayBoxes
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const scroller = scrollRef.current
          if (!scroller) return
          const target = todayIndex * columnWidth
          scroller.scrollTo({ left: target, behavior: "smooth" })
          requestAnimationFrame(() => syncHeaderPosition(target))
        }}
        className={cn(
          "absolute bottom-4 right-4 rounded-full bg-primary text-white shadow-md px-3 py-2 text-xs transition-opacity hover:cursor-pointer",
          showJumpToToday ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-label="Scroll to today"
        title="Scroll to today"
      >
        Jump to Today
      </button>
    </div>
  )
}


