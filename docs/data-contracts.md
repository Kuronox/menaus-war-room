# Data Contracts

## Propósito

Este documento define **cómo debe verse la información una vez cruza la frontera hacia el dominio**, sin importar de qué fuente viene. Es el complemento operativo de [canonical-domain-model.md](canonical-domain-model.md): mientras aquel documento explica el *significado* de cada concepto, este define su *forma exigida* — campos, obligatoriedad, tipo, rango válido — como contrato que cualquier adaptador de fuente (ver [source-adapters.md](source-adapters.md)) debe cumplir antes de que un dato sea aceptado por el dominio.

**Esto no es un esquema de base de datos ni una interfaz de código.** Es una especificación conceptual, en prosa y tablas, de la forma que debe tener cada dato. La traducción a un tipo/clase/tabla concreta es una decisión de implementación fuera del alcance de este Sprint.

**Notación:** `tipo?` indica opcional (puede faltar/ser desconocido). `tipo` sin `?` es obligatorio — un adaptador que no pueda proveerlo con certeza **no debe inventar un valor**, debe rechazar ese registro o marcarlo explícitamente incompleto (ver [validation-rules.md](validation-rules.md)).

---

## Contrato transversal: procedencia

**Todo contrato de tipo "snapshot" (ver lista en canonical-domain-model.md §1.10) incluye, sin excepción, estos tres campos de procedencia:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `sourceType` | `DataSourceType` | Sí | HRF, CHPP, Manual, Other |
| `importBatchId` | Identificador | Sí | A qué `ImportBatch` pertenece este dato |
| `observedAt` | Fecha/hora | Sí | Cuándo la fuente dice que este dato fue observado (no cuándo se procesó en el sistema) |

Un snapshot sin estos tres campos **no es un dato de dominio válido** — no se acepta.

---

## Contrato: `Club`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `clubId` | Identificador estable | Sí | No vacío | Debe ser estable entre importaciones del mismo club |
| `name` | Texto | Sí | — | |
| `foundedAt` | Fecha | No | — | |
| `ownerReference` | Texto | No | — | Solo informativo |
| `countryRef`, `leagueRef`, `regionRef` | `ExternalReference` | No | — | Ver contrato de `ExternalReference` |
| `arenaRef` | Identificador | No | — | |
| `coachRef` | Identificador | No | — | Puede faltar si la fuente no reporta entrenador (no debe asumirse "sin entrenador" como hecho de dominio; solo como dato ausente) |

## Contrato: `Player`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `playerId` | Identificador estable | Sí | No vacío | Debe permitir seguimiento entre importaciones sucesivas del mismo jugador |
| `firstName`, `lastName` | Texto | No individualmente, pero al menos uno de los dos debe existir | — | Un adaptador que reciba un nombre vacío/nulo de su fuente **no debe sustituirlo por un literal como "null"** — ver caso documentado en Sprint 0 (bug del exportador HRF) |
| `nickname` | Texto | No | — | |
| `dateOfBirth` / `age` | Fecha o entero | No | edad ≥ 15 (regla razonable, no oficialmente confirmada — usar solo como validación blanda) | |
| `nationalityRef` | `ExternalReference` | No | — | |
| `personality` | `PersonalityProfile` | No | ver contrato VO | |
| `specialty` | `Specialty` (enum) | No | uno de los 8 valores confirmados | |
| `nationalTeamRef` | `ExternalReference` | No | — | |

## Contrato: `PlayerConditionSnapshot`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `playerRef` | Identificador | Sí | Debe resolver a un `Player` conocido o crearlo en la misma operación | |
| `skillSet` | `SkillSet` (8 `SkillRating`) | No, campo por campo | cada `level` en escala `PlayerAbility` (0–20) | Ver la advertencia de confianza en [hrf-mapping-strategy.md](hrf-mapping-strategy.md) — un adaptador puede proveer menos de 8 si su fuente no cubre todas |
| `form` | `Denomination` (escala `FormLeadershipCoachSkill`, 1–8) | No | 1–8 | |
| `experience` | `Denomination` (escala `PlayerAbility`, 0–20) | No | 0–20 | |
| `loyalty` | `Denomination` (escala `PlayerAbility`, 0–20) | No | 0–20 | |
| `injuryStatus` | `InjuryStatus` | No | ver contrato VO | Si falta, significa "no reportado por la fuente", **no** "sano" — un adaptador HRF que interprete `-1` como "sano" debe hacerlo explícitamente y documentar esa interpretación como parte de su propia lógica, no como un hecho de dominio |
| `salary` | `Money` | No | ≥ 0 | |
| `marketValue` | `Money` | No | ≥ 0 | Ver ambigüedad Valor de Mercado vs. TSI documentada en Sprint 0 — el adaptador debe declarar cuál de los dos está proveyendo |
| `warningsAccumulated` | Entero | No | ≥ 0 | |

