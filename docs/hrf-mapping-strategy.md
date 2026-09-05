# Mapping Strategy — Adaptador HRF

## Propósito

Explica cómo un futuro **adaptador HRF** traduciría los datos crudos de un archivo `.hrf` (documentados exhaustivamente en [hrf-data-dictionary.md](hrf-data-dictionary.md)) hacia los [Data Contracts](data-contracts.md) del [Canonical Domain Model](canonical-domain-model.md). Es una estrategia, no una implementación: no hay código, solo el conjunto de reglas y decisiones de traducción que cualquier implementación futura deberá seguir.

**Principio de capa anticorrupción (Anti-Corruption Layer):** el adaptador HRF es el **único** lugar del sistema que conoce nombres de campo como `ska`, `spe`, `mlv` o `hjTranare`. Nada de eso cruza hacia el dominio. El dominio solo ve `InjuryStatus`, `SkillRating`, `StaffMember`. Si en el futuro cambia el formato HRF (o se reemplaza por otro), solo este adaptador cambia — el dominio, la capa de aplicación y los demás adaptadores no se enteran.

---

## 1. Un import HRF = un `ImportBatch`

Cada archivo `.hrf` procesado genera exactamente un `ImportBatch` con:

- `sourceType = HRF`
- `sourceDescriptor` = nombre del archivo (p. ej. `3301513-2026-09-03.hrf`)
- `observedAt` = valor de `[basics].date` del propio archivo (no la fecha de importación en el sistema)

A partir de ese único `ImportBatch`, el adaptador produce **múltiples** snapshots canónicos (uno `PlayerConditionSnapshot` por jugador, un `ClubEconomicSnapshot`, un `ClubTrainingSnapshot`, un `DivisionStanding`, un `LineupPlan`, un `MatchLineup`) — todos con el mismo `importBatchId` y el mismo `observedAt`.

---

## 2. Regla central: mapear solo lo que Sprint 0 confirmó, marcar el resto como no mapeado

Sprint 0 clasificó cada campo del HRF en tres niveles: ✅ Confirmado, 🔵 Concepto oficial documentado / campo sin confirmar, ❓ Desconocido. Esta estrategia traduce esa clasificación en una regla operativa:

| Nivel Sprint 0 | Comportamiento del adaptador |
|---|---|
| ✅ Confirmado | Se mapea directamente al contrato canónico correspondiente |
| 🔵 Concepto oficial / campo sin confirmar | **Se mapea, pero el valor resultante debe marcarse con una anotación de confianza baja** (ver §5) — el dato entra al dominio, pero cualquier motor de decisión que lo consuma debe poder saber que su procedencia semántica no está verificada. Ver la decisión pendiente al respecto en `DECISIONS.md` |
| ❓ Desconocido | **No se mapea.** El campo simplemente no aparece en el contrato de salida — no se inventa ningún valor |

Esta regla es la aplicación directa, a nivel de adaptador, del principio "nunca inventar" de `AGENTS.md`.

---

## 3. Tabla de mapeo por sección

### `[basics]` → `Club` (parcial) + `ImportBatch`

| Campo HRF | Contrato canónico | Confianza heredada |
|---|---|---|
| `teamID` | `Club.clubId` | ✅ |
| `teamName` | `Club.name` | ✅ |
| `activationDate` | `Club.foundedAt` | ✅ |
| `owner` | `Club.ownerReference` | ✅ |
| `countryID`, `leagueID`, `regionID` | `Club.countryRef` / `leagueRef` / `regionRef` (como `ExternalReference`, sin resolver nombre) | ✅ como referencia, ❓ el nombre resuelto |
| `date` | `ImportBatch.observedAt` | ✅ |

### `[league]` → `DivisionStanding`

| Campo HRF | Contrato canónico | Confianza heredada |
|---|---|---|
| `serie` | `DivisionStanding.divisionRef` | ✅ |
| `spelade` | `played` | 🔵 |
| `gjorda` | `goalsFor` | 🔵 |
| `inslappta` | `goalsAgainst` | 🔵 |
| `poang` | `points` | 🔵 |
| `placering` | `position` | 🔵 |

