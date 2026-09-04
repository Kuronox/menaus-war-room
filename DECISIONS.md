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