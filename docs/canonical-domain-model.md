# Canonical Domain Model

## Propósito

Este documento define el **modelo de dominio canónico** de Menaus War Room: la representación interna del dominio de Hattrick que usará todo el sistema, independientemente de dónde vengan los datos.

**Principio rector (no negociable, ver `ARCHITECTURE.md` y `DECISIONS.md`):**

> El dominio representa las reglas y conceptos de Hattrick. No representa el formato HRF, no representa CHPP, no representa ninguna base de datos.

Esto significa que este modelo se diseñó a partir de dos insumos distintos:

1. **La evidencia y los conceptos oficiales de Hattrick** documentados en Sprint 0 ([hrf-data-dictionary.md](hrf-data-dictionary.md), [hrf-domain-model.md](hrf-domain-model.md)) — qué existe realmente en el juego, con nivel de confianza y fuente.
2. **Decisiones de diseño de dominio** (no derivadas de un archivo, sino de cómo debe pensar el sistema sobre el dominio para ser útil y extensible) — explícitamente marcadas como tales.

Donde el modelo de Sprint 0 documentaba "qué trae el HRF", este modelo documenta "qué es el dominio de Hattrick" — son deliberadamente distintos. Un campo del HRF puede no tener equivalente canónico (si es un artefacto del formato de exportación, como los tres lugares donde el HRF repite al entrenador), y un concepto canónico puede no tener todavía ninguna fuente que lo alimente (como el detalle completo de un `Match`, que ningún adaptador actual provee, pero que el dominio ya reserva para cuando exista).

**Convención de nombres:** todos los identificadores técnicos de este documento están en inglés, según la política de idioma del proyecto (`CLAUDE.md`). La explicación está en español.

---

## 1. Entidades

Una entidad tiene **identidad propia**, persiste en el tiempo, y su estado puede cambiar sin que deje de ser "la misma cosa".

### 1.1 `Club`

La organización gestionada por el manager. Raíz del agregado `Club` (ver sección 5).

| Atributo | Descripción |
|---|---|
| `clubId` | Identidad estable del club |
| `name` | Nombre del club |
| `foundedAt` | Fecha de fundación/activación |
| `ownerReference` | Referencia simple a la cuenta del manager (no se modela como entidad propia — es un concepto de cuenta de usuario, no de fútbol) |
| `countryRef`, `leagueRef`, `regionRef` | `ExternalReference` (ver §2) a entidades externas no resueltas por este dominio |
| `arenaRef` | Referencia al `Arena` del club |
| `coachRef` | Referencia al `Coach` actual del club (siempre exactamente uno) |

**Nota de diseño:** `Club` no contiene directamente las finanzas, el entrenamiento ni la posición en la liga — esos son estados que cambian semana a semana y se modelan como *snapshots* (§1.9), no como atributos mutables de la entidad. Esta separación es la lección de diseño más importante heredada de Sprint 0: el HRF es una fotografía de un instante, y el dominio necesita poder acumular fotografías sucesivas sin perder la identidad estable del club.

### 1.2 `Player`

Un jugador, con identidad estable a través del tiempo y de los clubes por los que pase.

| Atributo | Descripción |
|---|---|
| `playerId` | Identidad estable del jugador |
| `firstName`, `lastName`, `nickname` | Nombre |
| `dateOfBirth` o `age` (a definir en implementación) | Edad — el dominio no obliga una representación concreta, solo que la edad sea derivable |
| `nationalityRef` | `ExternalReference` a `Country` |
| `personality` | `PersonalityProfile` (§2 — Value Object) |
| `specialty` | `Specialty` (§3 — Enumeración) |
| `nationalTeamRef` | `ExternalReference` opcional a selección nacional |

**Nota de diseño:** las habilidades, la forma, la lesión, el salario y el valor de mercado de un jugador **no son atributos fijos de `Player`** — son observaciones que cambian con cada importación y se modelan como `PlayerConditionSnapshot` (§1.10). La personalidad y la especialidad sí se modelan como atributos de la entidad porque, según la documentación oficial de Hattrick, son esencialmente estables (la personalidad no se entrena; la especialidad de un jugador no cambia en el curso normal del juego).

