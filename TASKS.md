# Current Sprint

Sprint 2 — Backend Implementation

## HU1 — Inicializar el backend del proyecto (closed, approved)

Delivered: NestJS + TypeScript (strict) + pnpm + Vitest + ESLint + Prettier scaffold under `backend/`, following `ARCHITECTURE.md`'s layers (`presentation/`, `application/`, `domain/`, `infrastructure/`). No domain, parser, API, use cases, persistence or logic implemented — initialization only. `pnpm install`/`build`/`test`/`lint` all green.

## HU2 — Bases del dominio (closed, approved 2026-09-04)

Delivered: [Entity](backend/src/domain/entity.ts) and [ValueObject](backend/src/domain/value-object.ts) base classes — independent hierarchies, identity-based vs. structural equality, hand-rolled deep equality (no external dependency), shallow `Object.freeze` immutability. 13 tests. `Player`, `Club`, `Match`, `Coach` deliberately not implemented (out of scope for this HU).

Deliberately deferred, with reasoning given and user-approved — **not to be implemented without a new, explicit HU**:
- `AggregateRoot` — would be an empty subclass of `Entity` today (no event collection, no cross-entity invariant to enforce yet).
- `DomainEvent` — no documented use case requires reacting to something happening inside an aggregate yet.
- A `Result`/domain-error-hierarchy pattern — no real invariant exists yet to validate against; decide with the first concrete case, not in the abstract.
- A branded `Identifier<T>` type — `Entity<TId>` stays generic until a real entity exists to decide its ID shape.
- Deep-freezing `ValueObject` props — current freeze is shallow by design; revisit only if a real nested-mutation case appears.

Noted for the future, explicitly **not decided now**:
- Identifiers will likely evolve into their own Value Objects (`PlayerId`, `ClubId`, ...) instead of raw primitives — not a decision for this sprint.
- When the domain grows, evaluate moving `Entity`/`ValueObject` into a `domain/base/` (or similar) folder — not to be done yet.

## Milestone — first executable vertical slice (2026-09-04)

`pnpm analyze <file.hrf>` runs the full pipeline end to end against real HRF files and prints a Spanish console report: `HrfFileReader` → `HrfSectionParser` → `HrfAdapter` → `ImportHrfUseCase` (produces `ClubContract`) → `Club.create()` (called from the CLI script, not yet from the use case — see below). This is the first point at which the system does something real, not just scaffolding.

Delivered to reach it (all approved, all tested, `pnpm build`/`test`/`lint` green throughout):
- [HrfFileReader](backend/src/infrastructure/hrf/hrf-file-reader.ts)
- [HrfSectionParser](backend/src/infrastructure/hrf/hrf-section-parser.ts) (`Section[]`, not `Record` — see D-013/chat history for why)
- [HrfAdapter](backend/src/infrastructure/hrf/hrf-adapter.ts) → `ClubContract`
- [ImportHrfUseCase](backend/src/application/import-hrf.use-case.ts) — composes the three above; **depends on them directly, not on an abstract Import Port — explicit technical debt, see D-015**
- [Club](backend/src/domain/club.ts) entity (`Entity<string>`, private constructor + `Club.create()` factory, per D-014)
- [analyze CLI](backend/src/presentation/analyze.ts) (`pnpm analyze`)

Deprioritized/shelved, not abandoned:
- `Denomination` + `RatingScaleType` — returns once the Report needs a real skill/attribute number.
- The Application↔Domain integration (`ImportHrfUseCase` returning `Club` instead of `ClubContract`) — deliberately kept as its own future HU, not folded into the CLI story.

Default set for the next real domain invariant, wherever it first appears (D-014): a specific domain exception (not `Result<T>`, not a generic `Error`), until a strong reason argues otherwise.

---

## Sprint 1 — Canonical Domain Model (closed)

Delivered (documentation only — no code written):

- [Canonical Domain Model](docs/canonical-domain-model.md) — Entities, Value Objects, Enumerations, Relationships, Aggregates
- [Data Contracts](docs/data-contracts.md)
- [HRF Mapping Strategy](docs/hrf-mapping-strategy.md)
- [Source Adapters architecture](docs/source-adapters.md) — HRF, CHPP (future), Manual, future sources
- [Validation Rules](docs/validation-rules.md)
- [Manager Usage Flow](docs/manager-usage-flow.md)
- [TECH_STACK.md](TECH_STACK.md)
- `ARCHITECTURE.md`, `DECISIONS.md` updated through D-013 (D-009, D-010 remain logged as **Propuesta**, still pending explicit resolution — see below)

Still open from Sprint 1, carried forward (not blocking HU3, will block relying on HRF skill data for a real recommendation):

- Resolve D-009 (map unverified skill fields into the Domain, marked low-confidence) and D-010 (interim source-conflict principles)
- Manual verification recommended in `hrf-mapping-strategy.md` §4: compare a known Menaus player's skill values in the `.hrf` against their in-game skill screen
- Implement `HRFAdapter`, the Import Use Case, and persistence — all still pending, in that order, after the domain kernel is further built out

---

## Sprint 0 — Data Discovery (closed)

Delivered:

- [HRF Data Dictionary](docs/hrf-data-dictionary.md) — field-by-field, evidence-based, verified against official Hattrick documentation (Manual/Wiki/Developer Blog) with per-field confidence and citations
- [HRF-derived Domain Model](docs/hrf-domain-model.md) — entities/relations as evidenced by the HRF specifically, superseded for system design purposes by Sprint 1's source-independent Canonical Domain Model, but kept as the evidentiary record

---

Future

- Value Objects and Enumerations that don't depend on any Entity (`Denomination`, `SkillRating`, `PersonalityProfile`, `Specialty`, ... — see `canonical-domain-model.md` §2–3)
- First real Entities (`Player`, `Club`, `Coach`, ...)
- Import Service (orchestrates Source Adapters + Validation Rules)
- Database / Repository Layer (persistence adapter inside Infrastructure — see D-012)
- Weekly Report
- Training Engine
- Tactical Engine
