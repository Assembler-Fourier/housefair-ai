# ADR 0001: Resolve Household Scope on the Server

Status: Accepted

## Context

Browser-supplied household IDs cannot establish authorization because they can be changed by the caller.

## Decision

Each multi-household route resolves the authenticated user, primary active household, and active membership before accessing household records. Queries use that resolved household ID. Administrative actions add an explicit role check.

## Consequences

Route handlers carry less caller-controlled authorization state and have one repeatable access pattern. The current primary-household assumption simplifies the product but will need an explicit, server-validated household switch if multi-household membership is added later.

