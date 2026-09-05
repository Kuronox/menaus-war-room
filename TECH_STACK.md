# Official Technology Stack

This document records the technology decisions for Menaus War Room. It complements `ARCHITECTURE.md` (which defines the layering and dependency rules) and `docs/canonical-domain-model.md` (which defines the domain these technologies must serve) — it does not change either.

No code, configuration file, or scaffolding is created by this document. It is a decision record, pending approval before any implementation begins.

---

## Language

**TypeScript**, in strict mode.

Rationale:
- Enforces the Naming Convention in `CLAUDE.md` (English identifiers in code) through the type system itself — Value Objects, Enumerations and Entities from the [Canonical Domain Model](docs/canonical-domain-model.md) map naturally to typed classes/interfaces.
- Strict null checks directly support the "never invent" data policy (`AGENTS.md`, [validation-rules.md](docs/validation-rules.md) §7): a field the Domain expects as required cannot silently compile with an undefined value standing in for missing data.

## Runtime

**Node.js LTS.**

## Framework

**NestJS.**

Rationale:
- Its module system and dependency-injection container map directly onto the architecture already designed: Domain, Application and Infrastructure ([ARCHITECTURE.md](ARCHITECTURE.md)) would become distinct Nest modules, and the **Import Port** ([source-adapters.md](docs/source-adapters.md)) would become an injectable abstraction that `HrfAdapter`, and later `CHPPAdapter` / `ManualEntryAdapter`, implement as swappable providers — without Domain ever depending on a concrete adapter. This is the target this stack was chosen to support; no NestJS module wiring exists yet (`DECISIONS.md` D-015).
- No ORM is adopted alongside it until persistence is actually designed — it will land as a persistence adapter inside Infrastructure, not as a separate layer (`ARCHITECTURE.md`, `DECISIONS.md` D-012).

## Package Manager

**pnpm.**

Rationale: efficient for a workspace that already anticipates multiple packages (`backend/`, `frontend/` are already scaffolded in the repository).

## Testing

**Vitest.**

Rationale: TypeScript-native, fast, will exercise the [Validation Rules](docs/validation-rules.md) and the [HRF Mapping Strategy](docs/hrf-mapping-strategy.md) once implemented — testing is listed here as a decision, not yet set up.

## Linting & Formatting

**ESLint** + **Prettier.**

Rationale:
- ESLint is the mechanism that will enforce, at review/CI time, the Language Policy in `CLAUDE.md`: English identifiers in code, Spanish never mixed into technical names.
- Prettier enforces consistent formatting, decoupled from linting rules, per common practice pairing the two.
- No configuration file for either is created by this document — that is implementation, out of scope until approved.

## Architecture principles (already established, restated here for traceability)

- **Clean Architecture** — dependency direction: `Presentation → Application → Domain ← Infrastructure` (`ARCHITECTURE.md`). Persistence is not a separate layer — it is a persistence adapter inside Infrastructure (`DECISIONS.md` D-012).
- **Domain-Driven Design** — Entities, Value Objects, Aggregates as defined in [canonical-domain-model.md](docs/canonical-domain-model.md).
- **Strict TypeScript** everywhere — no `any` used to paper over an unconfirmed or missing field; an unconfirmed mapping ([hrf-mapping-strategy.md](docs/hrf-mapping-strategy.md) §2) must be modeled as an explicit low-confidence value, not as a loosely-typed escape hatch.
- **No ORM until persistence is required** — persistence has not been designed yet (Sprint 1 scope stops at validated snapshots in memory/contracts, per `TASKS.md`); introducing an ORM before that design exists would let a persistence concern leak into decisions that belong to a later Sprint.

## Status

Decisions already made (per the user); this document formalizes them and is reflected in `ARCHITECTURE.md` and `DECISIONS.md`. **No code has been written.** Awaiting approval before any implementation (project scaffolding, `package.json`, linter/formatter configuration, etc.) begins.