### 1.3 `Coach`

El entrenador principal de un club. **Se modela como entidad independiente de `Player`**, no como un caso especial de jugador — esta es una decisión de diseño explícita (ver `DECISIONS.md`) que corrige una peculiaridad del formato HRF detectada en Sprint 0 (donde el entrenador aparecía como un bloque de jugador con casi todos los campos vacíos). El Manual de Hattrick confirma que un entrenador tiene su propio conjunto de habilidades (capacidad de entrenamiento, liderazgo) y su propio ciclo de vida (contratación externa, ascenso interno desde un jugador, despido, deterioro de habilidades con el tiempo).

| Atributo | Descripción |
|---|---|
| `coachId` | Identidad estable del entrenador |
| `name` | Nombre |
| `trainingSkill` | `Denomination` sobre la escala oficial "Form/Leadership/Coach Skills" (1–8) |
| `leadership` | `Denomination` sobre la misma escala |
| `tacticalAttitude` | `CoachTacticalAttitude` (§3) |
| `promotedFromPlayerRef` | Referencia opcional al `Player` del que proviene, si fue un ascenso interno («Coach-to-be») |
| `contract` | Términos de contrato (nivel, coste, duración) |

### 1.4 `StaffMember`

Un especialista del cuerpo técnico (no el entrenador principal — ver `Coach`). Corresponde a los 6 roles oficialmente confirmados en Sprint 0: Assistant Coach, Medic, Form Coach, Sports Psychologist, Financial Director, Tactical Assistant.

| Atributo | Descripción |
|---|---|
| `staffMemberId` | Identidad estable |
| `name` | Nombre |
| `role` | `StaffRole` (§3) |
| `skillLevel` | Nivel 1–5 (regla oficial: máximo nivel 5) |
| `contract` | Términos de contrato |

**Regla de negocio confirmada (Sprint 0, oficial):** un club puede tener como máximo 4 `StaffMember` contratados simultáneamente, de los cuales como máximo 2 pueden ser de rol `AssistantCoach`, y como máximo 1 de cada uno de los demás roles. Esta regla vive en el dominio, no en un adaptador (ver §6 Reglas de Validación).

### 1.5 `Arena`

El estadio del club.

| Atributo | Descripción |
|---|---|
| `arenaId` | Identidad |
| `name` | Nombre del estadio |
| `capacity` | Desglose de capacidad por tipo de asiento (de pie, sentado, cubierto, VIP) |
| `expansionState` | Si hay una ampliación en curso y su fecha estimada |

### 1.6 `Match`

Referencia mínima a un partido. **Se reserva deliberadamente el lugar en el modelo aunque ninguna fuente actual (HRF) provea el detalle completo** — un futuro adaptador CHPP sí lo hará, y el dominio no debería rediseñarse cuando eso ocurra.

| Atributo | Descripción |
|---|---|
| `matchId` | `ExternalReference` — identidad externa del partido |
| `kickoffAt` | Fecha/hora — opcional, puede no conocerse |
| `matchType` | `MatchType` (§3) — opcional |
| `homeClubRef`, `awayClubRef` | Referencias a `Club` — opcional, el rival puede no ser un `Club` conocido por el sistema |

### 1.7 `Division` / tabla de liga

Representa la clasificación de **un** club en una división en un momento dado. Se modela de forma genérica (no "solo mi club") para que datos manuales o futuros puedan poblar la clasificación de otros equipos — sirve directamente al objetivo de "Análisis de Liga" de `Product.md`.

| Atributo | Descripción |
|---|---|
| `divisionRef` | `ExternalReference` a la división/serie |
| `clubRef` | Referencia al club de esta fila de clasificación |
| `season`, `matchRound` | `SeasonReference` (§2) |
| `played`, `goalsFor`, `goalsAgainst`, `points`, `position` | Estadísticas de clasificación |

### 1.8 `SquadMembership`

Modela la pertenencia de un `Player` a un `Club` **con vigencia temporal** — necesario porque los jugadores se transfieren, y la identidad del jugador debe sobrevivir al cambio de club.

