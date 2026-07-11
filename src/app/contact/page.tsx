import { Mail } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing-shell";
import { GlassCard } from "@/components/ui/card";

export default function ContactPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto max-w-3xl px-4 py-14">
        <p className="text-sm font-black uppercase text-primary">Support</p>
        <h1 className="mt-3 text-4xl font-black">Contact HouseFair</h1>
        <GlassCard className="mt-8 p-6">
          <Mail className="size-6 text-primary" />
          <p className="mt-4 font-black">Support email placeholder</p>
          <p className="mt-2 text-muted-foreground">
            Add your public support email before launch. Suggested address:
            support@yourdomain.com.
          </p>
        </GlassCard>
      </main>
    </MarketingPageShell>
  );
}
