# Validation Rules

## Propósito

Especifica qué debe validarse **antes de que cualquier importación sea aceptada** por el dominio, sin importar de qué [adaptador de fuente](source-adapters.md) provenga. Estas reglas viven conceptualmente en la frontera entre la capa de Aplicación y el Dominio (`ARCHITECTURE.md`): son reglas de negocio de Hattrick y de integridad de datos, no reglas de ningún formato de origen — por eso un adaptador HRF, uno CHPP y uno manual quedan sujetos exactamente a las mismas validaciones.

**Alcance:** este documento define *qué* se valida y *por qué*, no *cómo* se implementa (no hay código, ni motor de validación, ni librería).

---

## 1. Niveles de severidad

| Nivel | Efecto | Cuándo se usa |
|---|---|---|
| **Rechazo duro (hard-fail)** | El registro afectado no entra al dominio en absoluto. Si afecta a un campo obligatorio de un contrato, se rechaza el registro completo, no solo el campo | Violaciones estructurales, de referencia, o de reglas de negocio confirmadas oficialmente sin excepción conocida |
| **Marca de revisión (soft-flag)** | El dato se acepta, pero queda marcado para revisión humana antes de usarse en una recomendación al manager | Anomalías estadísticamente raras pero posibles (p. ej. una habilidad "Divine"), o datos que dependen de un mapeo 🔵 no confirmado (ver Sprint 0 / Mapping Strategy) |

La distinción importa porque el dominio de Hattrick tiene casos legítimos que parecen anómalos (un jugador "Divine" es rarísimo pero real, según Sprint 0) — la validación no debe confundir "infrecuente" con "inválido".

---

## 2. Validaciones estructurales

Aplican a cualquier dato entrante, de cualquier fuente.

- Todo campo marcado **obligatorio** en un [Data Contract](data-contracts.md) debe estar presente y no vacío. Ausencia de un campo obligatorio → **rechazo duro** del registro.
- Todo identificador (`clubId`, `playerId`, `coachId`, `staffMemberId`, `arenaId`, `matchId`) debe ser no vacío y, dentro de una misma fuente, estable entre importaciones sucesivas del mismo objeto — un adaptador que no pueda garantizar esa estabilidad no debe usar ese campo como identidad canónica.
- Todo snapshot debe llevar los tres campos de procedencia obligatorios (`sourceType`, `importBatchId`, `observedAt`, ver Data Contracts §"Contrato transversal") — su ausencia es **rechazo duro** sin excepción, sin importar cuán completos estén los demás campos.
- Un dato no distingue "no reportado por la fuente" de "reportado como vacío" solo si el contrato lo permite explícitamente (ver caso `substitutionOrders` en Mapping Strategy) — en cualquier otro caso, un adaptador que no pueda distinguir ambos casos debe tratar el campo como no reportado (ausente), nunca como el valor por defecto de su tipo.

---

## 3. Validaciones de rango (Denominations)

Cada `Denomination` debe caer dentro de la escala oficial que le corresponde (confirmadas en Sprint 0, Wiki *Denominations*):

| Escala | Rango válido | Aplica a |
|---|---|---|
| `PlayerAbility` | 0–20 | Las 8 `SkillRating` de `SkillSet`, `experience`, `loyalty` |
| `FormLeadershipCoachSkill` | 1–8 (con 0 = *non-existent* solo para `leadership`, según Sprint 0) | `form`, `Coach.trainingSkill`, `Coach.leadership`, `Player.personality.leadership` |
| `FormationExperience` | 0–8 documentado oficialmente, aunque Sprint 0 observó valores que lo exceden — ver excepción abajo | `formationExperience[].level` |
| `Agreeability`, `Honesty`, `Aggressiveness` | 0–4 (con un 5º nivel superior sin número fijo oficial) | Los tres campos correspondientes de `PersonalityProfile` |
| `TeamSpirit` | 0–10 | `teamSpirit` |
| `Confidence` | 0–9 | `confidence` |

- Un valor **fuera del rango superior o inferior documentado** → **rechazo duro** por defecto, salvo la excepción de `FormationExperience` (ver siguiente punto).
- **Excepción documentada:** Sprint 0 observó valores de `formationExperience` que exceden el máximo oficial de 8 (p. ej. `10`). Como esta discrepancia ya está identificada y no resuelta, esta validación específica debe aplicarse como **marca de revisión**, no como rechazo duro, hasta que se resuelva la discrepancia (ver pregunta abierta en `hrf-domain-model.md`).
- Todo campo cuyo mapeo de origen quedó clasificado 🔵 en Sprint 0 (ver [hrf-mapping-strategy.md](hrf-mapping-strategy.md) §2) se acepta con **marca de revisión** obligatoria, incluso si su valor cae dentro del rango — el rango correcto no implica que el campo de origen esté bien identificado.