| Atributo | Descripción |
|---|---|
| `playerRef`, `clubRef` | Referencias |
| `joinedAt` | Fecha de llegada |
| `leftAt` | Fecha de salida — nulo mientras el jugador siga en el club |
| `isHomegrown` | Si el jugador se formó en este club |

### 1.9 `ImportBatch`

Representa **un evento de importación de datos**, sin importar la fuente. Es la pieza central que permite que el dominio sea agnóstico de origen: todo dato que entra al sistema queda vinculado a un `ImportBatch` con procedencia explícita.

| Atributo | Descripción |
|---|---|
| `importBatchId` | Identidad |
| `sourceType` | `DataSourceType` (§3): HRF, CHPP, Manual, Other |
| `sourceDescriptor` | Descripción de la fuente concreta (p. ej. nombre de archivo, o "entrada manual de <manager>") — dato de auditoría, no de dominio de fútbol |
| `importedAt` | Cuándo se procesó la importación en el sistema |
| `observedAt` | Cuándo, según la propia fuente, se observaron los datos (p. ej. `[basics].date` del HRF) — puede diferir de `importedAt` |

### 1.10 Snapshots (estado en el tiempo)

Estas entidades representan **un hecho observado en un instante**, siempre vinculado a un `ImportBatch`. Ninguna se puede crear sin procedencia.

| Snapshot | Sujeto | Contenido principal |
|---|---|---|
| `PlayerConditionSnapshot` | `Player` | `SkillSet` (§2), forma, experiencia, lealtad, estado de lesión (`InjuryStatus`), salario, valor de mercado |
| `ClubEconomicSnapshot` | `Club` | Efectivo, efectivo proyectado, ingresos y gastos desglosados de la semana |
| `ClubTrainingSnapshot` | `Club` | Foco de entrenamiento, % de resistencia, moral de equipo, confianza de equipo, experiencia táctica por formación |
| `DivisionStanding` | ver §1.7 | (ya es en sí misma un hecho puntual en el tiempo) |
| `LineupPlan` | `Club` + `Match` (opcional) | Alineación configurada para el próximo partido — ver §1.11 |
| `MatchLineup` | `Club` + `Match` | Alineación que realmente se usó en un partido ya jugado — ver §1.11 |
| `PlayerMatchPerformance` | `Player` + `Match` | Valoración, minutos jugados, posición jugada en un partido concreto |

### 1.11 `LineupPlan` / `MatchLineup`

Ambas comparten estructura: una formación + una lista de asignaciones posición↔jugador (`LineupSlotAssignment`, §2) + capitán + lanzador de balón parado + orden de penaltis + suplentes. La diferencia es de **intención**: `LineupPlan` es la alineación configurada de cara a un partido futuro; `MatchLineup` es el registro de lo que realmente se jugó (incluyendo, si existieron, órdenes de sustitución condicionales).

**Nota de diseño (corrige una peculiaridad del HRF):** en Sprint 0 se documentó que el HRF representa estas dos alineaciones con dos vocabularios de posición distintos (`[lineup]` con slots fijos, `[lastlineup]` con slots dependientes de la formación jugada). El modelo canónico **no hereda esa inconsistencia**: ambas usan el mismo `PositionRole` (§3), independiente de cómo cualquier fuente lo represente internamente. Traducir esos dos vocabularios a uno solo es responsabilidad del adaptador (ver [hrf-mapping-strategy.md](hrf-mapping-strategy.md)), no del dominio.

---

## 2. Value Objects

Un Value Object no tiene identidad propia — se define enteramente por sus atributos, y es inmutable.

