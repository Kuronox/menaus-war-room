# Architecture

The project follows Clean Architecture, with dependencies pointing **inward** only:

```
Presentation ──▶ Application ──▶ Domain ◀── Infrastructure ◀── Data
```

Domain is the innermost layer. It defines the [Canonical Domain Model](docs/canonical-domain-model.md) and depends on nothing else. Infrastructure (parsers, adapters, persistence) depends on Domain — never the other way around — by implementing interfaces/ports that Domain and Application define. This is Dependency Inversion, not a straight linear chain: Domain never imports, references, or has any awareness of Infrastructure, Presentation, or Data.

---

The parser must be isolated.

Business logic must never depend on HRF.

**The Domain must never depend on HRF, CHPP, or any database.** The Domain represents only the rules and concepts of Hattrick — see [canonical-domain-model.md](docs/canonical-domain-model.md). Any source-specific format (HRF today; CHPP, manual entry, or any future source) is translated into the Domain's [Data Contracts](docs/data-contracts.md) by a **Source Adapter** living in Infrastructure — see [source-adapters.md](docs/source-adapters.md). No adapter-specific field name, code, or convention may cross into Domain or Application.

The AI never makes decisions.

The AI explains decisions produced by deterministic algorithms.

---

## Data import architecture (Sprint 1)

The system is designed, from the Domain outward, to be source-agnostic — able to accept data from HRF today and from CHPP, manual entry, or other sources in the future, without redesigning the Domain. This is implemented via a Ports & Adapters pattern for imports:

- **Domain**: [Canonical Domain Model](docs/canonical-domain-model.md) — Entities, Value Objects, Enumerations, Aggregates. Knows nothing about any source.
- **Application**: the import use case — invokes a Source Adapter through the Import Port, applies [Validation Rules](docs/validation-rules.md), and passes accepted [Data Contracts](docs/data-contracts.md) onward.
- **Infrastructure**: one adapter per source. Today: `HRFAdapter`, per the [HRF Mapping Strategy](docs/hrf-mapping-strategy.md). Future: `CHPPAdapter`, `ManualEntryAdapter`, others — see [source-adapters.md](docs/source-adapters.md).
- **Data**: persistence of already-validated snapshots — not yet designed (out of scope until a later Sprint).

Every accepted data point is tied to an `ImportBatch` recording its source and observation time — the Domain models "stable identity over time" (Club, Player, Coach...) separately from "point-in-time snapshots" (economy, training, condition, lineup...), because a single import (from any source) is a snapshot, and historical analysis requires accumulating snapshots, not overwriting state.

---

Current source of truth (data-trust policy — see [DECISIONS.md](DECISIONS.md) D-002)

1. HRF
2. Manual league data
3. Manual opponent data

This policy is unchanged by the source-agnostic architecture above: HRF remains the authoritative source for the club's own data today. The architecture simply avoids hard-coding that policy into the Domain, so it can extend to additional sources later without a redesign.