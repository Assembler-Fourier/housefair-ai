import { MarketingPageShell } from "@/components/marketing-shell";
import { AuthForm } from "@/app/auth/auth-form";
import { safeInternalPath } from "@/lib/saas/paths";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeInternalPath(
    typeof params.next === "string" ? params.next : null,
    "/onboarding",
  );

  return (
    <MarketingPageShell>
      <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-14">
        <AuthForm nextPath={nextPath} />
      </main>
    </MarketingPageShell>
  );
}
