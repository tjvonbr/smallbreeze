import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getListingsByTeamId } from "@/lib/listings";
import db from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the user's first team (or team from query param if provided)
  const url = new URL(req.url);
  const teamIdParam = url.searchParams.get("teamId");

  let teamId: string | null = teamIdParam;

  if (!teamId) {
    // Find the user's first team
    const membership = await db.teamMember.findFirst({
      where: { userId: session.user.id },
      select: { teamId: true },
    });

    if (!membership) {
      return NextResponse.json({ listings: [] });
    }

    teamId = membership.teamId;
  }

  const listings = await getListingsByTeamId(teamId);

  return NextResponse.json({ listings });
}
