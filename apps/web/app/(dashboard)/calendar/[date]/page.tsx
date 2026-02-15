import { auth } from '@/lib/auth';
import { getCalendarLinksByTeamId } from '@/lib/calendar-links';
import { getCurrentTeamIdFromCookies } from '@/lib/actions/teams';
import { ensureUserHasTeam } from '@/lib/teams';
import { isSameDay } from '@/lib/utils';
import db from '@/lib/prisma';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard-header';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function DayViewPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params;

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

  const events = await getCalendarLinksByTeamId(effectiveTeamId)

  const viewDate = new Date(date + 'T00:00:00')
  const checkouts = events.filter(event => isSameDay(event.end, viewDate))

  const formattedDate = viewDate.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <DashboardShell>
      <div>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to calendar
        </Link>
      </div>
      <DashboardHeader heading={formattedDate} text="Checkouts" />
      <div className="mt-6 space-y-4">
        {checkouts.length > 0 ? (
          checkouts.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border p-4"
            >
              <div className="font-medium">{event.listing.nickname}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {event.summary}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No checkouts on this day.
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
