# Modelo de Dominio derivado del HRF

## Propósito y método

Este modelo se deriva **exclusivamente** de la evidencia encontrada en las dos exportaciones HRF inspeccionadas, contrastada contra la documentación oficial de Hattrick (ver [hrf-data-dictionary.md](hrf-data-dictionary.md), sección "Metodología de verificación"). No introduce entidades, atributos ni relaciones que no estén respaldados por el archivo o por una fuente oficial citada. Donde el archivo sugiere algo pero ni el archivo ni una fuente oficial lo confirman, se marca explícitamente como **hipótesis (concepto oficial, campo sin confirmar)**. Donde no hay ni evidencia interna ni fuente oficial, se marca como **desconocido**, sin significado asignado. Donde el archivo referencia algo que no describe, se marca como **entidad externa / fuera de alcance del HRF**.

**Nota de esta revisión:** el diccionario de datos fue actualizado tras verificar cada hipótesis contra el Manual, la Wiki y el Developer Blog oficiales de Hattrick. El resultado no fue uniforme: varios campos subieron a hecho confirmado con cita oficial (p. ej. Team Spirit, Confidence, los cuatro rasgos de personalidad, las especialidades, la fórmula salarial, los seis roles de personal), mientras que otras hipótesis que no encontraron respaldo oficial fueron retiradas explícitamente y quedaron como desconocidas (p. ej. `gev`, `gtl`/`gtc`/`gtt`, `rating` de jugador, el código de tipo de personal). Las secciones siguientes reflejan ese resultado; el diccionario de datos es la fuente de detalle campo por campo.

Este documento es insumo para el futuro `ARCHITECTURE.md` / capa de Dominio, pero **no implementa nada**: no define clases, tipos de lenguaje ni esquema de base de datos.

---

## Diagrama de entidades y relaciones

```
Team (Club) 1───1 Arena
Team 1───1 LeagueStanding        (resumen propio, no la tabla completa)
Team 1───1 TrainingState
Team 1───1 EconomySnapshot        (uno por importación)
Team 1───1 NextLineup             (alineación configurada)
Team 1───1 LastLineup             (última alineación jugada)
Team 1───N Player
Team 1───N StaffMember
Team 1───1 Trainer                 (Player + StaffMember unificados, ver nota)

Player N───1 Country               [externo, solo ID]
Player 0/1─1 LastMatchPerformance  (embebido en el propio bloque de jugador)
Player 0/1─1 NationalTeam           [externo, solo ID, casi siempre ausente]

LastLineup 0───N SubstitutionOrder  (condicional, no siempre presente)

NextLineup / LastLineup ───N LineupSlot──1 Player   (slot posicional fijo, puede estar vacío)
```

---

## Entidad: Team (Club)

La entidad raíz. Un único club por archivo (el del manager que exporta).

**Atributos confirmados:** `teamID` (identidad estable), `teamName`, `owner`, `activationDate`, `countryID`, `leagueID`, `regionID`, `fanclub`, `GlobalRanking`, `LeagueRanking`, `RegionRanking`, `PowerRating`.

**Relaciones:**
- Contiene N `Player` (plantilla completa observada: 21 bloques `[player<ID>]`, incluyendo el entrenador).
- Contiene N `StaffMember`.
- Tiene un `Arena`.
- Tiene, por cada importación, un `EconomySnapshot`, un `TrainingState`, un `LeagueStanding`, un `NextLineup` y un `LastLineup`.

**Nota de identidad temporal:** el HRF es una **fotografía de un instante** (`[basics].date`). El propio archivo no contiene historial. Para las funciones de "comparación semanal" y "evolución" (`Product.md`, `ROADMAP.md` Sprint 2), el dominio necesitará **archivar snapshots sucesivos** — el archivo por sí solo no lo resuelve. Confirmado por evidencia directa: comparar los dos HRF fue la única forma de detectar qué cambia semana a semana.

---

## Entidad: Player

La entidad más importante para las funciones de decisión (alineación, entrenamiento, scouting).

**Identidad:** el `playerID` (usado como sufijo de la sección `[player<ID>]`) es **estable entre exportaciones** — confirmado: los 21 jugadores conservan el mismo ID en ambos snapshots. Es la clave natural para seguir a un jugador en el tiempo.

**Atributos confirmados (agrupados por propósito, no por orden del archivo):**

