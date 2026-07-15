# ADR 0002: Use RLS as Defence in Depth

Status: Accepted

## Context

The application uses server-owned PostgreSQL queries, while Supabase Auth and Storage still expose browser-facing trust boundaries. A missed route predicate or storage path check could otherwise cross a household boundary.

## Decision

Keep explicit server-side membership checks as the primary application boundary and use PostgreSQL/Storage RLS policies as a second boundary for browser-readable resources.

## Consequences

Security does not depend on one layer, but policies and route checks can drift. Disposable two-household integration tests are required before broader public use.

