"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          data: {
            full_name: fullName || email.split("@")[0],
          },
        },
      });

      if (error) throw error;
      toast.success("Check your email for the HouseFair sign-in link.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send sign-in link.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.refresh();
      toast.success("Signed out");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out.");
    }
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-black">Sign in to HouseFair</h1>
          <p className="text-sm text-muted-foreground">Magic link auth. No password to remember.</p>
        </div>
      </div>
      <form className="mt-6 grid gap-4" onSubmit={submit}>
        <label className="grid gap-2 text-sm font-black">
          Name
          <input
            className="h-12 rounded-2xl border border-input bg-background px-4 font-normal outline-none focus:ring-2 focus:ring-ring"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your name"
          />
        </label>
        <label className="grid gap-2 text-sm font-black">
          Email
          <input
            className="h-12 rounded-2xl border border-input bg-background px-4 font-normal outline-none focus:ring-2 focus:ring-ring"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <Button type="submit" variant="premium" disabled={loading}>
          <Mail className="size-4" />
          {loading ? "Sending..." : "Send magic link"}
        </Button>
      </form>
      <Button className="mt-3 w-full" variant="ghost" onClick={signOut}>
        Sign out of this browser
      </Button>
    </GlassCard>
  );
}