- **Identidad:** `name`, `firstname`, `lastname`, `nickname`, `ald` (edad en años), `agedays`.
- **Vínculo con el club:** `arrivaldate`, `homegr` (formado en casa), `MatchesCurrentTeam`, `GoalsCurrentTeam`.
- **Salud:** `ska` (hipótesis: semanas de lesión restantes, `-1` = sano).
- **Disciplina:** `warnings` (amonestaciones acumuladas).
- **Habilidades (concepto oficial confirmado, campo sin confirmar — ver diccionario de datos):** `for`, `uth`, `spe`, `mal`, `fra`, `ytt`, `fas`, `bac`, `mlv`, `rut` — diez atributos numéricos enteros, sin granularidad decimal. Hattrick documenta oficialmente (Wiki: *Skill*, *Denominations*, *Experience*) que existen exactamente 8 habilidades entrenables (Stamina, Playmaking, Scoring, Defending, Winger, Passing, Set Pieces, Goalkeeping) más Form y Experience como atributos relacionados, los diez con una escala oficial de 0 a 20 — coherente con los rangos observados. Lo que **no** está documentado oficialmente es la traducción "abreviatura sueca del `.hrf` → habilidad concreta"; por eso cada uno de estos diez campos permanece como concepto confirmado pero campo sin confirmar, y no debe tratarse como un hecho al diseñar el dominio sin verificarlo primero contra el juego.
- **Personalidad (no entrenable, confirmado oficialmente — Wiki: *Personality*):** `gentleness` (Agreeability), `honesty` (Honesty), `Aggressiveness` (Aggressiveness/Aggressivity), `led` (Leadership) — los cuatro atributos que la Wiki oficial declara textualmente como los componentes de la personalidad de un jugador, con escalas numéricas que coinciden exactamente con los rangos observados en el archivo. `speciality` (con sus etiquetas ya en español) corresponde a 5 de las 7 especialidades oficialmente documentadas (Wiki: *Specialty*).
- **Economía del jugador:** `sal` (salario), `mkt` (valor de mercado estimado).
- **Rendimiento reciente:** un sub-conjunto embebido `LastMatch_*` (fecha, valoración, id de partido, posición jugada, minutos jugados).
- **Identificadores externos:** `CountryID`, `NationalTeamID`, `PlayerNumber`.

**Lo que el archivo NO contiene para esta entidad (confirmado por ausencia, no asumir en el dominio):**
- Ningún campo de **potencial** o proyección de techo de habilidad.
- Ningún histórico de habilidades pasadas (solo el valor actual).
- Ninguna habilidad con precisión decimal/sub-nivel.

**Caso especial — el Entrenador:** el jugador con `playerID = 512205178` es, en realidad, el entrenador del club. Aparece con casi todos los campos de habilidad vacíos, más un grupo exclusivo (`TrainerType`, `ContractDate`, `Cost`, `TrainerSkillLevel`, `TrainerStatus`) y `LineupDisabled=true`. **Esto sugiere que "Entrenador" no es una entidad separada en el HRF, sino un caso particular de `Player`** con un subconjunto de atributos distinto. El dominio deberá decidir (fuera del alcance de este documento, es una decisión de diseño, no un hecho del archivo) si modelarlo como el mismo tipo `Player` con campos opcionales, o como una entidad `Trainer` propia que referencia a `Player` — ambas son legítimas frente a la evidencia, pero deben decidirse explícitamente y registrarse en `DECISIONS.md`.

**Actualización tras verificación oficial:** la Wiki (*Coach*) confirma que un entrenador tiene oficialmente dos habilidades — *Training Skill* (capacidad de entrenamiento, tope "excellent") y *Leadership* — y que existen exactamente **tres actitudes tácticas posibles**: Neutral, Offensive, Defensive. Esto confirma el concepto detrás de `TrainerSkillLevel` y `TrainerType`, aunque la codificación numérica exacta de `TrainerType` no está documentada oficialmente. Además, la Wiki confirma que "Assistant Coach" es un rol de personal **distinto** del entrenador principal (ver `StaffMember`), lo que ofrece una explicación consistente — aunque no confirmada — para la discrepancia numérica observada entre `[club].hjTranare` (4) y `[player512205178].TrainerSkillLevel` (3): podrían no ser la misma medición.

