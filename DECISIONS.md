# Decisions Log

Status vocabulary:
- **Accepted** — in force.
- **Accepted (temporary)** — in force, with an explicit condition under which it must be revisited (stated in the entry).
- **Propuesta / Proposal** — not yet in force, pending confirmation.
- **Superseded by D-0XX** — no longer in force. The entry is kept, never deleted or rewritten — history stays intact, only the Status line points to its replacement.

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

## D-009

Date: 2026-09-03

Decision:
The `HRFAdapter` will map the 10 skill/attribute fields (`for`, `uth`, `spe`, `mal`, `fra`, `ytt`, `fas`, `bac`, `mlv`, `rut`) into the Domain despite their field-to-concept mapping remaining unconfirmed by any official Hattrick source (Sprint 0, classified 🔵). Each resulting value will be marked with a low-confidence/unverified indicator rather than being withheld.

Reason:
Withholding these fields entirely would leave Training, Tactical, and Scouting features (Sprint 2/3) with no skill data at all, defeating the product's purpose. Marking them as unverified, rather than presenting them as confirmed facts, respects the "never invent" principle while keeping the product usable.

Status:
**Superseded by D-019.** On review, mapping these fields to named domain concepts — even flagged unverified — still asserts a specific meaning before it is earned by evidence, which sits too close to the "never invent" line it was meant to respect. Kept here for history; D-019 replaces the approach.

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
**Resolved.** `ImportHrfUseCase.execute()` now returns `ImportResult` (see [import-result-design.md](docs/import-result-design.md)), covering per-step status, the HRF summary, and the constructed `Club` — `analyze.ts` depends only on `ImportHrfUseCase`/`ImportResult` again, with no reference to `HrfFileReader`, `HrfSectionParser`, `HrfAdapter` or `Club.create()`. As a side effect, this also fixed a pre-existing Language Policy violation: the report no longer leaks raw English exception text (e.g. `ENOENT: ...`) to the manager — errors are now classified into `ImportErrorCode` and translated to Spanish by Presentation.

Note: Presentation still directly constructs `HrfFileReader`/`HrfSectionParser`/`HrfAdapter` in one place — `ImportHrfUseCase.create()` — a static factory used only because no NestJS DI container is wired up yet (D-015). This is composition-root wiring, not behavioral coupling: Presentation never calls a method on any of the three, only on `ImportHrfUseCase`.

See: `backend/src/presentation/analyze.ts`, `backend/src/application/import-hrf.use-case.ts`, `backend/src/application/import-result.ts`, [import-result-design.md](docs/import-result-design.md), D-015

---

## D-017

Date: 2026-09-04

Decision:
No crear carpetas vacías "para el futuro".

Reason:
Una carpeta aparece únicamente cuando existe el primer componente cuya responsabilidad justifica su existencia. Eso mantiene el árbol muy limpio.

Status:
Accepted.

See: D-012 (misma regla aplicada a `src/data`), `TASKS.md`

---

## D-018

Date: 2026-09-04

Decision:
The executable product is prioritized over horizontal domain expansion. Whenever possible, complete one vertical slice before introducing additional abstractions or entities.

Reason:
This has already been the operating pattern across several stories, not a new idea being introduced now: deferring `AggregateRoot`/`DomainEvent`/`Result<T>`/`Identifier<T>` until a concrete need exists (D-013), resolving `src/data` instead of leaving it "just in case" (D-012), sequencing HU3–HU8 as a walking skeleton (Reader → Parser → Adapter → Use Case → Entity → CLI) before widening the domain, and registering shortcuts as explicit technical debt (D-015, D-016) rather than blocking the slice on a perfect abstraction. Writing it down formalizes a rule the project has already been following for several sprints.

Status:
Accepted.

See: `CLAUDE.md` ("Development Priority"), D-012, D-013, D-015, D-016

---

## D-019

Date: 2026-09-04

