import Link from "next/link"
import Logo from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"

export const metadata = {
  title: "Smallbreeze",
  description: "Coordinate your short-term rental cleanings with ease!"
}

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />
        <div
          className="absolute -top-40 left-1/2 aspect-[3/2] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent blur-2xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-40 left-1/3 aspect-[3/2] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-secondary/30 via-secondary/10 to-transparent blur-3xl"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_0%,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_60%)] dark:bg-[radial-gradient(50%_50%_at_50%_0%,rgba(0,0,0,0.25)_0%,rgba(0,0,0,0)_60%)]" />
      </div>

      {/* Navbar */}
      <header className="container z-10 mx-auto flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-medium">smallbreeze</span>
        </div>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="#who-its-for" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Who it&apos;s for
          </Link>
          <Link href="#contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 pb-20 pt-12 text-center md:pt-20">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          AI-assisted ops for modern teams
        </div>
        <h1 className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-4xl font-semibold leading-tight tracking-tight text-transparent md:text-6xl">
          Run your properties with clarity and speed
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
          Bring calendars, collaboration, and automation together in one sleek dashboard.
          Less busywork, more signal. Built for focus.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/sign-up">
            <Button size="lg" className="gap-2 px-8">
              Start free
              <Icons.arrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="outline" size="lg" className="px-8">
              Sign in
            </Button>
          </Link>
        </div>

        {/* Dashboard mockup */}
        <div className="mt-4 w-full overflow-hidden rounded-2xl border bg-card/60 shadow-xl backdrop-blur">
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <div className="ml-4 flex h-5 flex-1 max-w-xs items-center rounded bg-muted px-2 text-xs text-muted-foreground">
              app.smallbreeze.com/calendar
            </div>
          </div>
          {/* App shell mockup */}
          <div className="flex h-64 md:h-80">
            {/* Sidebar */}
            <div className="hidden w-48 flex-col gap-1 border-r bg-muted/20 p-3 md:flex">
              <div className="mb-2 flex items-center gap-2 px-2 py-1">
                <div className="h-4 w-4 rounded bg-muted-foreground/20" />
                <div className="h-3 w-20 rounded bg-muted-foreground/20" />
              </div>
              {["Calendar", "Properties", "Team"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground first:bg-primary/10 first:text-primary">
                  <div className="h-3 w-3 rounded bg-current opacity-50" />
                  {item}
                </div>
              ))}
            </div>
            {/* Main content - calendar strip */}
            <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-muted-foreground/20" />
                <div className="h-7 w-20 rounded-md bg-muted-foreground/10" />
              </div>
              {/* Calendar rows */}
              {[
                { label: "Beach House", events: [{ left: "5%", width: "30%", color: "bg-blue-500/40" }, { left: "60%", width: "25%", color: "bg-blue-500/40" }] },
                { label: "Mountain Cabin", events: [{ left: "20%", width: "45%", color: "bg-violet-500/40" }] },
                { label: "City Loft", events: [{ left: "0%", width: "15%", color: "bg-emerald-500/40" }, { left: "40%", width: "35%", color: "bg-emerald-500/40" }] },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground md:block">{row.label}</div>
                  <div className="relative flex-1 h-7 rounded bg-muted/40">
                    {row.events.map((e, i) => (
                      <div
                        key={i}
                        className={`absolute top-1 h-5 rounded ${e.color}`}
                        style={{ left: e.left, width: e.width }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto max-w-5xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Everything you need to run your properties</h2>
          <p className="mt-3 text-muted-foreground">One dashboard. No spreadsheets. No back-and-forth.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon="calendar"
            title="Unified calendar"
            description="See every booking across all your properties in one fast, horizontal timeline built for quick action."
          />
          <FeatureCard
            icon="users"
            title="Team-ready"
            description="Invite cleaners, co-hosts, and managers. Set roles and permissions so everyone sees exactly what they need."
          />
          <FeatureCard
            icon="alert"
            title="Smart automation"
            description="Sync external calendar feeds from Airbnb, VRBO, and more. Stay up to date automatically."
          />
          <FeatureCard
            icon="house"
            title="Property management"
            description="Track addresses, manage multiple listings, and keep all your property details organized in one place."
          />
          <FeatureCard
            icon="earth"
            title="Any source"
            description="Import calendars from any platform via iCal URL. No API keys or third-party integrations required."
          />
          <FeatureCard
            icon="choice"
            title="Task assignment"
            description="Assign tasks to team members tied to specific reservations and properties. Nothing falls through the cracks."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t bg-muted/20 py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-semibold md:text-3xl">Up and running in minutes</h2>
            <p className="mt-3 text-muted-foreground">No onboarding calls. No complex setup. Just start.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Add your properties",
                description: "Enter your property details and add iCal links from any booking platform.",
              },
              {
                step: "2",
                title: "Invite your team",
                description: "Bring in your cleaners, co-hosts, or property managers and assign the right roles.",
              },
              {
                step: "3",
                title: "Run your operations",
                description: "See all bookings in one calendar, assign tasks, and keep your team aligned.",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="who-its-for" className="container mx-auto max-w-5xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Built for property operators</h2>
          <p className="mt-3 text-muted-foreground">Whether you manage 2 listings or 200, smallbreeze keeps your team on the same page.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {[
            { label: "Short-term rental hosts", desc: "Manage Airbnb, VRBO, and direct booking calendars in one view." },
            { label: "Property managers", desc: "Oversee your portfolio, delegate tasks, and track your team's work." },
            { label: "Co-hosting teams", desc: "Coordinate with partners and share access without sharing passwords." },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border bg-card p-6 shadow-xs">
              <div className="mb-2 h-8 w-8 rounded-lg bg-primary/10 p-1.5">
                <Icons.house className="h-full w-full text-primary" />
              </div>
              <h3 className="font-semibold">{item.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto max-w-4xl px-4 pb-28">
        <div className="rounded-2xl border bg-gradient-to-b from-card to-card/70 px-8 py-14 text-center shadow-sm">
          <h2 className="text-balance text-3xl font-semibold md:text-4xl">Ready to move faster?</h2>
          <p className="mt-3 text-muted-foreground">
            Join teams modernizing their operations with a simpler, sharper workflow.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 px-8">
                Create free account
                <Icons.arrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="px-8">Sign in</Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 py-8 md:h-20 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Logo />
            <span>© {new Date().getFullYear()} smallbreeze</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="mailto:hello@smallbreeze.com" className="transition-colors hover:text-foreground">
              hello@smallbreeze.com
            </Link>
            <Link href="/sign-up" className="transition-colors hover:text-foreground">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Icons
  title: string
  description: string
}) {
  const Icon = Icons[icon]
  return (
    <div className="rounded-xl border bg-card p-6 shadow-xs transition-colors hover:bg-card/80">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