---

## Entidad: StaffMember

Corresponde a los bloques `staffN*` dentro de `[staff]`.

**Atributos confirmados:** `Name`, `StaffId`, `StaffType` (código sin leyenda — ver limitaciones), `StaffLevel`, `Cost`.

**Relación con Player/Trainer:** `staff0` siempre corresponde al entrenador (`staff0StaffId` = playerID del entrenador, confirmado por coincidencia exacta de ID). Los demás (`staff1`...`staff4`) son personal sin bloque `[player]` propio — son una entidad distinta de `Player`, no jugadores.

**Roles posibles, confirmados oficialmente (Wiki: *Staff*):** el sistema de personal actual de Hattrick permite exactamente 6 tipos de especialista contratable — Assistant Coach (hasta 2 simultáneos), Medic, Form Coach, Sports Psychologist, Financial Director, Tactical Assistant — cada uno con nivel de habilidad de 1 a 5, y un máximo de **4 especialistas contratados a la vez** por club. La Wiki también confirma que el rol "Spokesperson" fue eliminado como personal contratable en octubre de 2015 (temporada global 60), y que "Doctor" fue renombrado a "Medic" y "Physiotherapist" a "Form Coach".

**Limitación que persiste:** `StaffType` es un código numérico (`1`, `2`, `4`, `5` observados) **sin leyenda oficial encontrada**. Aunque ahora se conocen con certeza los 6 roles posibles, ninguna fuente oficial documenta qué número de `StaffType` corresponde a cada uno. La correlación que en la Revisión 1 se sugería entre el cambio de `staff2` y la contratación de un psicólogo **se retira explícitamente** por falta de respaldo oficial y queda como observación interna sin confirmar, no como hecho del dominio.

---

## Entidad: Arena

**Atributos confirmados:** `arenaname`, `arenaid`, capacidad desglosada por tipo de asiento, estado y fecha de ampliación/reconstrucción. Es 1:1 con el club, estable entre snapshots salvo por obras.

---

## Entidad: EconomySnapshot

Representa el estado financiero del club **en el momento de la importación**, con desglose de ingresos/gastos de la semana en curso y de la semana anterior.

**Hallazgo estructural confirmado (evidencia numérica exacta):** `ExpectedCash` de una importación es idéntico al `Cash` real de la importación siguiente. Esto confirma que el dominio puede tratar `ExpectedCash` como una **proyección verificable**, útil para detectar desviaciones si en el futuro no coincidiera (p. ej. por una venta de jugador no planeada).

**Relación temporal:** como con el club en general, cada importación produce **un snapshot nuevo**; el HRF no almacena serie histórica, solo el estado actual + el resumen de la semana inmediatamente anterior.

---

## Entidad: TrainingState

Agrupa `[team]`: nivel de entrenamiento, tipo de entrenamiento activo (`trType`, ya localizado a español — ej. "Jugadas"), porcentaje asignado a resistencia, moral (`stamning`) y confianza (`sjalvfortroende`) del equipo, y experiencia táctica por formación (`exper433`, etc.).

**Relevancia para decisiones (Product.md — Entrenamiento):** `trType`/`trTypeValue` indican el foco de entrenamiento actual; `staminaTrainingPart` es directamente configurable y varió entre snapshots (10→15), confirmando que es un parámetro editable por el manager, no un dato derivado.

---

## Entidad: LeagueStanding

Agrupa `[league]`: serie, partidos jugados, goles a favor/en contra, puntos, posición — **solo del propio club**. No existe una entidad "tabla de liga completa" ni "equipo rival" en el HRF.

---

## Entidad: NextLineup / LastLineup

Ambas modelan una alineación, pero con **vocabularios de posición distintos** (confirmado): `NextLineup` (sección `[lineup]`) usa un conjunto fijo de roles posibles (con `0` cuando no se usan); `LastLineup` (sección `[lastlineup]`) usa una nomenclatura distinta (`insideBack1/2/3` en vez de nombres de posición fija), reflejando la formación realmente jugada.

**Sub-entidad condicional: SubstitutionOrder.** Dentro de `LastLineup`, un grupo `subst0*` (jugador que entra, que sale, minuto de la condición, posición, comportamiento, condición de tarjeta/marcador) aparece **solo si existió una orden de sustitución configurada** para ese partido — confirmado por su ausencia total en uno de los dos snapshots. El dominio debe modelar esto como una colección opcional (0..N), nunca como campos fijos.

