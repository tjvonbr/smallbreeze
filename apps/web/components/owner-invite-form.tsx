"use client"

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface InviteDetails {
  owner: { firstName: string; email: string; hasPhone: boolean };
  teamName: string;
  listings: { id: string; nickname: string }[];
}

type State =
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "ready"; invite: InviteDetails }
  | { kind: "done" };

export function OwnerInviteForm({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [notifyBySms, setNotifyBySms] = useState(false);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/owner-invites/${encodeURIComponent(token)}`);
        if (cancelled) return;

        if (res.ok) {
          setState({ kind: "ready", invite: await res.json() });
        } else if (res.status === 410) {
          const body = await res.json().catch(() => null);
          setState({
            kind: "invalid",
            message:
              body?.status === "accepted"
                ? "You've already set up your notifications."
                : "This invite is no longer valid. Ask your property manager to send a new one.",
          });
        } else {
          setState({ kind: "invalid", message: "We couldn't find this invite." });
        }
      } catch {
        if (!cancelled) {
          setState({ kind: "invalid", message: "Something went wrong. Please try again." });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/owner-invites/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyByEmail, notifyBySms, phone: phone.trim() || null }),
      });

      if (res.ok) {
        setState({ kind: "done" });
        return;
      }

      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === "loading") {
    return <p className="text-center text-sm text-muted-foreground">Loading...</p>;
  }

  if (state.kind === "invalid") {
    return <p className="text-center text-sm text-muted-foreground">{state.message}</p>;
  }

  if (state.kind === "done") {
    return (
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">You're all set</h1>
        <p className="text-sm text-muted-foreground">
          You'll get updates as cleans happen. You can close this tab.
        </p>
      </div>
    );
  }

  const { invite } = state;
  const needsPhone = notifyBySms && !invite.owner.hasPhone;
  const canSubmit = (notifyByEmail || notifyBySms) && (!needsPhone || phone.trim().length > 0);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Hi {invite.owner.firstName}</h1>
        <p className="text-sm text-muted-foreground">
          {invite.teamName} will send you updates when{" "}
          {invite.listings.map((l) => l.nickname).join(", ") || "your property"} is cleaned: when
          the cleaner is on their way, when it's finished, and photos afterward.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={notifyByEmail}
            onChange={(e) => setNotifyByEmail(e.target.checked)}
          />
          <span>
            <span className="font-medium">Email</span>
            <span className="block text-muted-foreground">{invite.owner.email}</span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={notifyBySms}
            onChange={(e) => setNotifyBySms(e.target.checked)}
          />
          <span>
            <span className="font-medium">Text message</span>
            <span className="block text-muted-foreground">
              By selecting this, you agree to receive automated text messages about cleanings at
              your property. Message and data rates may apply. You can opt out at any time.
            </span>
          </span>
        </label>

        {notifyBySms && !invite.owner.hasPhone && (
          <div className="grid gap-1">
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="(555) 555-5555"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        )}
      </div>

      {error && <p className="text-center text-xs text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
        {submitting ? "Saving..." : "Save preferences"}
      </Button>
    </form>
  );
}