**Nota:** aunque estos cinco campos quedaron en Sprint 0 como "concepto oficial no confirmado para el campo" (por ser vocabulario futbolístico sueco genérico sin página oficial de Hattrick dedicada), su interpretación es de bajísimo riesgo práctico — son estadísticas de liga estándar universales, no mecánicas específicas de Hattrick que pudieran tener una definición sorprendente. Se recomienda mapearlos con confianza operativa alta pese a la clasificación 🔵, y se deja constancia explícita de esta excepción razonada.

### `[club]` → `StaffMember[]`

| Campo HRF | Contrato canónico | Confianza heredada |
|---|---|---|
| `psykolog` | `StaffMember{role: SportsPsychologist, skillLevel}` | ✅ |
| `lakare` | `StaffMember{role: Medic, skillLevel}` | ✅ |
| `financialDirectorLevels` | `StaffMember{role: FinancialDirector, skillLevel}` | ✅ |
| `formCoachLevels` | `StaffMember{role: FormCoach, skillLevel}` | ✅ |
| `tacticalAssistantLevels` | `StaffMember{role: TacticalAssistant, skillLevel}` | ✅ |
| `hjTranare` | `StaffMember{role: AssistantCoach, skillLevel}` | 🔵 — discrepancia numérica sin resolver con `TrainerSkillLevel`, ver Sprint 0 |
| `presstalesman` | **No se mapea** — rol eliminado del juego desde 2015, no corresponde a ningún `StaffRole` canónico vigente | ✅ (la ausencia está confirmada, no es un dato faltante) |

**Regla de reconciliación:** el adaptador solo debe crear una instancia de `StaffMember` cuando el nivel reportado sea mayor que 0 — un nivel 0 significa "no contratado", no "un especialista de nivel 0".

### `[team]` → `ClubTrainingSnapshot`

| Campo HRF | Contrato canónico | Confianza heredada |
|---|---|---|
| `staminaTrainingPart` | `staminaTrainingShare` | ✅ |
| `trTypeValue`/`trType` | `trainingFocus` (`SkillType`) | ✅ — el texto ya viene en español y corresponde directamente a un valor de `SkillType` (p. ej. "Jugadas" → `Playmaking`) |
| `stamningValue` | `teamSpirit` | ✅ |
| `sjalvfortroendeValue` | `confidence` | ✅ |
| `exper*` (10 campos) | `formationExperience[]` | 🔵 — mapear el `FormationCode` es directo (el sufijo numérico codifica la formación, p. ej. `433`→4-3-3), pero el nivel debe marcarse con la discrepancia de escala documentada en Sprint 0 |

**Nota de implementación (lo que realmente se construyó, distinto de la tabla de arriba):** cuando se implementó el `TeamStatusContract` real (historia "Estado del Equipo"), se decidió **no** construir todavía `ClubTrainingSnapshot`/`SkillType`/`Denomination` — esas abstracciones siguen aparcadas (`Denomination` sigue sin implementarse, ver `TASKS.md`). En su lugar, `HrfAdapter.toTeamStatusContract()` usa `stamning`/`sjalvfortroende` (las **etiquetas de texto**, no `stamningValue`/`sjalvfortroendeValue`) y deja `trainingType` como `string` crudo (nunca un `SkillType`). Es una decisión correcta y ya explicada en el propio código (`hrf-adapter.ts`: "no scale, no i18n layer built yet"), pero diverge de esta tabla — la tabla sigue siendo el diseño objetivo de Sprint 1, no lo que corre hoy.

### `[lineup]` y `[lastlineup]` → `LineupPlan` y `MatchLineup`

Este es el mapeo más delicado, porque ambas secciones del HRF usan vocabularios de posición distintos entre sí (ver Sprint 0). El adaptador debe implementar **dos tablas de traducción separadas** (una por sección) que ambas conviertan a los mismos 6 valores de `PositionRole` canónico:

| Vocabulario `[lineup]` (slots fijos) | Vocabulario `[lastlineup]` (slots por formación) | `PositionRole` canónico |
|---|---|---|
| `keeper` | `keeper` | `Goalkeeper` |
| `rightCentralDefender`, `leftCentralDefender`, `middleCentralDefender` | `insideBack1/2/3` | `CentralDefender` |
| `rightBack`, `leftBack` | `rightBack`, `leftBack` | `WingBack` |
| `rightInnerMidfield`, `leftInnerMidfield`, `middleInnerMidfield` | `insideMid1/2/3` | `InnerMidfielder` |
| `rightwinger`, `leftwinger` | `rightWinger`, `leftWinger` | `Winger` |
| `rightForward`, `leftForward`, `centralForward` | `forward1/2/3` | `Forward` |