## Contrato: `Coach`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `coachId` | Identificador | Sí | — | |
| `name` | Texto | Sí | — | |
| `trainingSkill` | `Denomination` (`FormLeadershipCoachSkill`) | No | 1–8 | Regla oficial: nunca puede exceder "excellent" (8) |
| `leadership` | `Denomination` (`FormLeadershipCoachSkill`) | No | 0–7 | |
| `tacticalAttitude` | `CoachTacticalAttitude` | No | Neutral/Offensive/Defensive | |
| `promotedFromPlayerRef` | Identificador | No | — | |
| `contract` | `ContractTerms` | No | — | |

## Contrato: `StaffMember`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `staffMemberId` | Identificador | Sí | — | |
| `name` | Texto | No | — | |
| `role` | `StaffRole` (enum) | Sí | uno de los 6 roles confirmados | Un adaptador que no pueda determinar el rol con certeza **no debe adivinarlo** (ver caso `StaffType` sin leyenda oficial en Sprint 0) — debe rechazar el campo `role` como desconocido en vez de asignar uno arbitrario |
| `skillLevel` | Entero | No | 1–5 | |
| `contract` | `ContractTerms` | No | — | |

## Contrato: `Arena`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `arenaId` | Identificador | Sí | — | |
| `name` | Texto | No | — | |
| `capacity` | Estructura `{standing, seated, covered, vip}` | No | cada valor ≥ 0 | |
| `expansionState` | Estructura `{isExpanding: bool, estimatedCompletionAt?: fecha}` | No | — | |

## Contrato: `ClubEconomicSnapshot`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `clubRef` | Identificador | Sí | — | |
| `cash` | `Money` | No | — | |
| `expectedCash` | `Money` | No | — | |
| `weeklyIncomeBreakdown` | Estructura por categoría (espectadores, patrocinadores, ventas, otros) | No | — | |
| `weeklyCostBreakdown` | Estructura por categoría (arena, jugadores, personal, otros) | No | — | |

## Contrato: `ClubTrainingSnapshot`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `clubRef` | Identificador | Sí | — | |
| `trainingFocus` | `SkillType` (enum) | No | uno de los 8 valores | El HRF ya provee este dato como texto en español; un adaptador HRF puede mapearlo con alta confianza (ver Mapping Strategy) |
| `staminaTrainingShare` | Porcentaje | No | 0–100 | |
| `teamSpirit` | `Denomination` (`TeamSpirit`, 0–10) | No | 0–10 | |
| `confidence` | `Denomination` (`Confidence`, 0–9) | No | 0–9 | |
| `formationExperience` | Lista de `{formation: FormationCode, level: Denomination}` | No | nivel típicamente 0–8, ver discrepancia documentada en Sprint 0 | |

## Contrato: `DivisionStanding`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `divisionRef` | `ExternalReference` | Sí | — | |
| `clubRef` | Identificador | Sí | — | |
| `season` | `SeasonReference` | Sí | — | |
| `played`, `won`, `drawn`, `lost` | Entero | No | ≥ 0, `won+drawn+lost = played` si los tres están presentes | |
| `goalsFor`, `goalsAgainst` | Entero | No | ≥ 0 | |
| `points`, `position` | Entero | No | ≥ 0 / ≥ 1 | |

