# HouseFair AI

HouseFair AI is a mobile-first Progressive Web App for a six-person house. It manages shared cleaning tasks, points, complaints, groceries, proof images, fairness analytics, push notifications, and an AI assistant named **HouseFair AI Manager**.

## Stack

- Next.js 16 App Router, TypeScript, Tailwind CSS 4
- shadcn/ui-style Radix primitives
- Framer Motion animations and Lucide icons
- Supabase PostgreSQL and private Supabase Storage
- Web Push notifications
- Optional OpenAI-compatible AI route through `OPENAI_API_KEY` and `OPENAI_MODEL`
- Device/PIN identity with no login, signup, or admin account

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs with seeded local data until Supabase environment variables are configured. On first use, a housemate selects their name and creates a private 4-digit house PIN for that device. Future visits require PIN confirmation, and the PIN can be reset from the unlock screen by entering the current PIN and a new 4-digit PIN.

## Supabase Setup

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations/` in order through the Supabase SQL editor or Supabase CLI.
3. Create the environment variables from `.env.example`.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only in Vercel.

The migration creates:

- `users`, `rooms`, `areas`
- `tasks`, `task_history`, `points_ledger`
- `complaints`, `complaint_votes`
- `groceries`, `notifications`, `availability`
- `ai_recommendations`, `proof_images`
- `user_devices`, `task_swaps`, `rewards`, `audit_logs`, `recurring_task_rules`
- `push_subscriptions` for Web Push delivery
- private `proof-images` Supabase Storage bucket
- deny-by-default Row Level Security policies for direct client access

It also enforces the top floor bathroom rule so Blair cannot be assigned that task.

## Environment

```bash
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWKS_URL=

CRON_SECRET=
HOUSEFAIR_CRON_SECRET=

NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:housefair@example.com

OPENAI_API_KEY=
OPENAI_MODEL=
```

Generate VAPID keys with:

```bash
npx web-push generate-vapid-keys
```

`OPENAI_MODEL` is optional. Without it, HouseFair AI Manager uses the built-in fairness engine and still generates draft plans.

`CRON_SECRET` protects `/api/scheduler/run` and `/api/notifications/send`. `HOUSEFAIR_CRON_SECRET` is also supported for manual calls. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.

Never expose `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to client components or `NEXT_PUBLIC_*` variables.

## Verification

```bash
npm run lint
npm run build
```

Both commands should pass before deploying to Vercel.
