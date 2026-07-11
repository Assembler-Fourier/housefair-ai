import { MarketingPageShell } from "@/components/marketing-shell";

export default function TermsPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-4xl font-black">Terms of Service</h1>
        <p className="mt-4 text-muted-foreground">
          Placeholder terms for legal review. HouseFair is a household coordination tool
          and should not be used for emergencies, legal disputes, or financial advice.
        </p>
        <p className="mt-4 text-muted-foreground">
          Add reviewed terms before accepting real public payments.
        </p>
      </main>
    </MarketingPageShell>
  );
}