## Contrato: `LineupPlan` / `MatchLineup`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `clubRef` | Identificador | Sí | — | |
| `matchRef` | `ExternalReference` | No | — | Puede ser desconocido (ver ambigüedad de `matchid` documentada en Sprint 0) |
| `formation` | `FormationCode` | No | Formación válida de Hattrick (p. ej. 4-4-2, 3-5-2...) | |
| `slots` | Lista de `LineupSlotAssignment` | Sí (al menos 1) | ver contrato VO | Regla de negocio: una alineación válida para partido tiene exactamente 11 jugadores titulares — ver [validation-rules.md](validation-rules.md) |
| `captainRef` | Identificador | No | Debe estar entre los `slots` | |
| `setPieceTakerOrder` | Lista ordenada de identificadores | No | — | |
| `substitutionOrders` | Lista de instrucciones de sustitución condicional | No | Solo presente si la fuente la reporta — **nunca inferir una lista vacía como "sin instrucciones"**, distinguir "no reportado" de "reportado y vacío" | Corresponde al grupo condicional `subst0*` documentado en Sprint 0 |

## Contrato: `LineupSlotAssignment` (Value Object)

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `role` | `PositionRole` (enum) | Sí | uno de los 6 valores canónicos | |
| `playerRef` | Identificador | Sí | — | |
| `isStarting` | Booleano | Sí | — | |
| `isCaptain` | Booleano | No (default falso, este sí es un default seguro porque "no capitán" es la mayoría de los casos y no una inferencia sobre datos ausentes) | — | |

## Contrato: `PlayerMatchPerformance`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `playerRef` | Identificador | Sí | — | |
| `matchRef` | `ExternalReference` | Sí | — | |
| `rating` | Decimal | No | — | Ver campo `rating` marcado Desconocido en Sprint 0: si un adaptador no puede confirmar la escala de este valor, debe declararlo con una nota de baja confianza, no presentarlo como una valoración estándar de partido |
| `matchRatingEndOfGame` | Decimal | No | — | |
| `positionPlayed` | `PositionRole` | No | — | |
| `minutesPlayed` | Entero | No | 0–120 aprox. | |

## Contrato: `ImportBatch`

| Campo | Tipo | Obligatorio | Rango/formato | Notas |
|---|---|---|---|---|
| `importBatchId` | Identificador | Sí | — | |
| `sourceType` | `DataSourceType` | Sí | HRF/CHPP/Manual/Other | |
| `sourceDescriptor` | Texto | Sí | — | |
| `importedAt` | Fecha/hora | Sí | — | |
| `observedAt` | Fecha/hora | Sí | — | Puede coincidir con `importedAt` si la fuente no distingue ambos momentos |

---

## Contratos de Value Objects reutilizables

| VO | Forma | Reglas |
|---|---|---|
| `Denomination` | `{ scale: RatingScaleType, value: entero }` | `value` debe caer dentro del rango que `scale` define (ver tabla en canonical-domain-model.md §3). Un valor fuera de rango se rechaza, no se trunca silenciosamente |
| `InjuryStatus` | `{ isInjured: booleano, weeksRemaining: entero?, isBruised: booleano }` | Si `isInjured=false`, `weeksRemaining` debe ser nulo. Si `isBruised=true`, `isInjured` debe ser `true` (el estado "magullado" es una fase de la lesión, según la documentación oficial de Sprint 0) |
| `Money` | `{ amount: decimal, currency: código }` | `amount` puede ser negativo solo para campos de gasto/variación; nunca para saldos absolutos como `cash` |
| `PersonalityProfile` | `{ leadership, agreeability, honesty, aggressiveness: Denomination }` | Cada uno en su escala oficial correspondiente |
| `ExternalReference` | `{ system: texto, externalId: texto }` | `system` identifica de qué espacio de nombres viene el id (p. ej. `"hattrick.country"`), para no colisionar ids entre distintos tipos de referencia externa |

---

## Regla general de "nunca inventar" aplicada a los contratos

Siguiendo `AGENTS.md`, ningún adaptador puede:

- Rellenar un campo obligatorio con un valor por defecto inventado (p. ej. `0`, `false`, `"Desconocido"`) cuando la fuente no lo provee — si el campo es obligatorio y no hay dato, el registro completo se rechaza (ver [validation-rules.md](validation-rules.md)).
- Traducir un código de fuente a un valor canónico sin evidencia suficiente — si el mapeo campo→concepto no está confirmado (ver niveles de confianza en Sprint 0), el adaptador debe omitir ese campo del contrato en vez de rellenarlo con una suposición.
- Colapsar "el dato no fue reportado" y "el dato fue reportado como vacío/cero" en el mismo valor — deben ser distinguibles.
