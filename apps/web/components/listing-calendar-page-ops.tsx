import React from "react"
import { ListingWithCalendarLinks } from "@/types/listings"
import { DashboardHeader } from "./dashboard-header"
import { DashboardShell } from "./dashboard-shell"
import { PropertiesSubnav } from "./properties-subnav"
import CalendarView from "./calendar-view"
import { CalendarEvent } from "@/lib/ics-parser"

interface ListingCalendarPageOpsProps {
  listing: ListingWithCalendarLinks
  events: CalendarEvent[]
}

export default function ListingCalendarPageOps({ listing, events }: ListingCalendarPageOpsProps) {
  return (
    <DashboardShell>
      <DashboardHeader heading={listing.nickname} text="View your upcoming bookings" />
      <PropertiesSubnav />
      <div className="mt-6 grid grid-cols-1 gap-6">
        <CalendarView events={events} listingId={listing.id} />
      </div>
    </DashboardShell>
  )
}