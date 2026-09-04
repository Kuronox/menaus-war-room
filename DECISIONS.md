# Decisions Log

## D-001

Date: 2026-09-03

Decision:
Build a War Room instead of a Dashboard.

Reason:
The system must recommend actions, not only display data.

Status:
Accepted.

---

## D-002

Date: 2026-09-03

Decision:
HRF is the single source of truth.

Reason:
Never infer players or match data from screenshots or memory.

Status:
Accepted.

---

## D-003

Date: 2026-09-03

Decision:
No code before understanding the HRF structure.

Reason:
Avoid designing the data model from assumptions.

Status:
Accepted.

---

## D-004

Date: 2026-09-03

Decision:
All assistant responses to the user must be in Spanish.

Reason:
Project owner language.

Status:
Accepted.

---

## D-005

Date: 2026-09-03

Decision:
Adopt a Canonical Domain Model that represents Hattrick's own rules and concepts, independent of HRF, CHPP, or any specific data source.

Reason:
Sprint 0 confirmed that HRF is a legacy, undocumented export format with real quirks (redundant entity representations, inconsistent field vocabularies, conditional fields). Coupling the Domain to it would violate Clean Architecture's dependency rule and block future support for CHPP, manual entry, or other sources.

Status:
Accepted.

See: [canonical-domain-model.md](docs/canonical-domain-model.md)

---

## D-006

Date: 2026-09-03

Decision:
The Domain separates stable-identity entities (Club, Player, Coach, StaffMember, Arena) from point-in-time snapshots (economy, training, player condition, lineups, standings), and every snapshot must carry explicit provenance (`ImportBatch`: source, observation time).

Reason:
Sprint 0 established that any single import (HRF or otherwise) is a snapshot of one instant, not a delta. Weekly comparison, training detection, and evolution tracking (per `Product.md`) require accumulating snapshots over time, not overwriting current state. Explicit provenance is also what allows multiple sources to coexist without silently overwriting each other.

Status:
Accepted.

See: [canonical-domain-model.md](docs/canonical-domain-model.md), [data-contracts.md](docs/data-contracts.md)

---

## D-007

Date: 2026-09-03

Decision:
`Coach` is modeled as an Entity/Aggregate distinct from `Player` and from specialist `StaffMember`, not as a special case of either.

Reason:
Official Hattrick rules (Wiki: Coach, Staff) confirm the head coach has its own skill set (training skill, leadership), its own lifecycle (external recruitment with a fixed price table, internal promotion from a player, skill deterioration over time), and is not one of the 4 hireable specialist slots. Modeling it as a distinct entity corrects a Sprint-0-documented HRF quirk (the coach appearing as a mostly-empty player block) rather than inheriting it into the Domain.

Status:
Accepted.

See: [canonical-domain-model.md](docs/canonical-domain-model.md) §1.3, §5

---

## D-008

Date: 2026-09-03

Decision:
Adopt a Ports & Adapters (Hexagonal) architecture for data import: one Source Adapter per data origin (HRFAdapter today; CHPPAdapter, ManualEntryAdapter, others later), each living in Infrastructure and each solely responsible for translating its native format into the Domain's Data Contracts.

Reason:
This is the concrete mechanism that fulfills D-005 in practice — it is what allows adding a new data source without modifying the Domain, and keeps every source-specific quirk (naming, encoding, redundancy) contained to a single adapter.

Status:
Accepted.

See: [source-adapters.md](docs/source-adapters.md)

---

## D-009 (Propuesta — pendiente de confirmación del usuario)

Date: 2026-09-03

Decision:
The `HRFAdapter` will map the 10 skill/attribute fields (`for`, `uth`, `spe`, `mal`, `fra`, `ytt`, `fas`, `bac`, `mlv`, `rut`) into the Domain despite their field-to-concept mapping remaining unconfirmed by any official Hattrick source (Sprint 0, classified 🔵). Each resulting value will be marked with a low-confidence/unverified indicator rather than being withheld.

Reason:
Withholding these fields entirely would leave Training, Tactical, and Scouting features (Sprint 2/3) with no skill data at all, defeating the product's purpose. Marking them as unverified, rather than presenting them as confirmed facts, respects the "never invent" principle while keeping the product usable.

