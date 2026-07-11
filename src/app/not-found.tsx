import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <GlassCard className="max-w-md p-6 text-center">
        <p className="text-sm font-black uppercase text-primary">404</p>
        <h1 className="mt-3 text-3xl font-black">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This HouseFair page does not exist or has moved.
        </p>
        <Button asChild className="mt-5" variant="premium">
          <Link href="/">Go home</Link>
        </Button>
      </GlassCard>
    </main>
  );
}
