"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clipboard, Download, LogOut, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { HouseholdContext } from "@/lib/saas/auth";
import type { HouseholdMember } from "@/lib/saas/core";

export function SettingsClient({ email, household, members }: { email: string | null; household: HouseholdContext; members: HouseholdMember[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [inviteUrl, setInviteUrl] = React.useState("");

  async function createInvite() {
    setBusy(true);
    try {
      const response = await fetch("/api/households/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ household_id: household.id, role: "member", email: "" }),
      });
      const payload = await response.json() as { error?: string; invite_url?: string };
      if (!response.ok || !payload.invite_url) throw new Error(payload.error ?? "Could not create invite.");
      setInviteUrl(payload.invite_url);
      try {
        await navigator.clipboard?.writeText(payload.invite_url);
        toast.success("Invite link copied");
      } catch {
        toast.success("Invite link ready");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invite.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const canManage = household.role === "owner" || household.role === "admin";
  return <main className="mx-auto min-h-[100dvh] w-full max-w-[520px] px-3 pb-10 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
    <Button asChild variant="ghost"><Link href="/app/more">Back</Link></Button>
    <div className="mt-3 grid gap-4">
      <GlassCard className="p-5"><p className="text-xs font-bold uppercase text-primary">Household</p><h1 className="mt-2 text-2xl font-black">{household.name}</h1><p className="mt-2 text-sm text-muted-foreground">{members.length} members · {household.role} · free early access</p></GlassCard>
      <GlassCard className="p-5"><div className="flex items-center gap-2"><Users className="size-5 text-primary" /><h2 className="font-black">Members</h2></div><div className="mt-4 grid gap-2">{members.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{member.display_name}</p><p className="truncate text-xs text-muted-foreground">{member.room_name || "Room not set"}</p></div><span className="rounded-md bg-accent px-2 py-1 text-[10px] font-bold uppercase">{member.role}</span></div>)}</div>{canManage ? <Button className="mt-4 w-full" variant="outline" disabled={busy} onClick={createInvite}><UserPlus /> Invite roommate</Button> : null}{inviteUrl ? <button className="mt-3 flex w-full items-center gap-2 rounded-lg border border-border bg-background p-3 text-left text-xs" onClick={() => { navigator.clipboard?.writeText(inviteUrl); toast.success("Copied"); }}><Clipboard className="size-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{inviteUrl}</span><Check className="size-4 text-primary" /></button> : null}</GlassCard>
      <GlassCard className="p-5"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h2 className="font-black">Data and privacy</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Household records are isolated by household membership. Owners and admins can download a backup.</p>{canManage ? <div className="mt-4 grid grid-cols-2 gap-2"><Button asChild variant="outline"><a href="/api/app/export?format=json" download><Download /> JSON</a></Button><Button asChild variant="outline"><a href="/api/app/export?format=csv" download><Download /> CSV</a></Button></div> : null}</GlassCard>
      <GlassCard className="p-5"><p className="text-sm font-bold">Signed in as</p><p className="mt-1 truncate text-sm text-muted-foreground">{email}</p><Button className="mt-4 w-full" variant="outline" onClick={signOut}><LogOut /> Sign out</Button></GlassCard>
    </div>
  </main>;
}