Esta tabla es una **propuesta de diseño razonable basada en nomenclatura**, no una confirmación oficial adicional — hereda el nivel 🔵 general de la sección `[lineup]`/`[lastlineup]` de Sprint 0.

**Regla sobre campos condicionales:** el grupo `subst0*` (presente solo si existió una orden de sustitución) debe mapearse a `MatchLineup.substitutionOrders` **solo si está presente en el archivo**. Su ausencia se traduce como lista vacía explícita, nunca como campo omitido — porque a diferencia de otros casos, aquí sí sabemos con certeza que "ausente en el HRF" significa "no había orden configurada" (evidencia directa de Sprint 0, no una suposición).

**Regla sobre `matchid`/`matchtyp`:** dado que Sprint 0 no pudo confirmar si `[lineup].matchid` siempre representa el próximo partido, el adaptador debe mapearlo a `LineupPlan.matchRef` marcándolo explícitamente de baja confianza, y **nunca** debe usarse como criterio para decidir si una alineación es "la próxima" o "la última jugada" — esa distinción ya viene dada por si el origen es la sección `[lineup]` o `[lastlineup]`, no por el valor de `matchid`.

### `[economy]` → `ClubEconomicSnapshot`

Mapeo directo, alta confianza (✅ en Sprint 0 por evidencia numérica cruzada entre snapshots). El adaptador debe tratar las claves de esta sección **sin distinguir mayúsculas/minúsculas** (Sprint 0 documentó inconsistencia de `PascalCase`/`camelCase` dentro de la misma sección).

### `[arena]` → `Arena`

Mapeo directo, alta confianza.

### `[player<ID>]` → `Player` + `PlayerConditionSnapshot`

| Campo(s) HRF | Contrato canónico | Confianza heredada |
|---|---|---|
| `name`, `firstname`, `lastname`, `nickname` | `Player.firstName/lastName/nickname` | ✅ — **con la salvedad del caso "null" documentado en Sprint 0**: si `firstname` está vacío y `name` contiene literalmente el texto `"null "` concatenado, el adaptador debe detectar y descartar ese artefacto, nunca propagarlo como si fuera un nombre real |
| `ald`, `agedays` | `Player.dateOfBirth`/`age` | ✅ |
| `CountryID` | `Player.nationalityRef` | ✅ como referencia |
| `gentleness`, `honesty`, `Aggressiveness`, `led` | `Player.personality` (`PersonalityProfile`) | ✅ — el más sólido de todo el mapeo (ver Sprint 0: coincidencia exacta de escala + etiquetas) |
| `speciality` | `Player.specialty` | ✅ |
| `ska` | `PlayerConditionSnapshot.injuryStatus` | 🔵 — el concepto general está confirmado; la convención `-1`=sano es propia del adaptador, debe documentarse como tal en el propio código futuro, no presentarse como regla de Hattrick |
| `for`, `uth`, `spe`, `mal`, `fra`, `ytt`, `fas`, `bac`, `mlv`, `rut` | `PlayerConditionSnapshot.skillSet` / `.experience` / `.form` | 🔵 (todos) — ver §4 |
| `loy` | `PlayerConditionSnapshot.loyalty` | ✅ |
| `sal` | `PlayerConditionSnapshot.salary` | ✅ |
| `mkt` | `PlayerConditionSnapshot.marketValue` | 🔵 — ambigüedad Valor de Mercado vs. TSI sin resolver, el adaptador debe declarar cuál asume |
| `warnings` | `PlayerConditionSnapshot.warningsAccumulated` | 🔵 |
| `LastMatch_*` | `PlayerMatchPerformance` | ✅ salvo `LastMatch_PositionCode` (🔵) y `LastMatch_Type` (❓, no se mapea) |
| `gev`, `gtl`, `gtc`, `gtt`, `hat`, `rating` (jugador), `PlayerCategoryId` | — | ❓ — **no se mapean**, sin significado asignado (Sprint 0 retiró explícitamente estas hipótesis) |

