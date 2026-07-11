"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  Banknote,
  Brain,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  Home,
  ListChecks,
  LoaderCircle,
  Plus,
  Receipt,
  Settings,
  ShoppingBasket,
  Sparkles,
  TimerReset,
  Users,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress, ProgressRing } from "@/components/ui/progress";
import type {
  HouseholdAppData,
  HouseholdExpense,
  HouseholdGrocery,
  HouseholdIssue,
  HouseholdTask,
} from "@/lib/saas/core";

export type ActiveAppView = "today" | "tasks" | "money" | "groceries" | "more" | "ai";
type ModalName = "quick" | "task" | "expense" | "settlement" | "grocery" | "buy" | "issue" | null;

const navItems = [
  { label: "Today", href: "/app/today", icon: Home },
  { label: "Tasks", href: "/app/tasks", icon: ListChecks },
  { label: "Money", href: "/app/money", icon: WalletCards },
  { label: "Groceries", href: "/app/groceries", icon: ShoppingBasket },
  { label: "More", href: "/app/more", icon: Users },
] as const;

function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(18);
}

function currency(amount: number, code: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: code }).format(amount);
}

function shortDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short" }).format(date);
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { error?: string } & Record<string, unknown>;
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload;
}

export function HouseholdAppClient({ active, data }: { active: ActiveAppView; data: HouseholdAppData }) {
  const router = useRouter();
  const [modal, setModal] = React.useState<ModalName>(null);
  const [selectedTask, setSelectedTask] = React.useState<HouseholdTask | null>(null);
  const [selectedGrocery, setSelectedGrocery] = React.useState<HouseholdGrocery | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [plan, setPlan] = React.useState<{ summary: string; recommendations: Array<{ task: string; suggested_member: string; reason: string }> } | null>(null);

  const memberName = React.useCallback(
    (id: string | null | undefined) => data.members.find((member) => member.id === id)?.display_name ?? "Unassigned",
    [data.members],
  );

  async function mutate(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      haptic();
      toast.success(success);
      setModal(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function openTask(task: HouseholdTask) {
    setSelectedTask(task);
    setModal("task");
  }

  function openBuy(item: HouseholdGrocery) {
    setSelectedGrocery(item);
    setModal("buy");
  }

  const openTasks = data.tasks.filter((task) => task.status !== "completed");
  const completedTasks = data.tasks.filter((task) => task.status === "completed");
  const groceriesNeeded = data.groceries.filter((item) => item.status === "needed" || item.status === "running_low");
  const openIssues = data.issues.filter((issue) => issue.status !== "resolved" && issue.status !== "rejected");
  const myBalance = data.balances[data.currentMember.id] ?? 0;
  const myPoints = completedTasks.filter((task) => task.completed_by_member_id === data.currentMember.id).reduce((sum, task) => sum + task.points, 0);

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-[520px] overflow-x-hidden px-3 pb-28 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <header className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase text-primary">{data.household.name}</p>
          <h1 className="truncate text-xl font-black">Hi, {data.currentMember.display_name}</h1>
        </div>
        <Button asChild size="icon" variant="glass" aria-label="Household settings">
          <Link href="/app/settings"><Settings /></Link>
        </Button>
      </header>

      <motion.main
        key={active}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="mt-5"
      >
        {active === "today" ? (
          <TodayView
            data={data}
            openTasks={openTasks}
            groceriesNeeded={groceriesNeeded}
            openIssues={openIssues}
            myBalance={myBalance}
            myPoints={myPoints}
            memberName={memberName}
            onOpenTask={openTask}
            onQuick={() => setModal("quick")}
          />
        ) : null}
        {active === "tasks" ? (
          <TasksView data={data} openTasks={openTasks} completedTasks={completedTasks} memberName={memberName} onOpenTask={openTask} mutate={mutate} busy={busy} />
        ) : null}
        {active === "money" ? (
          <MoneyView data={data} memberName={memberName} onAdd={() => setModal("expense")} onSettle={() => setModal("settlement")} />
        ) : null}
        {active === "groceries" ? (
          <GroceriesView data={data} needed={groceriesNeeded} onAdd={() => setModal("grocery")} onBuy={openBuy} mutate={mutate} />
        ) : null}
        {active === "more" ? (
          <MoreView data={data} issues={openIssues} memberName={memberName} onIssue={() => setModal("issue")} mutate={mutate} />
        ) : null}
        {active === "ai" ? (
          <AiView data={data} plan={plan} busy={busy} onGenerate={() => mutate(async () => {
            const payload = await postJson("/api/app/ai/weekly-plan", {});
            setPlan(payload.plan as typeof plan);
          }, "Draft weekly plan generated")} />
        ) : null}
      </motion.main>

      <Button
        size="icon"
        variant="premium"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.4rem)] right-[max(1rem,calc((100vw-520px)/2+1rem))] z-40 size-14 rounded-full shadow-2xl"
        aria-label="Open quick actions"
        onClick={() => setModal("quick")}
      >
        <Plus className="size-6" />
      </Button>

      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[520px] border-t border-border/70 bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 backdrop-blur-2xl" aria-label="Primary navigation">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.label.toLowerCase();
            return (
              <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-bold transition ${selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
                <Icon className="size-4" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <QuickActions open={modal === "quick"} onOpenChange={(open) => !open && setModal(null)} choose={setModal} />
      <TaskDialog key={selectedTask?.id ?? "no-task"} open={modal === "task"} task={selectedTask} data={data} busy={busy} onOpenChange={(open) => !open && setModal(null)} mutate={mutate} />
      <ExpenseDialog open={modal === "expense"} data={data} busy={busy} onOpenChange={(open) => !open && setModal(null)} mutate={mutate} />
      <SettlementDialog open={modal === "settlement"} data={data} busy={busy} onOpenChange={(open) => !open && setModal(null)} mutate={mutate} />
      <GroceryDialog open={modal === "grocery"} busy={busy} onOpenChange={(open) => !open && setModal(null)} mutate={mutate} />
      <BuyDialog open={modal === "buy"} item={selectedGrocery} data={data} busy={busy} onOpenChange={(open) => !open && setModal(null)} mutate={mutate} />
      <IssueDialog open={modal === "issue"} data={data} busy={busy} onOpenChange={(open) => !open && setModal(null)} mutate={mutate} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-primary">{eyebrow}</p><h2 className="mt-1 text-2xl font-black leading-tight">{title}</h2></div>{action}</div>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail: string }) {
  return <GlassCard className="min-w-0 p-3"><div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4 shrink-0" /><span className="truncate text-xs font-bold">{label}</span></div><p className="mt-2 truncate text-xl font-black">{value}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{detail}</p></GlassCard>;
}

function TodayView({ data, openTasks, groceriesNeeded, openIssues, myBalance, myPoints, memberName, onOpenTask, onQuick }: { data: HouseholdAppData; openTasks: HouseholdTask[]; groceriesNeeded: HouseholdGrocery[]; openIssues: HouseholdIssue[]; myBalance: number; myPoints: number; memberName: (id: string | null | undefined) => string; onOpenTask: (task: HouseholdTask) => void; onQuick: () => void }) {
  return <div className="grid gap-5">
    <SectionHeading eyebrow="House command center" title="Today at a glance" action={<Button size="sm" variant="outline" onClick={onQuick}><Plus /> Add</Button>} />
    <GlassCard className="grid grid-cols-[auto_1fr] items-center gap-4 p-4"><ProgressRing value={data.houseHealth} label="health" size={96} /><div className="min-w-0"><p className="font-black">Current house health</p><p className="mt-1 text-sm leading-5 text-muted-foreground">Based on due routines, open issues, and grocery pressure.</p><Progress className="mt-3" value={data.houseHealth} /></div></GlassCard>
    <div className="grid grid-cols-2 gap-3">
      <Metric icon={ListChecks} label="Pending tasks" value={String(openTasks.length)} detail={`${myPoints} points earned`} />
      <Metric icon={ShoppingBasket} label="Groceries" value={String(groceriesNeeded.length)} detail="Needed or running low" />
      <Metric icon={WalletCards} label="Your balance" value={currency(Math.abs(myBalance), data.household.currency)} detail={myBalance >= 0 ? "You are owed" : "You owe the house"} />
      <Metric icon={CircleAlert} label="Open issues" value={String(openIssues.length)} detail="Calm cleanup requests" />
    </div>
    <section><SectionHeading eyebrow="Routines" title="Coming up" /><div className="mt-3 grid gap-2">{openTasks.slice(0, 4).map((task) => <button key={task.id} onClick={() => onOpenTask(task)} className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition active:scale-[0.99]"><span className={`grid size-10 shrink-0 place-items-center rounded-lg ${task.difficulty === "heavy" ? "bg-rose-500/12 text-rose-600" : task.difficulty === "medium" ? "bg-amber-500/12 text-amber-700" : "bg-primary/12 text-primary"}`}><Clock3 className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate font-bold">{task.title}</span><span className="block truncate text-xs text-muted-foreground">{memberName(task.assigned_member_id)} · {task.estimated_minutes} min · due {shortDate(task.due_date)}</span></span><ChevronRight className="size-4 text-muted-foreground" /></button>)}{openTasks.length === 0 ? <EmptyState icon={CheckCircle2} title="Everything is clear" body="No routines are pending right now." /> : null}</div></section>
    <section><SectionHeading eyebrow="House pulse" title="Recent activity" /><div className="mt-3 grid gap-2">{data.activity.slice(0, 5).map((item) => <div key={item.id} className="flex gap-3 rounded-lg border border-border/70 bg-card/70 p-3"><Activity className="mt-0.5 size-4 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-bold">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.detail ?? memberName(item.actor_member_id)}</p></div></div>)}{data.activity.length === 0 ? <EmptyState icon={Activity} title="A fresh household" body="Completed tasks, expenses, groceries, and issues will appear here." /> : null}</div></section>
  </div>;
}

function TasksView({ data, openTasks, completedTasks, memberName, onOpenTask, mutate, busy }: { data: HouseholdAppData; openTasks: HouseholdTask[]; completedTasks: HouseholdTask[]; memberName: (id: string | null | undefined) => string; onOpenTask: (task: HouseholdTask) => void; mutate: (action: () => Promise<unknown>, success: string) => Promise<void>; busy: boolean }) {
  return <div className="grid gap-5"><SectionHeading eyebrow="Fair routines" title="Tasks" /><div className="grid grid-cols-3 gap-2"><Metric icon={ListChecks} label="Pending" value={String(openTasks.length)} detail="Carry over safely" /><Metric icon={CheckCircle2} label="Done" value={String(completedTasks.length)} detail="Visible credit" /><Metric icon={Sparkles} label="Heavy" value={String(openTasks.filter((task) => task.difficulty === "heavy").length)} detail="Proof required" /></div><div className="grid gap-3">{openTasks.map((task) => <GlassCard key={task.id} className="p-4"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{task.title}</p><span className="rounded-md bg-accent px-2 py-1 text-[10px] font-bold uppercase">{task.difficulty}</span></div><p className="mt-1 text-sm text-muted-foreground">{task.area} · {task.estimated_minutes} min · {task.points} points</p><p className="mt-2 text-sm leading-5">{task.description}</p></div>{task.proof_required ? <Camera className="size-4 shrink-0 text-primary" /> : null}</div><label className="mt-3 grid gap-1 text-xs font-bold text-muted-foreground">Assigned to<select className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground" value={task.assigned_member_id ?? ""} disabled={busy} onChange={(event) => mutate(() => postJson("/api/app/tasks", { action: "assign", task_id: task.id, assigned_member_id: event.target.value || null }), "Assignment updated")}><option value="">Unassigned</option>{data.members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label><div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" disabled={busy} onClick={() => mutate(() => postJson("/api/app/tasks", { action: "defer", task_id: task.id, days: 1 }), "Moved to tomorrow")}><TimerReset /> Not today</Button><Button onClick={() => onOpenTask(task)}><Check /> Complete</Button></div><p className="mt-2 text-xs text-muted-foreground">Due {shortDate(task.due_date)} · {memberName(task.assigned_member_id)}</p></GlassCard>)}{openTasks.length === 0 ? <EmptyState icon={CheckCircle2} title="All routines complete" body="The next recurring task will appear automatically." /> : null}</div></div>;
}

function MoneyView({ data, memberName, onAdd, onSettle }: { data: HouseholdAppData; memberName: (id: string | null | undefined) => string; onAdd: () => void; onSettle: () => void }) {
  const total = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const [uploading, setUploading] = React.useState<string | null>(null);
  async function uploadReceipt(expense: HouseholdExpense, file: File) {
    setUploading(expense.id);
    try {
      const form = new FormData();
      form.set("kind", "receipt");
      form.set("entity_id", expense.id);
      form.set("file", file);
      const response = await fetch("/api/app/uploads", { method: "POST", body: form });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Receipt upload failed.");
      toast.success("Receipt attached");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Receipt upload failed.");
    } finally {
      setUploading(null);
    }
  }
  return <div className="grid gap-5"><SectionHeading eyebrow="Shared money" title="Balances without awkward maths" action={<Button size="sm" onClick={onAdd}><Plus /> Expense</Button>} /><GlassCard className="p-4"><p className="text-sm font-bold text-muted-foreground">Household spending</p><p className="mt-1 text-3xl font-black">{currency(total, data.household.currency)}</p><p className="mt-2 text-xs text-muted-foreground">Across {data.expenses.length} shared expense{data.expenses.length === 1 ? "" : "s"}.</p></GlassCard><div className="grid gap-2">{data.debts.map((debt) => <div key={`${debt.fromMemberId}-${debt.toMemberId}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{memberName(debt.fromMemberId)} owes {memberName(debt.toMemberId)}</p><p className="text-xs text-muted-foreground">Simplified settlement</p></div><p className="shrink-0 font-black">{currency(debt.amount, data.household.currency)}</p></div>)}{data.debts.length === 0 ? <EmptyState icon={Banknote} title="Balances are settled" body="New shared expenses will be simplified automatically." /> : null}</div><Button variant="outline" onClick={onSettle}><CreditCard /> Record settlement</Button><section><SectionHeading eyebrow="Timeline" title="Recent expenses" /><div className="mt-3 grid gap-2">{data.expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} code={data.household.currency} payer={memberName(expense.paid_by_member_id)} uploading={uploading === expense.id} onReceipt={uploadReceipt} />)}{data.expenses.length === 0 ? <EmptyState icon={Receipt} title="No expenses yet" body="Add a bill or grocery purchase to start the balance." /> : null}</div></section></div>;
}

function ExpenseRow({ expense, code, payer, uploading, onReceipt }: { expense: HouseholdExpense; code: string; payer: string; uploading: boolean; onReceipt: (expense: HouseholdExpense, file: File) => void }) {
  return <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card p-3"><label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg bg-primary/12 text-primary" title="Attach receipt from gallery">{uploading ? <LoaderCircle className="size-4 animate-spin" /> : expense.receipt_path ? <CheckCircle2 className="size-4" /> : <Receipt className="size-4" />}<span className="sr-only">Attach receipt from gallery</span><input className="sr-only" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) onReceipt(expense, file); }} /></label><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{expense.title}</p><p className="truncate text-xs text-muted-foreground">{payer} paid · {expense.category} · {shortDate(expense.expense_date)}</p></div><p className="shrink-0 font-black">{currency(expense.amount, code)}</p></div>;
}

function GroceriesView({ data, needed, onAdd, onBuy, mutate }: { data: HouseholdAppData; needed: HouseholdGrocery[]; onAdd: () => void; onBuy: (item: HouseholdGrocery) => void; mutate: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  return <div className="grid gap-5"><SectionHeading eyebrow="Shopping list" title="Groceries" action={<Button size="sm" onClick={onAdd}><Plus /> Item</Button>} /><GlassCard className="p-4"><div className="flex items-center justify-between"><div><p className="font-black">Shopping mode</p><p className="mt-1 text-sm text-muted-foreground">{needed.length} item{needed.length === 1 ? "" : "s"} need attention.</p></div><ShoppingBasket className="size-7 text-primary" /></div></GlassCard><div className="grid gap-2">{data.groceries.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"><button aria-label={`Mark ${item.name} ${item.status === "needed" ? "available" : "needed"}`} className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.status === "bought" || item.status === "available" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`} onClick={() => mutate(() => postJson("/api/app/groceries", { action: "set_status", item_id: item.id, status: item.status === "needed" ? "available" : "needed" }), "Shopping list updated")}><Check className="size-4" /></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="truncate text-xs text-muted-foreground">{item.category} · {item.status.replace("_", " ")}</p></div>{item.status === "needed" || item.status === "running_low" ? <Button size="sm" variant="outline" onClick={() => onBuy(item)}>Bought</Button> : null}</div>)}{data.groceries.length === 0 ? <EmptyState icon={ShoppingBasket} title="The list is empty" body="Add household essentials as you notice them." /> : null}</div></div>;
}

function MoreView({ data, issues, memberName, onIssue, mutate }: { data: HouseholdAppData; issues: HouseholdIssue[]; memberName: (id: string | null | undefined) => string; onIssue: () => void; mutate: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  return <div className="grid gap-5"><SectionHeading eyebrow="House controls" title="More" /><div className="grid grid-cols-2 gap-3"><Link href="/app/ai"><GlassCard className="h-full p-4"><Brain className="size-5 text-primary" /><p className="mt-3 font-black">AI Manager</p><p className="mt-1 text-xs text-muted-foreground">Explainable weekly plans</p></GlassCard></Link><Link href="/app/settings"><GlassCard className="h-full p-4"><Settings className="size-5 text-primary" /><p className="mt-3 font-black">Settings</p><p className="mt-1 text-xs text-muted-foreground">Members, invites, data</p></GlassCard></Link></div><section><SectionHeading eyebrow="People" title={`${data.members.length} household members`} /><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{data.members.map((member) => <div key={member.id} className="min-w-28 rounded-lg border border-border bg-card p-3"><div className="grid size-9 place-items-center rounded-full bg-primary/12 font-black text-primary">{member.display_name.slice(0, 1).toUpperCase()}</div><p className="mt-2 truncate text-sm font-bold">{member.display_name}</p><p className="truncate text-xs text-muted-foreground">{member.room_name || member.role}</p></div>)}</div></section><section><SectionHeading eyebrow="House issues" title="Keep requests calm" action={<Button size="sm" variant="outline" onClick={onIssue}><Plus /> Report</Button>} /><div className="mt-3 grid gap-2">{issues.map((issue) => <GlassCard key={issue.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-black">{issue.category}</p><p className="mt-1 text-xs text-muted-foreground">{issue.kind.replace("_", " ")} · {issue.location} · by {memberName(issue.reporter_member_id)}</p><p className="mt-2 text-sm leading-5">{issue.description}</p></div><CircleAlert className="size-4 shrink-0 text-amber-600" /></div><Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => mutate(() => postJson("/api/app/issues", { action: "resolve", issue_id: issue.id }), "Issue resolved")}>Resolve</Button></GlassCard>)}{issues.length === 0 ? <EmptyState icon={CheckCircle2} title="No open house issues" body="Cleanup requests and reminders will appear here." /> : null}</div></section></div>;
}

function AiView({ data, plan, busy, onGenerate }: { data: HouseholdAppData; plan: { summary: string; recommendations: Array<{ task: string; suggested_member: string; reason: string }> } | null; busy: boolean; onGenerate: () => void }) {
  return <div className="grid gap-5"><SectionHeading eyebrow="Recommendation only" title="HouseFair AI Manager" /><GlassCard className="p-5"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary"><Brain className="size-5" /></span><div><p className="font-black">Fairness before competition</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Plans compare completed minutes, points, and recent heavy work. Nothing is assigned until the house reviews it.</p></div></div><Button className="mt-4 w-full" variant="premium" disabled={busy} onClick={onGenerate}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />} Generate weekly plan</Button></GlassCard>{plan ? <section><p className="text-sm leading-6 text-muted-foreground">{plan.summary}</p><div className="mt-3 grid gap-3">{plan.recommendations.map((item) => <GlassCard key={item.task} className="p-4"><p className="font-black">{item.task}</p><p className="mt-1 text-sm text-primary">Suggested: {item.suggested_member}</p><p className="mt-2 text-sm leading-5 text-muted-foreground">{item.reason}</p></GlassCard>)}</div></section> : <EmptyState icon={Sparkles} title="No draft yet" body={`Generate a plan for ${data.members.length} members. It will stay a draft until reviewed.`} />}</div>;
}

function EmptyState({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return <div className="rounded-lg border border-dashed border-border bg-card/40 p-5 text-center"><Icon className="mx-auto size-6 text-primary" /><p className="mt-2 font-black">{title}</p><p className="mt-1 text-sm text-muted-foreground">{body}</p></div>;
}

function QuickActions({ open, onOpenChange, choose }: { open: boolean; onOpenChange: (open: boolean) => void; choose: (modal: ModalName) => void }) {
  const actions: Array<[ModalName, string, React.ElementType]> = [["expense", "Add expense", WalletCards], ["grocery", "Add grocery", ShoppingBasket], ["issue", "Report house issue", CircleAlert]];
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Quick actions</DialogTitle><DialogDescription>Keep the common household jobs one tap away.</DialogDescription></DialogHeader><div className="grid gap-2">{actions.map(([name, label, Icon]) => <Button key={name} variant="outline" className="justify-start" onClick={() => choose(name)}><Icon /> {label}</Button>)}</div></DialogContent></Dialog>;
}

function TaskDialog({ open, task, data, busy, onOpenChange, mutate }: { open: boolean; task: HouseholdTask | null; data: HouseholdAppData; busy: boolean; onOpenChange: (open: boolean) => void; mutate: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [checked, setChecked] = React.useState<string[]>([]);
  const [before, setBefore] = React.useState<File | null>(null);
  const [after, setAfter] = React.useState<File | null>(null);
  if (!task) return null;
  const taskId = task.id;
  async function upload(kind: "task_before" | "task_after", file: File) { const form = new FormData(); form.set("kind", kind); form.set("entity_id", taskId); form.set("file", file); const response = await fetch("/api/app/uploads", { method: "POST", body: form }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error ?? "Upload failed."); }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{task.title}</DialogTitle><DialogDescription>{task.points} points because: {task.points_reason || task.difficulty_reason}</DialogDescription></DialogHeader><div className="grid gap-2">{task.checklist.map((item) => <label key={item} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm font-semibold"><input type="checkbox" className="size-5 accent-primary" checked={checked.includes(item)} onChange={(event) => setChecked((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))} />{item}</label>)}</div>{task.proof_required ? <div className="grid grid-cols-2 gap-2"><label className="grid min-h-24 place-items-center rounded-lg border border-dashed border-border bg-card p-3 text-center text-xs font-bold"><Camera className="size-5 text-primary" />Before photo<input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => setBefore(event.target.files?.[0] ?? null)} /></label><label className="grid min-h-24 place-items-center rounded-lg border border-dashed border-border bg-card p-3 text-center text-xs font-bold"><Camera className="size-5 text-primary" />After photo<input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => setAfter(event.target.files?.[0] ?? null)} /></label><p className="col-span-2 text-xs text-muted-foreground">Task proof uses the live camera. Receipts use the gallery.</p></div> : null}<form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); mutate(async () => { if (task.proof_required) { if (!before || !after) throw new Error("Take both before and after photos."); await upload("task_before", before); await upload("task_after", after); } await postJson("/api/app/tasks", { action: "complete", task_id: task.id, completed_items: checked, notes: form.get("notes") }); }, `Completed ${task.title}`); }}><label className="grid gap-2 text-sm font-bold">Completion notes<textarea name="notes" className="min-h-20 rounded-lg border border-input bg-background p-3 font-normal" placeholder="Anything the house should know?" /></label><Button className="mt-3 w-full" type="submit" disabled={busy || checked.length !== task.checklist.length}>{busy ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />} Complete for +{task.points}</Button></form><p className="text-xs text-muted-foreground">Assigned to {data.members.find((member) => member.id === task.assigned_member_id)?.display_name ?? "anyone"} · {task.estimated_minutes} minutes</p></DialogContent></Dialog>;
}

function ExpenseDialog({ open, data, busy, onOpenChange, mutate }: { open: boolean; data: HouseholdAppData; busy: boolean; onOpenChange: (open: boolean) => void; mutate: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [method, setMethod] = React.useState("equal");
  const [participants, setParticipants] = React.useState(data.members.map((member) => member.id));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Add shared expense</DialogTitle><DialogDescription>Every split is auditable and balances are simplified automatically.</DialogDescription></DialogHeader><form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const values = Object.fromEntries(participants.map((id) => [id, Number(form.get(`split_${id}`) || 0)])); mutate(() => postJson("/api/app/money", { action: "expense", title: form.get("title"), amount: form.get("amount"), category: form.get("category"), paid_by_member_id: form.get("paid_by"), expense_date: form.get("date"), notes: form.get("notes"), split_method: method, participant_ids: participants, split_values: values }), "Expense added"); }}><Input name="title" label="Title" placeholder="Electricity bill" required /><div className="grid grid-cols-2 gap-2"><Input name="amount" label={`Amount (${data.household.currency})`} type="number" step="0.01" min="0.01" required /><Input name="date" label="Date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div><Select name="category" label="Category" options={["Food", "Cleaning", "Bills", "Internet", "Electricity", "Transport", "Entertainment", "Emergency", "Other"]} /><Select name="paid_by" label="Paid by" options={data.members.map((member) => ({ value: member.id, label: member.display_name }))} defaultValue={data.currentMember.id} /><Select name="split_method" label="Split method" options={[{ value: "equal", label: "Equal" }, { value: "exact", label: "Exact amounts" }, { value: "percentage", label: "Percentages" }, { value: "shares", label: "Shares" }]} value={method} onChange={(event) => setMethod(event.target.value)} /><div className="grid gap-2"><p className="text-sm font-bold">Split with</p>{data.members.map((member) => { const selected = participants.includes(member.id); return <div key={member.id} className="flex items-center gap-2 rounded-lg border border-border p-2"><input type="checkbox" className="size-5 accent-primary" checked={selected} onChange={(event) => setParticipants((current) => event.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{member.display_name}</span>{method !== "equal" && selected ? <input name={`split_${member.id}`} aria-label={`${member.display_name} split value`} className="h-9 w-24 rounded-lg border border-input bg-background px-2 text-right" type="number" min="0" step="0.01" required /> : null}</div>; })}</div><Input name="notes" label="Notes" placeholder="Optional details" /><Button type="submit" disabled={busy || participants.length === 0}>{busy ? <LoaderCircle className="animate-spin" /> : <Plus />} Add expense</Button></form></DialogContent></Dialog>;
}

function SettlementDialog({ open, data, busy, onOpenChange, mutate }: { open: boolean; data: HouseholdAppData; busy: boolean; onOpenChange: (open: boolean) => void; mutate: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const others = data.members.filter((member) => member.id !== data.currentMember.id);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Record settlement</DialogTitle><DialogDescription>Record money you paid to another household member.</DialogDescription></DialogHeader><form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); mutate(() => postJson("/api/app/money", { action: "settlement", paid_to_member_id: form.get("to"), amount: form.get("amount"), method: form.get("method"), notes: form.get("notes") }), "Settlement recorded"); }}><Select name="to" label="Paid to" options={others.map((member) => ({ value: member.id, label: member.display_name }))} /><Input name="amount" label={`Amount (${data.household.currency})`} type="number" min="0.01" step="0.01" required /><Select name="method" label="Method" options={[{ value: "bank_transfer", label: "Bank transfer" }, { value: "cash", label: "Cash" }, { value: "other", label: "Other" }]} /><Input name="notes" label="Notes" placeholder="Optional reference" /><Button type="submit" disabled={busy || others.length === 0}>{busy ? <LoaderCircle className="animate-spin" /> : <Banknote />} Save settlement</Button></form></DialogContent></Dialog>;
}

function GroceryDialog({ open, busy, onOpenChange, mutate }: { open: boolean; busy: boolean; onOpenChange: (open: boolean) => void; mutate: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Add grocery</DialogTitle><DialogDescription>Add an item to the shared shopping list.</DialogDescription></DialogHeader><form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); mutate(() => postJson("/api/app/groceries", { action: "add", name: form.get("name"), category: form.get("category"), quantity: form.get("quantity"), notes: form.get("notes") }), "Grocery added"); }}><Input name="name" label="Item" placeholder="Milk" required /><Input name="category" label="Category" placeholder="Dairy" required /><Input name="quantity" label="Quantity" placeholder="2 litres" /><Input name="notes" label="Notes" placeholder="Brand or size" /><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <ShoppingBasket />} Add to list</Button></form></DialogContent></Dialog>;
}

function BuyDialog({ open, item, data, busy, onOpenChange, mutate }: { open: boolean; item: HouseholdGrocery | null; data: HouseholdAppData; busy: boolean; onOpenChange: (open: boolean) => void; mutate: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [shared, setShared] = React.useState(true);
  if (!item) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Bought {item.name}</DialogTitle><DialogDescription>Add the price and optionally split it with the household.</DialogDescription></DialogHeader><form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); mutate(() => postJson("/api/app/groceries", { action: "bought", item_id: item.id, price: form.get("price") || undefined, add_expense: shared }), `${item.name} marked bought`); }}><Input name="price" label={`Price (${data.household.currency})`} type="number" min="0" step="0.01" /><label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-bold"><input type="checkbox" className="size-5 accent-primary" checked={shared} onChange={(event) => setShared(event.target.checked)} />Split this purchase with the house</label><p className="text-xs text-muted-foreground">Receipt images can be attached from the expense timeline after creation.</p><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Check />} Mark bought</Button></form></DialogContent></Dialog>;
}

function IssueDialog({ open, data, busy, onOpenChange, mutate }: { open: boolean; data: HouseholdAppData; busy: boolean; onOpenChange: (open: boolean) => void; mutate: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>House issue</DialogTitle><DialogDescription>Use the lightest workflow that solves the problem.</DialogDescription></DialogHeader><form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); mutate(() => postJson("/api/app/issues", { action: "create", kind: form.get("kind"), category: form.get("category"), location: form.get("location"), description: form.get("description"), person_involved_member_id: form.get("person") || null }), "House issue added"); }}><Select name="kind" label="What do you need?" options={[{ value: "reminder", label: "Friendly reminder" }, { value: "cleanup_request", label: "Request cleanup" }, { value: "report", label: "Report issue" }]} /><Select name="category" label="Category" options={["Dirty dishes", "Kitchen mess", "Bathroom mess", "Trash issue", "Noise", "Guest issue", "Missed task", "Other"]} /><Input name="location" label="Location" placeholder="Kitchen" required /><Select name="person" label="Person involved (optional)" options={[{ value: "", label: "No one specific" }, ...data.members.map((member) => ({ value: member.id, label: member.display_name }))]} /><label className="grid gap-2 text-sm font-bold">Description<textarea name="description" className="min-h-24 rounded-lg border border-input bg-background p-3 font-normal" minLength={4} maxLength={1000} required /></label><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <CircleAlert />} Add house issue</Button></form></DialogContent></Dialog>;
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="grid gap-2 text-sm font-bold">{label}<input className="h-11 min-w-0 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" {...props} /></label>;
}

function Select({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Array<string | { value: string; label: string }> }) {
  return <label className="grid gap-2 text-sm font-bold">{label}<select className="h-11 min-w-0 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" {...props}>{options.map((option) => { const value = typeof option === "string" ? option : option.value; const text = typeof option === "string" ? option : option.label; return <option key={value} value={value}>{text}</option>; })}</select></label>;
}
