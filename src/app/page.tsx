import Link from "next/link";
import { FeatureGrid, HeroSection, MarketingPageShell, PricingCard } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <MarketingPageShell>
      <HeroSection />
      <section className="px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          {[
            ["The problem", "Shared homes run on memory, group chats, and awkward reminders."],
            ["The product", "HouseFair gives chores, groceries, issues, money, and AI planning one calm place."],
            ["The result", "Everyone can see what is due, what was done, and what is fair."],
          ].map(([title, body]) => (
            <GlassCard key={title} className="p-5">
              <p className="text-sm font-black uppercase text-primary">{title}</p>
              <p className="mt-3 text-lg font-black leading-7">{body}</p>
            </GlassCard>
          ))}
        </div>
      </section>
      <FeatureGrid />
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 md:grid-cols-4">
            {["Create household", "Invite roommates", "Set routines", "Let AI recommend fair plans"].map((step, index) => (
              <GlassCard key={step} className="p-5">
                <p className="grid size-9 place-items-center rounded-2xl bg-primary text-sm font-black text-primary-foreground">
                  {index + 1}
                </p>
                <p className="mt-4 font-black">{step}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>
      <section className="px-4 py-12">
        <PricingCard />
      </section>
      <section className="px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black">See the product before signing up.</h2>
          <p className="mt-3 text-muted-foreground">
            The demo uses static sample data only. No login, no real household records.
          </p>
          <Button asChild className="mt-6" size="lg" variant="outline">
            <Link href="/demo">Open demo</Link>
          </Button>
        </div>
      </section>
    </MarketingPageShell>
  );
}