| Value Object | Composición | Notas |
|---|---|---|
| `Denomination` | `{ scale: RatingScaleType, value: integer }` | Envoltorio genérico para cualquier atributo ordinal de Hattrick. Existen varias escalas oficiales distintas confirmadas en Sprint 0 (0–20 para habilidades/lealtad/experiencia; 1–8 para forma/liderazgo/entrenador; 0–8 para experiencia de formación; 0–4(5) para los rasgos de personalidad; 0–10 para moral de equipo; 0–9 para confianza de equipo) — `RatingScaleType` (§3) le dice a `Denomination` qué rango y qué etiquetas textuales aplican |
| `SkillRating` | `{ skillType: SkillType, level: Denomination }` | Una habilidad concreta de un jugador |
| `SkillSet` | Colección de exactamente 8 `SkillRating`, una por cada `SkillType` | Las 8 habilidades entrenables oficialmente confirmadas en Sprint 0 |
| `PersonalityProfile` | `{ leadership: Denomination, agreeability: Denomination, honesty: Denomination, aggressiveness: Denomination }` | Los 4 atributos de personalidad oficialmente documentados |
| `InjuryStatus` | `{ isInjured: boolean, weeksRemaining: integer?, isBruised: boolean }` | Modelado explícitamente a partir del mecanismo oficial de lesiones (cuenta regresiva en semanas + estado "magullado"), **no** de la convención interna de ningún archivo (p. ej. no hereda el uso de `-1` como centinela) |
| `Money` | `{ amount: decimal, currency: CurrencyCode }` | Usado para salario, efectivo, costes, valor de mercado |
| `SeasonReference` | `{ season: integer, matchRound: integer }` | El calendario interno de Hattrick, distinto de una fecha real |
| `ExternalReference` | `{ system: string, externalId: string }` | Referencia genérica a algo que el dominio no resuelve por sí mismo (país, división, partido rival, selección nacional) |
| `LineupSlotAssignment` | `{ role: PositionRole, playerRef: ExternalReference-o-PlayerRef, isStarting: boolean, isCaptain: boolean, setPieceOrder: integer? }` | Una asignación dentro de una alineación |
| `ContractTerms` | `{ level: integer, weeklyCost: Money, contractLength: integer? }` | Usado por `Coach` y `StaffMember` |

---

## 3. Enumeraciones

| Enumeración | Valores | Fuente / confianza |
|---|---|---|
| `SkillType` | `Stamina`, `Playmaking`, `Scoring`, `Defending`, `Winger`, `Passing`, `SetPieces`, `Goalkeeping` | ✅ Confirmado oficialmente (Sprint 0, Wiki *Skill*) |
| `Specialty` | `None`, `Technical`, `Quick`, `Powerful`, `Head`, `Unpredictable`, `Support`, `Resilient` | ✅ Confirmado oficialmente (Sprint 0, Wiki *Specialty*) |
| `StaffRole` | `AssistantCoach`, `Medic`, `FormCoach`, `SportsPsychologist`, `FinancialDirector`, `TacticalAssistant` | ✅ Confirmado oficialmente (Sprint 0, Wiki *Staff*) — nótese que `HeadCoach`/`Coach` **no** es un valor de este enum, es la entidad `Coach` |
| `CoachTacticalAttitude` | `Neutral`, `Offensive`, `Defensive` | ✅ Confirmado oficialmente (Sprint 0, Wiki *Coach*) — el orden/código numérico que use cualquier fuente concreta es un detalle de adaptador, no del dominio |
| `PositionRole` | `Goalkeeper`, `CentralDefender`, `WingBack`, `InnerMidfielder`, `Winger`, `Forward` | Diseño de dominio — vocabulario canónico de posiciones, independiente de cómo cada fuente nombre sus columnas |
| `RatingScaleType` | `PlayerAbility(0–20)`, `FormLeadershipCoachSkill(1–8)`, `FormationExperience(0–8)`, `Agreeability(0–4)`, `Honesty(0–4)`, `Aggressiveness(0–4)`, `TeamSpirit(0–10)`, `Confidence(0–9)` | ✅ Confirmado oficialmente (Sprint 0, Wiki *Denominations*) |
| `MatchType` | `League`, `Cup`, `Friendly`, `Qualifier`, `Other` | Enumeración **abierta/provisional** — conocimiento general de Hattrick, no una tabla oficial cerrada verificada en Sprint 0 (el HRF usa códigos numéricos sin leyenda oficial confirmada); se deja extensible a propósito |
| `DataSourceType` | `HRF`, `CHPP`, `Manual`, `Other` | Diseño de dominio, para `ImportBatch` |

---

## 4. Relaciones

