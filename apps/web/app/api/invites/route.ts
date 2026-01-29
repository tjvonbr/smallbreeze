import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.API_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Forward the request to the API which handles invite creation and email sending
  const response = await fetch(`${apiUrl}/api/invites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: data.message || "Failed to create invite" },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}