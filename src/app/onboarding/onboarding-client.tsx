"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Home, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";

export function OnboardingClient({
  email,
  initialInvite,
}: {
  email?: string | null;
  initialInvite?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"create" | "join">(initialInvite ? "join" : "create");
  const [loading, setLoading] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState(initialInvite ?? "");

  async function createHousehold(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/households/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("household_name"),
          display_name: form.get("display_name"),
          room_name: form.get("room_name"),
          currency: form.get("currency") || "EUR",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Dublin",
          template: form.get("template") || "roommates",
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to create household.");
      toast.success("Household created");
      router.push("/app/today");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create household.");
    } finally {
      setLoading(false);
    }
  }

  async function joinHousehold(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_code: inviteCode,
          display_name: form.get("display_name"),
          room_name: form.get("room_name"),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to join household.");
      toast.success("Joined household");
      router.push("/app/today");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to join household.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-5xl place-items-center px-4 py-10">
      <div className="w-full">
        <p className="text-sm font-black uppercase text-primary">Welcome{email ? `, ${email}` : ""}</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight">
          Set up your household.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Create a new HouseFair household or join one with an invite code. The Roommates
          template creates the V1 defaults for cleaning, groceries, and shared money.
        </p>

        <div className="mt-7 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <GlassCard className="grid gap-3 p-4">
            <Button variant={mode === "create" ? "premium" : "outline"} onClick={() => setMode("create")}>
              <Home className="size-4" />
              Create household
            </Button>
            <Button variant={mode === "join" ? "premium" : "outline"} onClick={() => setMode("join")}>
              <Users className="size-4" />
              Join household
            </Button>
            <div className="rounded-2xl bg-background/70 p-4 text-sm text-muted-foreground">
              Free early access includes every household feature. Billing can be enabled
              later without changing your household data.
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            {mode === "create" ? (
              <form className="grid gap-4" onSubmit={createHousehold}>
                <InputField name="household_name" label="Household name" placeholder="Cedar House" required />
                <InputField name="display_name" label="Your display name" placeholder="Alex" required />
                <InputField name="room_name" label="Room name" placeholder="Front room" />
                <label className="grid gap-2 text-sm font-black">
                  Template
                  <select
                    name="template"
                    className="h-12 rounded-2xl border border-input bg-background px-4 font-normal outline-none focus:ring-2 focus:ring-ring"
                    defaultValue="roommates"
                  >
                    <option value="roommates">Roommates</option>
                    <option value="student_house">Student house</option>
                    <option value="family">Family</option>
                    <option value="couple">Couple</option>
                  </select>
                </label>
                <input type="hidden" name="currency" value="EUR" />
                <Button type="submit" variant="premium" disabled={loading}>
                  {loading ? "Creating..." : "Create household"}
                </Button>
              </form>
            ) : (
              <form className="grid gap-4" onSubmit={joinHousehold}>
                <label className="grid gap-2 text-sm font-black">
                  Invite code
                  <div className="flex gap-2">
                    <input
                      className="h-12 min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 font-normal outline-none focus:ring-2 focus:ring-ring"
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                      placeholder="Invite code"
                      required
                    />
                    <Button type="button" variant="outline" onClick={() => navigator.clipboard?.writeText(inviteCode)}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </label>
                <InputField name="display_name" label="Your display name" placeholder="Alex" required />
                <InputField name="room_name" label="Room name" placeholder="Back room" />
                <Button type="submit" variant="premium" disabled={loading}>
                  {loading ? "Joining..." : "Join household"}
                </Button>
              </form>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-black">
      {label}
      <input
        name={name}
        className="h-12 rounded-2xl border border-input bg-background px-4 font-normal outline-none focus:ring-2 focus:ring-ring"
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}
