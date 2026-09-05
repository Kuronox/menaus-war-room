# Architecture

The project follows Clean Architecture, with dependencies pointing **inward** only:

```
Presentation ──▶ Application ──▶ Domain ◀── Infrastructure
```

Domain is the innermost layer. It defines the [Canonical Domain Model](docs/canonical-domain-model.md) and depends on nothing else. Infrastructure depends on Domain — never the other way around — by implementing interfaces/ports that Domain and Application define. This is Dependency Inversion, not a straight linear chain: Domain never imports, references, or has any awareness of Infrastructure or Presentation.

Persistence is not a separate layer: a database repository is, architecturally, an adapter like any other (see [source-adapters.md](docs/source-adapters.md)) — it implements a port, lives inside Infrastructure, and Domain never knows it exists. There is no `Data` layer sitting beside Infrastructure; when persistence is designed, it lives at `infrastructure/persistence/` (see `DECISIONS.md` D-012).

---

The parser must be isolated.

Business logic must never depend on HRF.

**The Domain must never depend on HRF, CHPP, or any database.** The Domain represents only the rules and concepts of Hattrick — see [canonical-domain-model.md](docs/canonical-domain-model.md). Any source-specific format (HRF today; CHPP, manual entry, or any future source) is translated into the Domain's [Data Contracts](docs/data-contracts.md) by a **Source Adapter** living in Infrastructure — see [source-adapters.md](docs/source-adapters.md). No adapter-specific field name, code, or convention may cross into Domain or Application.

The AI never makes decisions.

The AI explains decisions produced by deterministic algorithms.

---

## Data import architecture (Sprint 1 — target design)

The system is designed, from the Domain outward, to be source-agnostic — able to accept data from HRF today and from CHPP, manual entry, or other sources in the future, without redesigning the Domain. This is the **target** shape via a Ports & Adapters pattern for imports:

- **Domain**: [Canonical Domain Model](docs/canonical-domain-model.md) — Entities, Value Objects, Enumerations, Aggregates. Knows nothing about any source.
- **Application**: the import use case — invokes a Source Adapter through the Import Port, applies [Validation Rules](docs/validation-rules.md), and passes accepted [Data Contracts](docs/data-contracts.md) onward.
- **Infrastructure**: one adapter per source. Today: `HrfAdapter`, per the [HRF Mapping Strategy](docs/hrf-mapping-strategy.md). Future: `CHPPAdapter`, `ManualEntryAdapter`, others — see [source-adapters.md](docs/source-adapters.md). Persistence of already-validated snapshots will live here too, as a persistence adapter — not yet designed (out of scope until a later Sprint).

Every accepted data point is tied to an `ImportBatch` recording its source and observation time — the Domain models "stable identity over time" (Club, Player, Coach...) separately from "point-in-time snapshots" (economy, training, condition, lineup...), because a single import (from any source) is a snapshot, and historical analysis requires accumulating snapshots, not overwriting state.

**Current state, not yet the target above:** there is no Import Port today — `ImportHrfUseCase` (Application) depends directly on the concrete `HrfFileReader`/`HrfSectionParser`/`HrfAdapter`, accepted as explicit, temporary technical debt (`DECISIONS.md` D-015). Nothing produced by the pipeline carries an `ImportBatch` yet either — `Club` is stable identity, not a snapshot, so it doesn't need one; `ImportBatch` is introduced with the first real snapshot type, not before (D-006, D-021). Both paragraphs above describe where the architecture is heading, not what runs today.

---

Current source of truth (data-trust policy — see [DECISIONS.md](DECISIONS.md) D-002)

1. HRF
2. Manual league data
3. Manual opponent data

This policy is unchanged by the source-agnostic architecture above: HRF remains the authoritative source for the club's own data today. The architecture simply avoids hard-coding that policy into the Domain, so it can extend to additional sources later without a redesign.

---

## Technology stack

The layers above are implemented, once approved, with the stack recorded in [TECH_STACK.md](TECH_STACK.md): TypeScript (strict), Node.js LTS, NestJS, pnpm, Vitest, ESLint, Prettier.

NestJS's module boundaries are what will realize the layer diagram in practice once wired up: Domain, Application and Infrastructure as distinct modules, with the Import Port ([source-adapters.md](docs/source-adapters.md)) as an injectable abstraction that Application depends on by interface only. **Not wired up today** — no NestJS module currently registers any provider; `ImportHrfUseCase.create()` constructs `HrfFileReader`/`HrfSectionParser`/`HrfAdapter` by hand (D-015), and `analyze.ts` calls that factory directly instead of going through Nest's DI container.

No ORM is introduced with this stack — see `TECH_STACK.md` and `DECISIONS.md` D-011 — until persistence is actually designed.