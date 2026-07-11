"use client";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <GlassCard className="max-w-md p-6 text-center">
        <p className="text-sm font-black uppercase text-destructive">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-black">HouseFair hit an error.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {error.message || "Please retry. If this keeps happening, contact support."}
        </p>
        <Button className="mt-5" variant="premium" onClick={reset}>
          Retry
        </Button>
      </GlassCard>
    </main>
  );
}