### Bloque del entrenador (`[player512205178]` en el ejemplo) → `Coach`

El adaptador debe **reconciliar las tres representaciones redundantes** del entrenador documentadas en Sprint 0 (bloque `[player]`, `staff0` en `[staff]`, `TrainerID`/`TrainerName` en `[xtra]`) en **una sola instancia** de `Coach`:

| Campo(s) HRF | Contrato canónico | Confianza heredada |
|---|---|---|
| `TrainerSkillLevel` | `Coach.trainingSkill` | ✅ |
| `TrainerType` | `Coach.tacticalAttitude` | 🔵 — concepto confirmado (3 valores oficiales), orden numérico no confirmado — el adaptador no debe adivinar la correspondencia 0/1/2↔Neutral/Offensive/Defensive sin verificarla en el juego |
| `ContractDate`, `Cost` | `Coach.contract` | ✅ |
| `staff0StaffId` = `TrainerID` = playerID del bloque `[player]` | Confirma que las tres fuentes describen la **misma** entidad — se usa como clave de reconciliación, no se mapean tres `Coach` distintos | ✅ (por coincidencia exacta de ID) |
| `[club].hjTranare` | **No** se usa como fuente de `Coach.trainingSkill` — se mantiene separado como `StaffMember{role: AssistantCoach}` (ver arriba), dada la hipótesis de que mide algo distinto | 🔵 |

### `[staff]` → `StaffMember[]`

Los registros `staffN*` con `N ≠ 0` (es decir, excluyendo al entrenador, ya cubierto arriba) se mapean a `StaffMember`. El campo `staffNStaffType` **no se mapea a `StaffMember.role`** porque Sprint 0 no encontró una tabla oficial de códigos — en su lugar, el adaptador debe determinar el `role` cruzando el nivel de cada rol en `[club]` (que sí está mapeado con confianza ✅, ver arriba) con el registro de `[staff]` correspondiente, cuando eso sea posible sin ambigüedad; si hay ambigüedad, el registro de `[staff]` se importa con `role` ausente en vez de adivinado.

### `[xtra]`, campos de fecha del ciclo semanal

No se mapean a ningún contrato canónico en este Sprint — Sprint 0 no encontró documentación oficial de su semántica exacta (`DailyUpdate1`–`5`). Quedan fuera del alcance del adaptador hasta que se resuelvan.

---

## 4. Caso especial: los 10 campos de habilidad/atributo (`for`...`rut`)

Este es el bloque de mayor impacto para el producto (alimenta Entrenamiento, Táctica y Scouting) y el de menor confianza confirmada. La estrategia recomendada, **pendiente de decisión explícita del usuario** (ver `DECISIONS.md`), es:

1. El adaptador **sí mapea** estos 10 campos a `SkillSet`, `form` y `experience` — no dejarlos fuera dejaría al sistema sin ningún dato de habilidades, inutilizando Sprint 2 y Sprint 3 por completo.
2. Cada valor mapeado se marca con un indicador de confianza (`unverifiedMapping = true`) heredado directamente de su clasificación 🔵 en Sprint 0.
3. **Antes de que cualquier motor de decisión (Sprint 2/3) confíe en estos valores para una recomendación al manager**, se debe completar la verificación manual pendiente desde Sprint 0: comparar el valor de un jugador conocido en el `.hrf` contra su pantalla de habilidades dentro del propio juego, para el club Menaus. Esta verificación no requiere código — es una tarea de una sola vez, de comparación manual.

---

## 5. Indicador de confianza en el contrato

Siguiendo §2 y §4, se recomienda (decisión pendiente, ver `DECISIONS.md`) que los contratos de tipo snapshot que contengan campos 🔵 lleven, además de sus campos de datos, una marca de confianza por campo o por grupo de campos — de forma que la capa de aplicación pueda, por ejemplo, mostrar "⚠️ dato no verificado" en un reporte, en vez de presentarlo con la misma autoridad que un dato ✅ confirmado. La forma exacta de esa marca (un campo aparte, una lista de advertencias adjunta al snapshot, etc.) es una decisión de implementación fuera de este Sprint.