---

## Entidades externas referenciadas pero NO descritas por el HRF

Estas entidades existen conceptualmente (el archivo las referencia por ID) pero **su información completa no está en el archivo** — cualquier dato sobre ellas deberá venir de otra fuente, tal como ya anticipa `ARCHITECTURE.md` ("Manual league data", "Manual opponent data"):

| Entidad externa | Cómo se referencia en el HRF | Implicación |
|---|---|---|
| País | `CountryID` (club y jugadores) | No hay tabla de nombres de país en el archivo — se necesita una fuente externa fija (probablemente estática, no cambia semana a semana) |
| Liga / División | `leagueID`, `regionID`, `serie`, `LeagueLevelUnitID` | Solo IDs/códigos, sin nombres resolubles |
| Selección nacional | `NationalTeamID` | Casi siempre `0` en esta plantilla; sin más detalle si no lo fuera |
| Partido (Match) | `LastMatch_id` (por jugador), `matchid` (en lineup) | El HRF referencia partidos por ID pero no incluye su resultado, rival, ni eventos — confirma que el "Análisis de rivales" de `Product.md` requiere una fuente de datos distinta al HRF |
| Equipo rival | No aparece en absoluto en este archivo | Confirma que `ARCHITECTURE.md` tiene razón al declarar "Manual opponent data" como fuente de verdad independiente |

---

## Relevancia de los datos para las decisiones del producto

Cruce explícito entre lo que el HRF ofrece (confirmado) y los objetivos declarados en `Product.md`.

### Decisiones tácticas (alineación de liga / amistoso / Best XI)

Campos con relación directa:
- Habilidades por jugador (`for`, `uth`, `spe`, `mal`, `fra`, `ytt`, `fas`, `bac`, `mlv`, `rut`) — el concepto de cada una de las 8 habilidades está oficialmente confirmado, **pero su mapeo a estos campos concretos sigue sin confirmarse**, ver diccionario de datos.
- `ska` (lesión) y `warnings` (riesgo de sanción) — para excluir jugadores no disponibles. El mecanismo de cuenta regresiva en semanas y el estado "magullado" (0) están confirmados oficialmente (Wiki: *Injury*).
- `honesty` y `Aggressiveness` — riesgo de tarjeta durante el partido, **ahora con probabilidades exactas documentadas oficialmente** (Wiki: *Personality*): p. ej. un jugador "Fiery" (nivel 4 de Aggressiveness) tiene un 11.5% de probabilidad de falta por partido, frente a 0.3% en un jugador "Tranquil" (nivel 0); un jugador "Infamous" (Honesty 0) tiene 10% de probabilidad de tarjeta por simulación, frente a 0.3% en uno "Saintly".
- `gentleness` — riesgo de caída de moral de equipo al fichar o vender a ese jugador, con porcentajes oficiales documentados (Wiki: *Team Spirit*): p. ej. vender a un jugador "Popular" tiene 26–27% de probabilidad de bajar la moral, frente a 0% al vender a uno "Controversial"/"Nasty".
- `LastMatch_PositionCode` — en qué posición ha rendido recientemente cada jugador (concepto de "RoleID" confirmado por la documentación CHPP, tabla numérica exacta no encontrada).
- `speciality`/`specialityLabel` — ya viene en español, usable directamente en explicaciones al manager; las 7 especialidades y sus efectos tácticos detallados están documentados oficialmente (Wiki: *Specialty*).
- `exper4xx`/`exper5xx` (experiencia por formación) — qué formaciones domina mejor el equipo; concepto confirmado (Wiki: *Denominations*), aunque algunos valores observados exceden la escala oficial documentada (0–8), discrepancia sin resolver.

**Lo que falta y no puede inventarse:** datos del rival (formación, fortalezas, debilidades) — no existen en el HRF, dependen de la fuente manual.

### Entrenamiento

Campos con relación directa:
- `trType`/`trTypeValue`, `staminaTrainingPart` — foco de entrenamiento actual configurado.
- `LastMatch_PlayedMinutes` por jugador — insumo directo para "detectar minutos faltantes" (`Product.md`).
- `agedays`/`ald` — jugadores jóvenes entrenan de forma más eficiente en Hattrick (conocimiento de dominio general, no evidencia del archivo).
- Comparar habilidades entre dos snapshots — único mecanismo disponible para "detectar jugadores entrenados", **limitado a saltos de nivel entero** (ver limitación de granularidad en el diccionario).