Status:
**Propuesta.** Requiere que el usuario apruebe este trade-off explícitamente, y que se complete la verificación manual recomendada (comparar un jugador conocido contra su pantalla de habilidades dentro del juego) antes de que Sprint 2/3 confíe en estos valores para generar una recomendación al manager.

See: [hrf-mapping-strategy.md](docs/hrf-mapping-strategy.md) §4

---

## D-010 (Propuesta — pendiente de confirmación del usuario)

Date: 2026-09-03

Decision:
Source-conflict resolution (what happens when two adapters report the same fact differently) is deferred until a second adapter actually exists. Interim principles: no silent merging of conflicting values across sources, and any future "default authoritative source per data type" must be an explicit, documented configuration — not implicit adapter behavior.

Reason:
Today only the HRF adapter is planned, and manual sources cover data HRF doesn't have at all (league table, opponents) — there is no real conflict yet. Designing a full reconciliation policy now would be speculative.

Status:
**Propuesta.** Se formalizará como decisión Aceptada cuando exista un segundo adaptador activo (p. ej. CHPP).

See: [source-adapters.md](docs/source-adapters.md) §5

---

## D-011

Date: 2026-09-04

Decision:
Adopt the official technology stack: TypeScript (strict mode), Node.js LTS, NestJS, pnpm, Vitest, ESLint, Prettier. No ORM is adopted until a persistence layer is designed.

Reason:
TypeScript in strict mode directly enforces the Naming Convention (`CLAUDE.md`, English identifiers) and the "never invent" data policy (`AGENTS.md`, `validation-rules.md` §7) through the type system. NestJS's module and dependency-injection system is the natural implementation of the Clean Architecture layering and the Ports & Adapters pattern already designed (`ARCHITECTURE.md`, `source-adapters.md`) — the Import Port becomes an injectable abstraction, adapters become swappable providers, Domain never depends on a concrete one. Vitest, ESLint and Prettier are the testing, linting and formatting tools that will exercise and enforce these rules once implementation begins. Deferring an ORM avoids letting a persistence concern leak into decisions ahead of the (not yet designed) persistence adapter.

Status:
Accepted.

See: [TECH_STACK.md](TECH_STACK.md), [ARCHITECTURE.md](ARCHITECTURE.md)

---

## D-012

Date: 2026-09-04

Decision:
Remove `Data` as a separate top-level architectural layer. Persistence is not a peer of Infrastructure — it is a category of adapter (a persistence adapter, e.g. a repository implementation) living *inside* Infrastructure, implementing a port defined by Domain/Application, exactly like `HRFAdapter` or `CHPPAdapter`. `ARCHITECTURE.md`'s layer diagram is updated accordingly (`Presentation → Application → Domain ← Infrastructure`), and the corresponding `src/data` folder is removed from the backend scaffold.

Reason:
`ARCHITECTURE.md`'s original 5-box diagram predates Sprint 0 and was already flagged then as a naive linear layering rather than genuine Clean Architecture. Once Ports & Adapters was formally adopted for the import architecture (`source-adapters.md`), its own diagram already reflected only three real rings (Domain, Application, Infrastructure); "Data" survived only as a leftover row in a supporting table, not as a consequence of the pattern actually adopted. A database repository is architecturally the same kind of citizen as a source-import adapter — there is no operation that belongs in "Data" that doesn't equally belong in "Infrastructure". Keeping an empty `src/data` folder with no assigned responsibility and no near-term design (persistence remains out of scope, see D-011) was exactly the kind of speculative "just in case" scaffolding the project does not want.

Status:
Accepted.

---

## D-013

Date: 2026-09-04

Decision:
Adopt `Entity<TId>` and `ValueObject<TProps>` as two independent base classes for the domain kernel (`backend/src/domain/entity.ts`, `value-object.ts`) — identity-based equality for the former, structural (hand-rolled deep) equality for the latter, no shared parent class between them, shallow `Object.freeze` for Value Object immutability, no external deep-equal dependency. `AggregateRoot`, `DomainEvent`, a `Result`/domain-error hierarchy, and a branded `Identifier<T>` type are explicitly not introduced yet — each would have no real behavior to justify it today (no aggregate-level invariant, no cross-aggregate reaction, no concrete invariant to validate, no real entity to decide an ID shape for).

