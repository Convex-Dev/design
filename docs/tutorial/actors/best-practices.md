---
slug: contracts-best-practices
title: Best Practices
sidebar_position: 3
---

Practical pointers from building and reviewing production Convex contracts.

## Development Workflow

- **Start with queries**: prototype read-only helpers before wiring in mutations—this clarifies state shape.
- **Keep tests close**: store scenario scripts next to contract code and run them through the REPL regularly.
- **Name exports clearly**: include verbs (`fetch-`, `update-`, `finalise-`) to signal intent.

## Safety Patterns

- Return structured errors like `{:error :insufficient-balance}` so callers can handle failures gracefully.
- Use guards (`require`-style checks) at the top of each export to validate permissions and inputs.
- Consider role-based controllers where an admin actor manages sensitive operations separately from day-to-day callers.

## Performance

- Cache large lattice reads in state if they are reused within the same transaction.
- Monitor juice usage; refactor hot paths into smaller helper functions to keep transactions affordable.
- Batch related updates inside a single call when possible to reduce consensus overhead.

## Observability

- Record important state transitions in a dedicated log structure with timestamps and actor IDs.
- Instrument upgrade scripts to emit hashes and configuration so you can reconstruct history later.
- Document each export with docstrings and keep them up to date—they surface in tooling and explorers.

## Maintenance

- Version your actors by embedding a `:version` key in state and bump it with each upgrade.
- Deprecate exports gradually: keep the old function but emit a warning until integrators migrate.
- Archive historical code hashes instead of deleting them; this helps audits and incident reviews.

Adopting these habits will save time as your contract suite grows in size and complexity.

