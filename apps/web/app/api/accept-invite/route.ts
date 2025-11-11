import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/prisma";
import { setCurrentTeamIdCookie } from "@/lib/actions/teams";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  const url = new URL(req.url);
  const inviteId = url.searchParams.get("inviteId");

  if (!inviteId) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const invite = await db.invite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Ensure the invite email matches the authenticated user's email
  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Create membership if it doesn't exist already
  const existingMembership = await db.teamMember.findFirst({
    where: {
      teamId: invite.teamId,
      userId: session.user.id,
    },
  });

  if (!existingMembership) {
    await db.teamMember.create({
      data: {
        teamId: invite.teamId,
        userId: session.user.id,
        role: "MEMBER",
      },
    });
  }

  // Mark invite as accepted
  if (!invite.acceptedAt) {
    await db.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  }

  // Set cookie for current team and redirect to dashboard
  await setCurrentTeamIdCookie(invite.teamId);

  return NextResponse.redirect(new URL("/", req.url));
}