---

## 4. Validaciones referenciales

- Toda referencia a otro agregado (`playerRef` en un `SquadMembership`, `clubRef` en un `DivisionStanding`, `playerRef` en un `LineupSlotAssignment`) debe resolver a una entidad conocida por el sistema **o** venir acompañada de los datos mínimos para crearla en la misma operación de importación — una referencia colgante (a un jugador que no existe ni se está creando) es **rechazo duro** del registro que la contiene, no del import completo.
- Una `MatchLineup`/`LineupPlan` no puede referenciar, en `captainRef`, a un jugador que no esté presente en sus propios `slots` — **rechazo duro**.
- Un `LineupSlotAssignment` no puede referenciar a un jugador que, según el `SquadMembership` vigente en la fecha `observedAt` del `ImportBatch`, no pertenezca al club — **marca de revisión** (no rechazo duro, porque podría ser legítimo un fichaje del mismo día que la fuente aún no haya sincronizado en otra sección).

---

## 5. Validaciones temporales

- El `observedAt` de un nuevo `ImportBatch` no debería preceder al `observedAt` del último `ImportBatch` de la **misma fuente** para el **mismo club** — si ocurre, no es un rechazo automático (podría ser una recarga deliberada de un archivo antiguo), pero exige **marca de revisión** y no debe sobrescribir silenciosamente snapshots más recientes ya aceptados.
- Los snapshots son inmutables una vez aceptados: una importación nueva **añade** un snapshot con su propio `ImportBatch`, nunca modifica uno existente. Esto es consistente con el hallazgo de Sprint 0 de que el HRF es una fotografía puntual, no un delta — el histórico se construye acumulando fotografías, no editándolas.

---

## 6. Reglas de negocio de Hattrick (confirmadas oficialmente en Sprint 0)

Estas son reglas del juego real, no artefactos de ningún formato — su violación indica casi con certeza un error de mapeo del adaptador, no un estado legítimo del club.

| Regla | Fuente (Sprint 0) | Severidad |
|---|---|---|
| Un club tiene como máximo 4 `StaffMember` contratados simultáneamente | Wiki *Staff* | Rechazo duro del import de personal si se excede |
| De esos 4, como máximo 2 pueden ser de rol `AssistantCoach`, y máximo 1 de cada uno de los demás roles | Wiki *Staff* | Rechazo duro |
| El nivel de cualquier `StaffMember` o de `Coach.trainingSkill` no puede exceder su escala oficial (1–5 para especialistas, 1–8 tope "excellent" para el entrenador) | Wiki *Staff*, *Coach* | Rechazo duro |
| Una alineación de partido (`MatchLineup`) válida tiene exactamente 11 asignaciones con `isStarting=true` | Reglas generales de fútbol/Hattrick (conocimiento de dominio, no verificado campo por campo en Sprint 0) | Marca de revisión, no rechazo duro — podría importarse una alineación incompleta legítimamente si el partido aún no se jugó completo o la fuente reporta datos parciales |
| El `tacticalAttitude` de un `Coach` solo puede ser `Neutral`, `Offensive` o `Defensive` | Wiki *Coach* | Rechazo duro si el adaptador produce cualquier otro valor |
| La `specialty` de un jugador solo puede ser uno de los 8 valores confirmados (incluyendo `None`) | Wiki *Specialty* | Rechazo duro |

---

## 7. Regla transversal: nunca inventar (principio de `AGENTS.md`)

Esta es la validación más importante y atraviesa todas las anteriores:

> Ninguna importación puede aceptarse si, para cumplir un campo obligatorio, el adaptador tuvo que sustituir un dato ausente por un valor por defecto no confirmado por la fuente.

En la práctica, esto se traduce en una validación activa: el proceso de aceptación de un import debe poder distinguir "el adaptador leyó este valor de la fuente" de "el adaptador rellenó este valor porque el contrato lo pedía obligatorio" — la segunda situación **siempre** es un error de diseño del adaptador (el campo debería haberse modelado como opcional, o el registro debería rechazarse), nunca un comportamiento aceptado silenciosamente.

---

## 8. Qué NO define este documento

- No define un motor o librería de validación concreta.
- No define el formato de los mensajes de error o de las marcas de revisión (estructura de datos, no diseñada en este Sprint).
- No resuelve las discrepancias que señala como "marca de revisión" (p. ej. `FormationExperience` fuera de rango) — solo especifica cómo debe tratarlas el sistema mientras siguen sin resolver.