Reason:
This is the minimal domain infrastructure needed for future entities to share a common model, per Sprint 2 HU2. Every deferred abstraction was deferred because implementing it now would produce code with no distinguishing behavior yet (e.g. `AggregateRoot` would be an empty subclass of `Entity`) — introducing it before a concrete need exists is exactly the speculative scaffolding this project avoids (see D-012 for the same reasoning applied to `src/data`). User-reviewed and approved 2026-09-04.

Status:
Accepted.

Noted for the future, explicitly not decided now (revisit only when raised again, not proactively):
- Identifiers will likely evolve into their own Value Objects (`PlayerId`, `ClubId`, ...) instead of raw primitives.
- When the domain grows, evaluate moving `Entity`/`ValueObject` into a `domain/base/` (or similar) folder.

See: `backend/src/domain/entity.ts`, `backend/src/domain/value-object.ts`, `TASKS.md`

---

## D-014

Date: 2026-09-04

Decision:
Default policy for domain invariants, until a strong reason emerges to revisit it: reject an invalid construction with a specific domain exception (Option B — e.g. `InvalidXError extends Error`), not a generic `Error` and not a `Result<T, E>` type. No global decision on adopting `Result<T>` across the domain is made now.

Reason:
A concrete case (`Denomination`) surfaced this exact question; rather than decide it in the abstract, the user set a working default — specific domain exceptions — to unblock whichever entity/VO hits its first invariant first, while keeping the door open to revisit if a real case argues for `Result<T>` later.

Status:
Accepted (as a default, not a closed architectural commitment — see reason).

See: `TASKS.md`

---

## D-015

Date: 2026-09-04

Decision:
`ImportHrfUseCase` (Application) depends directly on the concrete `HrfFileReader`, `HrfSectionParser` and `HrfAdapter` (Infrastructure), instead of on an abstract Import Port as `source-adapters.md` and D-008 describe for the target architecture. Accepted **explicitly and only as long as HRF remains the single import source**.

Reason:
With only one real source, an Import Port abstraction would be designed by guesswork rather than by evidence — its true shape (what varies between HRF's file-based reading and CHPP's HTTP/credentialed access, for instance) can't be known yet. This is registered as explicit technical debt, not a silent drift from D-008: the abstraction is deferred, not abandoned.

Status:
Accepted (temporary — see condition below).

Condition to resolve: introduce the Import Port when a second real import source (CHPP, manual entry, or other) is actually implemented — design it then, from the evidence of two real sources, not in anticipation of one.

See: `backend/src/application/import-hrf.use-case.ts`, [source-adapters.md](docs/source-adapters.md), D-008

---

## D-016

Date: 2026-09-04

Decision:
`backend/src/presentation/analyze.ts` (Presentation) constructs and composes `HrfFileReader`, `HrfSectionParser` and `HrfAdapter` (Infrastructure) directly, instead of going through `ImportHrfUseCase` (Application). Accepted **explicitly and only as a temporary state**, in the same spirit as D-015.

Reason:
The enriched CLI report needs the intermediate `Section[]` (to count sections/players) and genuine per-step status, neither of which `ImportHrfUseCase.execute()` currently exposes — it only returns the final `ClubContract`. Rather than call the use case redundantly alongside a second, separate parse just to get that visibility, Presentation was allowed to reach past Application into Infrastructure directly. This is a real regression from the intended layering (Presentation should depend on Application only) and is registered as such, not disguised as the target design.

Status:
Accepted (temporary — see condition below).

Condition to resolve: the next story revisits `ImportHrfUseCase` so it returns a richer result (e.g. an `ImportResult`-shaped structure covering per-step status and the HRF summary data), so `analyze.ts` can go back to depending on Application only, without reconstructing the pipeline itself.

See: `backend/src/presentation/analyze.ts`, D-015

See: [ARCHITECTURE.md](ARCHITECTURE.md), [source-adapters.md](docs/source-adapters.md) §4

## D-013

Date: 2026-09-04

Decision:
No crear carpetas vacías "para el futuro"

Reason: 
Una carpeta aparece únicamente cuando existe el primer componente cuya responsabilidad justifica su existencia.
Eso mantiene el árbol muy limpio.

