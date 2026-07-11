# HouseFair Launch Audit

Date: 11 July 2026

## Verdict

HouseFair is ready for a controlled free early-access launch. It is not ready to charge the public yet.

Launch score: **92/100 for free early access**

Paid-production score: **82/100** until SMTP, Stripe test-mode billing, legal review, monitoring, and commercial push scheduling are complete.

## What is production-ready

- Real household isolation through `households`, `household_members`, and household-scoped operational tables
- Supabase Auth sessions checked again inside server routes
- Server-only PostgreSQL credentials; the rejected Supabase secret key was removed from Vercel
- RLS on SaaS tables and membership-checked Storage RLS
- Public legacy mutation APIs disabled by default
- Safe internal-only auth callback redirects
- Input validation and rate limits on task, grocery, money, issue, upload, invite, and AI routes
- Recurring routines that create the next occurrence after completion
- Carry-over work with reminder records instead of punishment
- Exact money arithmetic in cents and debt simplification
- Before/after proof and gallery receipt uploads with file validation
- Recommendation-only fairness plans with an explanation per assignment
- JSON backup and activity CSV export for household admins
- PWA registration, manifest, icons, offline screen, and private-page cache protection
- Mobile navigation and every commercial screen verified at 390px with zero horizontal overflow

## Market position

| Product | Strongest area | Gap HouseFair targets |
|---|---|---|
| Splitwise | Shared expenses, custom splits, receipts, settlements | No chore quality, groceries, house issues, or workload fairness |
| Sweepy | Cleaning status, smart schedules, gamification | Money and roommate conflict workflows are outside its core |
| Nipto | Chore points, rewards, schedules, statistics | Competition-first design can become noisy in adult shared houses |
| Flatastic | Chores, shopping, expenses, pinboard | Less depth in proof, explainable fairness, and Splitwise-style splitting |
| Schedgy | Automatic rotations, weighted tasks, activity | No integrated groceries, shared money, or issue resolution |

HouseFair should not market itself as “all of these apps copied into one.” The clearer position is: **the roommate command center that explains what is fair and reduces awkward conversations.**

Sources reviewed: `splitwise.com/offer`, `sweepy.com`, `nipto.app`, `flatastic-app.com`, and `schedgy.app`.

## Verification evidence

- `npm run lint`: passed
- `npm run build`: passed on Next.js 16.2.10
- `npm run test:e2e`: 12/12 passed
- Viewports: 390px mobile, iPhone PWA, Android PWA
- Authenticated database smoke test: passed
- Commercial routes checked: Today, Tasks, Groceries, Money, More, AI, Settings
- Horizontal overflow: 0px on all seven routes
- Browser console errors: 0
- Real writes confirmed: recurring task, heavy proof, grocery purchase, shared expense, issue, AI plan, invite
- Two-roommate invite acceptance: HTTP 200, both members resolved the same household, 0px overflow
- Receipt gallery upload: HTTP 200
- Heavy task proof completion: HTTP 200
- Legacy private API: HTTP 404
- Test household, test user, and test uploads removed after verification

## Remaining launch risks

1. Supabase’s built-in email service is rate-limited and should not be treated as public-production SMTP. Configure Resend, Postmark, or another SMTP provider before marketing broadly.
2. Stripe has only a publishable live key. Real billing still needs a test secret key, test prices, a webhook signing secret, Customer Portal configuration, and completed failure/cancellation tests.
3. The privacy, terms, and refund pages are product placeholders, not reviewed legal documents.
4. New commercial push subscriptions and scheduled reminders are not connected to the household-scoped tables yet.
5. Error logs exist in Vercel runtime output, but no alerting or external error tracker is configured.
6. Physical-device checks remain necessary for iOS camera capture, Android PWA install, and notification permissions.

## Next plan

### Launch now

- Deploy the free build
- Invite one household only
- Watch onboarding, task completion, and grocery-to-money usage for one week
- Collect friction notes instead of feature requests alone

### Before inviting strangers

- Add custom SMTP and verify delivery/recovery
- Add error monitoring and a privacy-safe product analytics funnel
- Test a second roommate joining from a separate physical device
- Add commercial push reminders for overdue tasks, bins, and groceries

### Before charging

- Run Stripe entirely in test mode
- Verify webhook idempotency, failed payments, cancellation, and portal return paths
- Get legal pages reviewed
- Decide the paid boundary from observed usage; keep core household coordination useful on the free plan

## Product advice

Do not compete with Splitwise on transaction volume or Sweepy on cleaning content breadth. HouseFair wins when a household can answer three questions quickly:

1. What needs attention today?
2. Is the work and money balance understandable?
3. What is the least awkward next action?

That is the product worth selling.