Decision:
Supersedes D-009. The 10 skill/attribute fields (`for`, `uth`, `spe`, `mal`, `fra`, `ytt`, `fas`, `bac`, `mlv`, `rut`) are **not** mapped to their hypothesized Hattrick concepts (Form, Stamina, Playmaking, etc.) until there is sufficient evidence to assign that meaning with confidence. Instead, each is stored in the canonical model under its own original HRF field name in a clearly-marked raw namespace (e.g. `rawSkillFor`, `rawSkillUth`, ...) — never under an assumed domain concept name (never `Passing` until it is actually confirmed to be Passing). Once manual verification (per `hrf-mapping-strategy.md` §4 — comparing a known player's value against their in-game skill screen) confirms a mapping, that one field is promoted from its raw name to its confirmed domain concept, field by field, not all at once.

Reason:
D-009 accepted mapping these fields into named domain concepts (`SkillRating`/`SkillSet`) while flagging them "unverified" — but assigning a concept name is itself a claim about meaning, made before that meaning was earned by evidence. That sits too close to the "never invent" principle (`AGENTS.md`, D-002, `validation-rules.md` §7) for comfort: a value literally labeled `Passing` reads as a fact, however many caveats surround it in documentation, and nothing stops it from being consumed as one by a future Training/Tactical engine. Storing the field under its raw, original name defers that claim entirely, at negligible implementation cost, and makes it structurally impossible to build downstream logic on an unconfirmed mapping without deliberately renaming the field first.

Status:
Accepted (supersedes D-009).

Condition to resolve, per field (not all-or-nothing): once a given raw field is manually verified against the game, promote it from its raw name to the confirmed `SkillType`/domain concept.

Impact not yet applied: `hrf-mapping-strategy.md` §4 still describes D-009's approach (map with a confidence marker) and needs a corresponding rewrite — not done as part of this entry, pending confirmation, so as not to cascade an editorial rewrite without review.

See: D-009 (superseded), [hrf-mapping-strategy.md](docs/hrf-mapping-strategy.md) §4, [canonical-domain-model.md](docs/canonical-domain-model.md) §2–3

---

## D-020

Date: 2026-09-04

Decision:
Prefer fewer product capabilities delivered with high confidence over more capabilities built on inference the project cannot yet justify. Concretely: "¿Mi entrenamiento fue aprovechado esta semana?" is withdrawn from the implementation backlog (not deleted — see `docs/training-utilization-design.md`, kept as a closed investigation) after officially confirming that `LastMatch_PositionCode` — required to know whether a played position actually counts toward the current training type — has no documented meaning in any official Hattrick source.

Reason:
The investigation (see `hrf-data-dictionary.md`'s "Investigación cerrada" note) confirmed there is no official basis for the position-eligibility rule this feature would need, and the HRF only exposes a player's most recent match, not the week's total minutes — so any implementation today would rest on an unconfirmed assumption dressed up as a recommendation. This is the same "never invent" principle behind D-019, now applied explicitly at the feature-prioritization level, not only at the field-mapping level: a capability is only built once the data underneath it can support the confidence the project requires, not before.

Status:
Accepted.

See: [training-utilization-design.md](docs/training-utilization-design.md), [hrf-data-dictionary.md](docs/hrf-data-dictionary.md), D-019

---

## D-021

Date: 2026-09-04

Decision:
Design constraint for future work — nothing implemented under this entry. The manager will keep a weekly history of HRF files (e.g. `3301513-2026-08-28.hrf`, `3301513-2026-09-03.hrf`), so the system must eventually support comparing two (or more) imports, not just analyzing one. Until that comparison use case is actually built, every design decision must keep the following true:

1. Single-file analysis (today's `pnpm analyze <file>`) is a permanent, independently valid use case — it must never be broken or subsumed by whatever comparison feature comes later.
2. Week-over-week comparison is a **separate** use case, built on top of two or more single-file analyses — not a rewrite of the existing one.
3. Comparison must **reuse** `HrfFileReader`, `HrfSectionParser` and `HrfAdapter` exactly as they are — no second parser, no second adapter. Both "the current HRF" and "the previous HRF" go through the same pipeline.
4. Before persistence exists, comparison can take two file paths directly from the manager (no database needed to start).
5. Once persistence exists, only *where* "the previous HRF" comes from changes (a file path vs. a stored snapshot/`ImportBatch` — see D-006) — the comparison logic itself must not need to change between the two.

Reason:
Recorded now, before any comparison feature is designed, specifically so that upcoming single-file work (Financial Health and anything after it) doesn't quietly paint the system into a corner — e.g. by hard-coding assumptions that only one file will ever exist, or by duplicating parsing logic instead of reusing `ImportHrfUseCase`'s pipeline. This is a constraint on *how future work must remain compatible*, not a design of the comparison feature itself, which stays unimplemented and undesigned until its own story.

Status:
Accepted.

See: `docs/import-result-design.md`, D-006 (snapshots vs. stable identity), D-012 (persistence not yet designed)
