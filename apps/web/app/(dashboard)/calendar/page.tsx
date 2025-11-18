import HorizontalCalendar from '@/components/horizontal-calendar';
import { auth } from '@/lib/auth';
import { getCalendarLinksByTeamId } from '@/lib/calendar-links';
import { getCurrentTeamIdFromCookies } from '@/lib/actions/teams';
import { getListingsByTeamId } from '@/lib/listings';
import { ensureUserHasTeam } from '@/lib/teams';
import db from '@/lib/prisma';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard-header';
import EmptyProperties from '@/components/empty-properties';

export default async function CalendarPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    redirect("/sign-in")
  }

  await ensureUserHasTeam(session.user.id, `${session.user.firstName} ${session.user.lastName}'s Team`)
  const cookieTeamId = await getCurrentTeamIdFromCookies()
  const teams = await db.team.findMany({
    where: { memberships: { some: { userId: session.user.id } } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  const effectiveTeamId = cookieTeamId ?? (teams.length > 0 ? teams[0].id : null)

  if (!effectiveTeamId) {
    redirect('/properties')
  }

  const [events, listings] = await Promise.all([
    getCalendarLinksByTeamId(effectiveTeamId),
    getListingsByTeamId(effectiveTeamId),
  ])

  return (
    <DashboardShell>
      <DashboardHeader heading="Calendar" text="View your upcoming bookings" />
      {listings.length > 0 ? (
          <HorizontalCalendar listings={listings} events={events} />
      ) : (
        <div className="flex items-center justify-center min-h-[60vh]">
          <EmptyProperties />
        </div>
      )}
    </DashboardShell>
  )
}


