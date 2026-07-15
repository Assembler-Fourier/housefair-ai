# ADR 0004: Do Not Cache Authenticated HTML

Status: Accepted

## Context

An installable PWA improves access, but cached household pages can expose private content after logout or on a shared device.

## Decision

Precache only the public shell and static assets. Use network-first navigation, exclude API requests, and show a generic offline page when authenticated routes are unavailable.

## Consequences

Private workflows do not work fully offline. That limitation is preferable to persisting household HTML in a broad service-worker cache.