**Lo que falta:** minutos disponibles restantes de entrenamiento por jugador (regla de negocio de Hattrick, no un campo expuesto) — deberá calcularse con lógica de dominio, no leerse directamente.

### Scouting / mercado

Campos con relación directa:
- `mkt` (valor de mercado) vs `sal` (salario) — insumo para ROI.
- `ald`/`agedays` — edad, relevante para proyección de carrera.
- `TransferListed` — si ya está en el mercado.
- `homegr` — relevante para reglas de "jugador formado en casa" de Hattrick.

**Lo que falta:** no hay campo de potencial ni de jugadores fuera del propio club (para escanear el mercado de fichajes se necesitaría otra fuente/otro tipo de exportación, no presente aquí).

---

## Preguntas abiertas para Sprint 0 (antes de pasar a Sprint 1)

Esta lista se revisó tras contrastar el diccionario de datos contra la documentación oficial de Hattrick. Algunas preguntas de la Revisión 1 quedaron resueltas a nivel de **concepto** (se cita la fuente oficial); se conservan aquí solo las que siguen sin poder resolverse con los dos archivos disponibles ni con las fuentes oficiales consultadas:

1. ¿Es correcto el mapeo hipotético de habilidades (`for`, `uth`, `spe`, `mal`, `fra`, `ytt`, `fas`, `bac`, `mlv`, `rut`) a las 8 habilidades oficiales + Form + Experience? **El concepto detrás de cada uno de los diez atributos ya está confirmado oficialmente** (Wiki: *Skill*, *Experience*); lo que falta es la traducción campo→habilidad, que ninguna fuente oficial documenta. Sigue pendiente verificar comparando contra la pantalla de habilidades del jugador dentro del propio juego.
2. ¿Qué código numérico de `StaffType` corresponde a cada uno de los 6 roles de personal ahora confirmados (Assistant Coach, Medic, Form Coach, Sports Psychologist, Financial Director, Tactical Assistant)? No se encontró tabla oficial.
3. ¿Qué significan `LastMatch_PositionCode` y `LastMatch_Type` como enumeraciones completas? El concepto general de `LastMatch_PositionCode` (un "RoleID" que identifica el rol formal jugado) está confirmado por la documentación CHPP, pero no la tabla numérica completa.
4. ¿`matchid` en `[lineup]` siempre representa el próximo partido, o puede variar según el momento de exportación?
5. ¿De dónde saldrá la tabla de países (`CountryID` → nombre)? No se encontró en las fuentes oficiales consultadas — se necesita una fuente externa adicional (posiblemente la propia CHPP, no investigada en esta revisión).
6. ¿El equipo juvenil (`youthTeam*`) alguna vez tiene datos, o este club simplemente no lo usa? Necesitaríamos un HRF de un club con equipo juvenil activo para saberlo.
7. ¿Hay un tipo de exportación HRF distinto (p. ej. "scouting" o "liga completa") que sí incluya datos de otros equipos, o esa información siempre deberá ser manual como asume `ARCHITECTURE.md`?
8. ¿Por qué `[club].hjTranare` (4) y `[player512205178].TrainerSkillLevel` (3) no coinciden? La hipótesis más consistente tras la verificación es que representan cosas distintas (posible nivel de Asistente Técnico vs. habilidad del entrenador principal), pero no hay fuente oficial que lo confirme.
9. ¿Cuál es el orden numérico exacto de `TrainerType` (0/1/2 → ¿Neutral/Ofensivo/Defensivo, o algún otro orden)? El concepto de 3 actitudes tácticas del entrenador está confirmado oficialmente; el mapeo numérico no.
10. ¿Es `mkt` el Valor de Mercado o el TSI (Total Skill Index)? Ambos son conceptos oficiales distintos y documentados, con magnitudes numéricas similares; no se encontró forma de distinguirlos solo con este archivo.

Estas preguntas quedan registradas aquí como base para `DECISIONS.md` una vez resueltas, y no se han respondido por hipótesis para respetar la regla de "nunca inventar" de `AGENTS.md`.
