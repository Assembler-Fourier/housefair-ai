# Contributing

HouseFair is publicly reviewable but not currently offered as an open-source community project. Small, focused bug reports and pull requests may still be considered.

## Local Checks

Use Node.js 22 or newer.

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

The default Playwright configuration starts the production server on port `3100` and exercises the self-contained demo. Do not place production credentials in local scripts or test fixtures.

## Change Rules

- Keep every multi-household query scoped by a server-resolved `household_id`.
- Add or update tests when behavior changes.
- Preserve the self-contained demo so public CI remains credential-free.
- Keep provider secrets server-only and document new variables in `.env.example`.
- Do not add real household names, messages, receipts, proof images, or account details.
- Update the relevant architecture or decision document when a trust boundary changes.

## Pull Requests

Explain the problem, the changed behavior, verification performed, migration impact, security impact, and any manual deployment step. Keep schema migrations idempotent and ordered.

