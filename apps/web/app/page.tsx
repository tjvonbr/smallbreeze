import Link from "next/link"
import Logo from "@/components/logo"
import { Button } from "@/components/ui/button"

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
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-sm text-muted-foreground">smallbreeze</span>
        </div>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
            Features
          </Link>
          <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
            How it works
          </Link>
          <Link href="#contact" className="text-sm text-muted-foreground hover:text-foreground">
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link href="/sign-up">
            <Button size="lg">Get started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 pb-20 pt-10 text-center md:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          AI-assisted ops for modern teams
        </div>
        <h1 className="bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-6xl">
          Run your operations with clarity and speed
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
          Bring calendars, collaboration, and automation together in one sleek dashboard. Less busywork,
          more signal. Built for focus.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/sign-up">
            <Button size="lg" className="px-8">Start free</Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="outline" size="lg" className="px-8">Live demo</Button>
          </Link>
        </div>
        <div className="mt-8 w-full rounded-xl border bg-card/60 p-3 shadow-sm backdrop-blur">
          <div className="aspect-[16/9] w-full rounded-lg bg-gradient-to-br from-muted to-muted/40" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto max-w-5xl px-4 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            title="Unified calendar"
            description="See every booking and event in one fast, horizontal timeline designed for action."
          />
          <FeatureCard
            title="Team-ready"
            description="Invite your team, manage roles, and keep everyone aligned without friction."
          />
          <FeatureCard
            title="Automation"
            description="Sync external feeds, reduce manual updates, and ship faster with smart defaults."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto max-w-4xl px-4 pb-28">
        <div className="rounded-2xl border bg-gradient-to-b from-card to-card/70 px-8 py-12 text-center shadow-sm">
          <h2 className="text-balance text-3xl font-semibold md:text-4xl">Ready to move faster?</h2>
          <p className="mt-3 text-muted-foreground">
            Join teams modernizing their operations with a simpler, sharper workflow.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg" className="px-8">Create account</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="px-8">Sign in</Button>
            </Link>
          </div>
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
            <Link href="mailto:hello@smallbreeze.com" className="hover:text-foreground">Email</Link>
            <Link href="/sign-up" className="hover:text-foreground">Get started</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-xs transition-colors">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}