```
Club 1───1 Arena
Club 1───1 Coach
Club 1───N StaffMember               (máx. 4 total, máx. 2 AssistantCoach — regla de negocio)
Club 1───N SquadMembership N───1 Player
Club 1───N ClubEconomicSnapshot       (histórico, uno por ImportBatch)
Club 1───N ClubTrainingSnapshot       (histórico)
Club 1───N DivisionStanding           (histórico)
Club 1───N LineupPlan
Club 1───N MatchLineup

Player 1───N PlayerConditionSnapshot  (histórico)
Player 1───N PlayerMatchPerformance   (histórico)
Player 0/1─0/1 Coach                  (un jugador puede haber sido promovido a entrenador — "Coach-to-be")

MatchLineup / LineupPlan 1───N LineupSlotAssignment ───1 Player (por referencia)
MatchLineup N───1 Match

ImportBatch 1───N (cualquier Snapshot)  — toda instancia de un tipo "Snapshot" DEBE tener exactamente un ImportBatch de procedencia
```

**Principio de límite de agregado:** las referencias entre agregados (§5) se hacen **por identidad** (`clubRef`, `playerRef`, etc.), nunca embebiendo el objeto completo de otro agregado. Esto es una decisión de diseño de dominio, no una decisión de base de datos — mantiene cada agregado como una unidad de consistencia independiente.

---

## 5. Agregados

Un agregado es un límite de consistencia: un grupo de entidades y value objects que se modifican juntos y se referencian desde fuera solo por la identidad de su raíz.

| Agregado | Raíz | Contiene | No contiene (se referencia por ID) |
|---|---|---|---|
| **Club** | `Club` | `Arena`, `StaffMember[]`, `SquadMembership[]`, histórico de `ClubEconomicSnapshot`, `ClubTrainingSnapshot`, `DivisionStanding` | `Player` completo, `Coach` completo |
| **Player** | `Player` | `PersonalityProfile`, `Specialty`, histórico de `PlayerConditionSnapshot`, histórico de `PlayerMatchPerformance` | `Club` completo |
| **Coach** | `Coach` | `trainingSkill`, `leadership`, `tacticalAttitude`, `contract` | `Player` completo (solo referencia opcional si viene de un ascenso interno) |
| **Lineup** | `LineupPlan` o `MatchLineup` | `LineupSlotAssignment[]` | `Player` completo, `Club` completo, `Match` completo — todos por referencia |
| **ImportBatch** | `ImportBatch` | Metadatos de procedencia | Los snapshots que produjo se relacionan por referencia inversa, no se embeben |

**Por qué `Coach` es su propio agregado y no parte de `Club`:** un entrenador tiene reglas de ciclo de vida propias (contratación externa con tabla de precios oficial, ascenso interno desde un jugador, deterioro de habilidades independiente del club, y la regla oficial de que "al despedir al entrenador, éste se convierte en un jugador común que ya no puede volver a entrenar a ese club") que ameritan su propio límite de consistencia, en vez de forzarlo a vivir dentro de las invariantes de `Club`.

**Por qué `Player` no vive dentro de `Club`:** un jugador puede transferirse; su identidad y su historial de habilidades deben sobrevivir al cambio de club. Modelarlo como agregado independiente, vinculado a `Club` únicamente a través de `SquadMembership`, es lo que permite representar correctamente una transferencia sin "recrear" al jugador.

---

## 6. Qué NO modela este documento (alcance explícito)

Siguiendo las reglas del Sprint 1:

- No se diseña persistencia (tablas, índices, motor de base de datos).
- No se diseña ninguna API (REST, GraphQL, CHPP saliente).
- No se escribe ningún tipo de código (clases, interfaces, esquemas ejecutables) — todo lo anterior es documentación conceptual.
- No se resuelven las preguntas abiertas heredadas de Sprint 0 (p. ej. el mapeo exacto de habilidades, los códigos de `StaffType`) — este modelo define la **forma** que esos datos deben tener una vez resueltos, no resuelve las incógnitas por sí mismo.

Ver también: [data-contracts.md](data-contracts.md), [hrf-mapping-strategy.md](hrf-mapping-strategy.md), [source-adapters.md](source-adapters.md), [validation-rules.md](validation-rules.md).
