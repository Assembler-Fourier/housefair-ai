import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { marketingFeatures, pricing, productName, productTagline } from "@/lib/saas/public-config";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/30 bg-background/78 backdrop-blur-2xl dark:border-white/10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-black">
          <span className="grid size-9 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--chart-2),var(--chart-4))] text-white shadow-lg">
            H
          </span>
          {productName}
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground sm:flex">
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/security">Security</Link>
          <Link href="/demo">Demo</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/auth">Sign in</Link>
          </Button>
          <Button asChild variant="premium">
            <Link href="/auth">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/70 px-4 py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="font-black text-foreground">{productName}</p>
          <p className="mt-2 max-w-xl">{productTagline}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/refund-policy">Refunds</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}

export function MarketingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="px-4 py-12 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-black text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Built for real shared houses
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-normal sm:text-6xl">
            Fair chores, groceries, issues, and shared money for roommates.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            HouseFair helps a household stay organised without turning everyday jobs
            into arguments. Plan cleaning, track expenses, manage groceries, and get
            AI-assisted fairness recommendations in one installable app.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="premium">
              <Link href="/auth">
                Start free early access
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/demo">View demo</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free during early access. Up to {pricing.memberLimit} roommates included.
          </p>
        </div>
        <GlassCard className="p-4 sm:p-5">
          <div className="rounded-[1.25rem] border border-white/40 bg-background/75 p-4 shadow-inner dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">Today</p>
                <p className="text-2xl font-black">House health 86%</p>
              </div>
              <div className="grid size-16 place-items-center rounded-full bg-primary/12 text-xl font-black text-primary">
                86
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ["Kitchen reset", "Devin", "20 min", "Due tonight"],
                ["Milk running low", "Groceries", "AI prediction", "Add to list"],
                ["House Expenses", "€42.30", "Simplified balance", "Settle up"],
              ].map((item) => (
                <div key={item[0]} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black">{item[0]}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item[1]} · {item[2]}</p>
                    </div>
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-black text-accent-foreground">
                      {item[3]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

export function FeatureGrid() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase text-primary">One app, fewer arguments</p>
          <h2 className="mt-2 text-3xl font-black">Everything roommates usually split across paid tools.</h2>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {marketingFeatures.map((feature) => (
            <GlassCard key={feature} className="p-5">
              <Check className="size-5 text-primary" />
              <p className="mt-4 font-black">{feature}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingCard() {
  return (
    <GlassCard className="mx-auto max-w-xl p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" />
        <p className="font-black">HouseFair household plan</p>
      </div>
      <div className="mt-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-black text-muted-foreground">{pricing.earlyAccess.label}</p>
          <p className="mt-2 text-3xl font-black">{pricing.earlyAccess.amount}</p>
          <p className="text-sm text-muted-foreground">{pricing.earlyAccess.suffix}</p>
        </div>
      </div>
      <ul className="mt-5 grid gap-2 text-sm text-muted-foreground">
        <li>All launch features included</li>
        <li>Up to 8 roommates included</li>
        <li>No per-user pricing in V1</li>
        <li>No card required during early access</li>
      </ul>
      <Button asChild className="mt-6 w-full" variant="premium">
        <Link href="/auth">Create free household</Link>
      </Button>
    </GlassCard>
  );
}
