# HouseFair Security

HouseFair stores household routines, issues, expenses, receipts, and cleaning proof. Treat production access as sensitive even though the app is not a bank or health service.

## Trust boundaries

- Supabase Auth issues and refreshes browser sessions.
- Every commercial server route resolves the signed-in user, active household, and member before reading or writing household data.
- Commercial writes use a server-only pooled `DATABASE_URL` and always include the resolved `household_id`.
- Browser-readable tenant tables use RLS based on active membership.
- Direct browser writes to commercial tables are denied; mutations go through validated server routes.
- Storage objects begin with the household UUID. Storage RLS checks active household membership before read, insert, update, or delete.
- Legacy private-house mutation APIs are rewritten to a 404 unless `LEGACY_PRIVATE_APP_ENABLED=true` is deliberately set.

## Secrets

Never commit or expose:

- `DATABASE_URL`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VAPID_PRIVATE_KEY`
- `OPENAI_API_KEY`
- maintenance, cron, or deployment tokens

Only values prefixed with `NEXT_PUBLIC_` are allowed in browser bundles. A Supabase publishable key is intentionally public and relies on RLS for data protection.

Production database access uses `DATABASE_URL`. Optional provider credentials must remain server-only and should be rotated immediately if they are ever exposed.

## Uploads

- Images are limited to JPG, PNG, WebP, or HEIC.
- Maximum size is 8 MB.
- Upload endpoints are rate-limited.
- Task proof uses mobile camera capture in the UI.
- Receipts use gallery upload.
- AI proof analysis is advisory and never applies an automatic penalty.

## Billing

Paid billing is disabled during free early access. Before enabling it:

- use Stripe test mode;
- verify webhook signatures against the raw request body;
- keep event IDs idempotent;
- test failed payments, cancellation, and Customer Portal returns;
- configure live values only in Vercel production environment variables.

## Reporting

For a suspected vulnerability, remove affected credentials first, preserve Vercel/Supabase logs, and document the route, timestamp, household ID, and expected versus actual behavior. Do not include receipt or proof images in an unencrypted report.
