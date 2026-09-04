# Current Sprint

Sprint 1 — Canonical Domain Model

## Done (documentation only — no code written)

- [Canonical Domain Model](docs/canonical-domain-model.md) — Entities, Value Objects, Enumerations, Relationships, Aggregates
- [Data Contracts](docs/data-contracts.md)
- [HRF Mapping Strategy](docs/hrf-mapping-strategy.md)
- [Source Adapters architecture](docs/source-adapters.md) — HRF, CHPP (future), Manual, future sources
- [Validation Rules](docs/validation-rules.md)
- `ARCHITECTURE.md` updated: explicit dependency-inversion diagram, Domain independence from HRF/CHPP/DB, Ports & Adapters import architecture
- `DECISIONS.md` updated: D-005 through D-010 (two of them — D-009, D-010 — logged as **Propuesta**, pending explicit user approval)

## Pending — blocked on user approval before any implementation

- Approve or resolve D-009 (map unverified skill fields into the Domain, marked low-confidence) and D-010 (interim source-conflict principles)
- Manual verification recommended in `hrf-mapping-strategy.md` §4: compare a known Menaus player's skill values in the `.hrf` against their in-game skill screen, before Sprint 2/3 relies on them for a recommendation
- Implement `HRFAdapter` (Infrastructure layer) per the Mapping Strategy
- Implement the Import Use Case (Application layer) applying the Validation Rules
- Design persistence for validated snapshots (explicitly out of scope until this is reached)

---

## Sprint 0 — Data Discovery (closed)

Delivered:

- [HRF Data Dictionary](docs/hrf-data-dictionary.md) — field-by-field, evidence-based, verified against official Hattrick documentation (Manual/Wiki/Developer Blog) with per-field confidence and citations
- [HRF-derived Domain Model](docs/hrf-domain-model.md) — entities/relations as evidenced by the HRF specifically, superseded for system design purposes by Sprint 1's source-independent Canonical Domain Model, but kept as the evidentiary record

---

Future

- Import Service (orchestrates Source Adapters + Validation Rules)
- Database / Repository Layer
- Weekly Report
- Training Engine
- Tactical Engine
