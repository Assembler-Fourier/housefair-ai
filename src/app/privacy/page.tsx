import { MarketingPageShell } from "@/components/marketing-shell";

export default function PrivacyPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-4xl font-black">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">
          Placeholder policy for legal review. HouseFair is designed to store household
          operational data such as member names, tasks, grocery entries, expenses, receipts,
          issues, and notification preferences. Do not treat this placeholder as legal advice.
        </p>
        <p className="mt-4 text-muted-foreground">
          Before public launch, replace this page with a reviewed policy covering data
          controller details, retention, deletion requests, subprocessors, cookies, analytics,
          and payment processing through Stripe.
        </p>
      </main>
    </MarketingPageShell>
  );
}
