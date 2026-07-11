import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="mx-auto grid min-h-[100dvh] w-full max-w-md place-items-center px-4 py-10">
      <GlassCard className="w-full p-6 text-center">
        <WifiOff className="mx-auto size-8 text-primary" />
        <h1 className="mt-4 text-2xl font-black">You are offline</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          HouseFair keeps the installable app shell available, but shared household changes
          wait for a secure connection.
        </p>
        <Button asChild className="mt-5 w-full">
          <Link href="/app/today">Try again</Link>
        </Button>
      </GlassCard>
    </main>
  );
}

