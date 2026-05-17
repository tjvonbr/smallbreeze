import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent } from "@/components/ui/card"
import { getCalendarLinksByListingId } from "@/lib/calendar-links"
import { parseFiles } from "@/lib/ics-parser"
import { getListingById } from "@/lib/listings"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface ReservationPageProps {
  params: Promise<{ id: string; reservationId: string }>
}

export default async function ReservationPage({ params }: ReservationPageProps) {
  const { id, reservationId } = await params
  const decodedReservationId = decodeURIComponent(reservationId)

  const listing = await getListingById(id)
  if (!listing) redirect("/properties")

  const calendarLinks = await getCalendarLinksByListingId(id)
  const events = await parseFiles(calendarLinks)

  const event = events.find((e) => e.id === decodedReservationId)
  if (!event) redirect(`/properties/${id}/calendar`)

  const checkIn = event.start.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })
  const checkOut = event.end.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })
  const nights = Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <DashboardShell>
      <div className="mb-2">
        <Link
          href={`/properties/${id}/calendar`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to calendar
        </Link>
      </div>
      <DashboardHeader heading={event.summary} text={listing.nickname} />
      <div className="mt-6 grid gap-4">
        <Card>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Check-in</div>
                <div className="text-base font-medium">{checkIn}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Check-out</div>
                <div className="text-base font-medium">{checkOut}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Duration</div>
                <div className="text-base font-medium">{nights} {nights === 1 ? "night" : "nights"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {event.description && (
          <Card>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-1">Description</div>
              <p className="text-sm whitespace-pre-wrap">{event.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">Property</div>
            <div className="text-base font-medium">{listing.nickname}</div>
            <div className="text-sm text-muted-foreground">
              {listing.streetAddress}, {listing.city}, {listing.state} {listing.zip}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
