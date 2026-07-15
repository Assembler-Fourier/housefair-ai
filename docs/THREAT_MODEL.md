# Threat Model Summary

## Protected Assets

- household membership and profile data;
- chores, availability, issues, announcements, and activity history;
- expenses, splits, settlements, budgets, and receipts;
- task proof and other uploaded images;
- invitations, sessions, provider credentials, and audit records.

## Main Trust Boundaries

1. Browser to Next.js server routes.
2. Server routes to PostgreSQL.
3. Authenticated browser to Supabase Storage.
4. Server routes to Stripe, push, and model providers.
5. Original `/demo` surface to the current multi-household product.

## Priority Threats and Controls

| Threat | Existing control | Residual risk / next check |
| --- | --- | --- |
| Broken household access | Server resolves user, household, and active membership; queries include `household_id`; RLS is a second boundary. | Run two-user cross-household integration tests against disposable Supabase infrastructure. |
| Privilege escalation | Owner/admin route guard and membership roles. | Add a route-level authorization matrix with real sessions. |
| Malicious or oversized input | Zod validation, body constraints, file type/size checks, and route rate limits. | Process-local fallback limits are not sufficient for distributed production traffic. |
| Private upload disclosure | Household UUID path convention and Storage RLS membership function. | Verify every CRUD policy using two authenticated households. |
| Cached authenticated content | Network-first navigation; no API caching; only public shell/static assets cached. | Test browser upgrades and stale service-worker replacement. |
| Payment forgery or replay | Server-created checkout, signed raw-body webhook, event record for idempotency. | Real Stripe test-mode journeys and database-backed replay tests remain required. |
| Secret exposure | Server-only environment variables and `.env.example` placeholders. | Enable provider/repository secret scanning and rotate any exposed value immediately. |
| Recommendation causes unfair action | Explainable, reviewable recommendation flow; no automatic punishment. | Add product review for bias, feedback, and correction paths before wider use. |
| Legacy route exposure | Legacy mutations disabled unless explicitly enabled. | Keep a deployment smoke check for expected `404` behavior. |

This document describes repository controls, not a certification or guarantee that a deployment is secure.

