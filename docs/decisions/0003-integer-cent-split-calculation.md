# ADR 0003: Calculate Expense Splits in Integer Cents

Status: Accepted

## Context

Equal and weighted decimal splits can lose or create a cent when floating-point values are rounded independently.

## Decision

Convert the submitted total to integer cents, allocate whole cents by weight, distribute the remainder deterministically, and persist fixed two-decimal values in PostgreSQL numeric columns.

## Consequences

Participant splits add back to the submitted total. Currency-specific minor-unit rules are not yet modelled, so the current implementation assumes two-decimal currencies.

