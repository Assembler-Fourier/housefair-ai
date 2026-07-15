# Production Readiness

## Current Verdict

HouseFair is a public technical preview. The repository shows a production-shaped architecture, but the complete operational system has not been verified for an unmanaged public or paid launch.

## Verified in Public CI

- dependency installation from the lockfile;
- ESLint;
- TypeScript validation;
- Next.js production build; and
- self-contained public/demo Playwright flows across configured mobile/PWA projects.

## Requires Configured Test Infrastructure

- Supabase Auth sign-up, callback, refresh, logout, and recovery;
- cross-household read/write isolation against a disposable database;
- RLS and Storage policy checks with two real authenticated users;
- database migration apply and rollback rehearsal;
- invite acceptance and membership-limit concurrency;
- transaction behavior for expenses and split records; and
- scheduled maintenance and push routes with test credentials.

## Required Before Broader Public Use

- replace placeholder privacy, terms, refund, and support content with reviewed documents;
- configure a production email provider and test delivery/recovery;
- configure privacy-safe error monitoring and an incident-response contact;
- review data retention, export, and deletion operations;
- test install, camera capture, upload, and notifications on physical iOS and Android devices;
- validate rate limiting in a distributed runtime; and
- complete accessibility review at keyboard, screen-reader, zoom, reduced-motion, and contrast levels.

## Required Before Paid Access

- use Stripe test-mode credentials and prices;
- exercise successful, failed, cancelled, replayed, and delayed webhook journeys;
- verify Customer Portal and subscription-state recovery;
- confirm webhook idempotency against a disposable database;
- document refunds and support ownership; and
- obtain legal and tax review for the intended operator.

## Deployment Checklist

1. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:e2e`.
2. Apply migrations in numeric order to a disposable environment first.
3. Confirm `HOUSEFAIR_ACCESS_MODE=free` and `LEGACY_PRIVATE_APP_ENABLED=false` unless an approved release explicitly changes them.
4. Verify public variables contain no secrets and server variables do not use `NEXT_PUBLIC_`.
5. Smoke-test `/`, `/demo`, `/auth`, `/app`, `/offline`, `/privacy`, `/terms`, and `/api/health`.
6. Confirm API routes and authenticated HTML are not stored by the service worker.
7. Record the deployment commit and remaining environment-backed checks.

## Rollback

Promote the last known-good Vercel deployment, disable optional provider integrations if they are involved, preserve relevant logs without household content, and verify the public/demo smoke path before reopening access. Database rollback requires a reviewed migration-specific plan and a current backup; do not improvise destructive SQL in production.

