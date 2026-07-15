# ADR 0005: Keep Planning Recommendations Reversible

Status: Accepted

## Context

Household planning can affect workload and relationships. An opaque assignment or automatic penalty would make mistakes difficult to challenge.

## Decision

Planning output remains a recommendation with visible reasons. Rule-based behavior remains available when no model provider is configured, and a person reviews the plan before assignments change.

## Consequences

The product avoids pretending that generated output is authoritative. It requires an extra review step and still needs product evaluation for bias, correction, and feedback before wider use.

