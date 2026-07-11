import { MarketingPageShell, PricingCard } from "@/components/marketing-shell";
import { GlassCard } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <MarketingPageShell>
      <main className="px-4 py-14">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase text-primary">Pricing</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Full access while we launch.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            HouseFair is free during early access, with every household feature available
            to up to 8 roommates.
          </p>
        </div>
        <div className="mt-9">
          <PricingCard />
        </div>
        <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            ["No card", "Create a household without entering payment details."],
            ["Full product", "Tasks, money, groceries, issues, and AI planning are included."],
            ["Future pricing", "Early-access households will be told before billing is enabled."],
          ].map(([title, body]) => (
            <GlassCard key={title} className="p-5">
              <p className="font-black">{title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </GlassCard>
          ))}
        </div>
      </main>
    </MarketingPageShell>
  );
}
