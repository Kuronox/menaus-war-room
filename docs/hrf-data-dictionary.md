# Diccionario de Datos del HRF

## Alcance y metodología

Este documento describe, campo por campo, la estructura real observada en los archivos HRF exportados por Hattrick Organizer (HO) para el club Menaus (teamID `3301513`).

**Evidencia interna utilizada:**

- [`data/hrf/3301513-2026-08-28.hrf`](../data/hrf/3301513-2026-08-28.hrf) — jornada (`matchround`) 6
- [`data/hrf/3301513-2026-09-03.hrf`](../data/hrf/3301513-2026-09-03.hrf) — jornada (`matchround`) 7

**Revisión 2 (esta versión):** cada hipótesis de la Revisión 1 se contrastó contra la documentación oficial de Hattrick (Manual, Wiki, Developer Blog). El resultado se refleja campo por campo con una nueva columna de nivel de evidencia y su fuente. Ver el apartado de metodología de verificación más abajo antes de las tablas.

---

## Metodología de verificación (Revisión 2)

Se consultaron las siguientes fuentes oficiales de Hattrick:

| # | Fuente | Tipo | URL |
|---|---|---|---|
| S1 | Skill | Wiki oficial | https://wiki.hattrick.org/wiki/Skill |
| S2 | Denominations | Wiki oficial (tablas de escalas numéricas oficiales) | https://wiki.hattrick.org/wiki/Denominations |
| S3 | Personality | Wiki oficial | https://wiki.hattrick.org/wiki/Personality |
| S4 | Injury | Wiki oficial | https://wiki.hattrick.org/wiki/Injury |
| S5 | Specialty | Wiki oficial | https://wiki.hattrick.org/wiki/Specialty |
| S6 | Staff | Wiki oficial | https://wiki.hattrick.org/wiki/Staff |
| S7 | Loyalty | Wiki oficial | https://wiki.hattrick.org/wiki/Loyalty |
| S8 | Experience | Wiki oficial | https://wiki.hattrick.org/wiki/Experience |
| S9 | Total Skill Index | Wiki oficial | https://wiki.hattrick.org/wiki/Total_Skill_Index |
| S10 | Coach | Wiki oficial | https://wiki.hattrick.org/wiki/Coach |
| S11 | Team Spirit | Wiki oficial | https://wiki.hattrick.org/wiki/Team_Spirit |
| S12 | Confidence | Wiki oficial | https://wiki.hattrick.org/wiki/Confidence |
| S13 | Wages | Wiki oficial | https://wiki.hattrick.org/wiki/Wages |
| S14 | Transfer Price Adjustment | Wiki oficial | https://wiki.hattrick.org/wiki/Transfer_Price_Adjustment |
| S15 | CHPP Development/XML/players | Wiki oficial (documentación de desarrolladores, CHPP) | https://wiki.hattrick.org/wiki/CHPP_Development/XML/players |
| S16 | CHPP Development/XML/matchLineup | Wiki oficial (documentación de desarrolladores, CHPP) | https://wiki.hattrick.org/wiki/CHPP_Development/XML/matchLineup |
| S17 | CHPP Development/XML/matchOrders | Wiki oficial (documentación de desarrolladores, CHPP) | https://wiki.hattrick.org/wiki/CHPP_Development/XML/matchOrders |
| S18 | CHPP Development/XML/matchDetails | Wiki oficial (documentación de desarrolladores, CHPP) | https://wiki.hattrick.org/wiki/CHPP_Development/XML/matchDetails |

**Hallazgo metodológico central, válido para todo el documento:** Hattrick documenta oficialmente sus **conceptos de juego** (qué es la Resistencia, cómo funciona la Lealtad, qué escala tiene la Confianza, etc.) a través del Manual/Wiki, y documenta su **API moderna** (CHPP, en XML) a través del Developer Blog/Wiki de desarrolladores. **Ninguna fuente oficial de Hattrick documenta la especificación del archivo `.hrf`** en sí (es un formato heredado, de origen sueco, anterior a CHPP, mantenido de facto por la comunidad de herramientas como Hattrick Organizer). Esto significa que:

- Cuando el concepto de juego detrás de un campo está oficialmente documentado, se cita la fuente y se sube el nivel de confianza del **concepto**.
- Pero la **correspondencia exacta entre el nombre abreviado del campo del `.hrf` y ese concepto** casi nunca está confirmada por una fuente oficial — sigue dependiendo de evidencia interna (etimología sueca/inglesa, coincidencia de escala numérica, coincidencia de rango de valores, correlación con el rol del jugador). Siguiendo la instrucción del usuario, **cuando esa correspondencia de campo no está documentada oficialmente, el campo se marca como Desconocido** y no se le asigna un significado como si fuera un hecho — aunque, cuando existe, se conserva la pista de investigación no oficial, claramente separada, para no perder trabajo útil.

**Leyenda de confianza (revisada):**

| Símbolo | Significado |
|---|---|
| ✅ **Confirmado** | El campo mismo puede considerarse confirmado: o bien es autoevidente en el archivo (texto ya en español, coincidencia exacta entre las dos exportaciones), o converge evidencia suficientemente fuerte con una fuente oficial (coincidencia exacta de escala numérica documentada + coincidencia semántica de la etiqueta, o coincidencia literal del nombre del campo con el término oficial en inglés) |
| 🔵 **Concepto oficial documentado / campo no confirmado** | Hattrick documenta oficialmente el concepto de juego relacionado (se cita la fuente), pero **ninguna fuente oficial confirma que este campo abreviado del `.hrf` sea ese concepto**. Se conserva la pista de investigación (etimología, correlación interna) como nota separada, explícitamente no oficial |
| ❓ **Desconocido** | No se encontró documentación oficial del concepto, ni evidencia interna suficiente. No se asigna significado |

**Nota de codificación:** sigue pendiente confirmar la codificación de caracteres exacta (UTF-8 presunto) — no se investigó porque no es un dato de dominio del juego, no aplica a esta verificación.

**Formato general:** sin cambios respecto a la Revisión 1 — texto plano tipo INI, secciones `[nombre]`, bloque `[player<ID>]` repetido por jugador, grupo `staffN*` repetido por miembro de cuerpo técnico.

---

## [basics] — Identidad del club y contexto temporal

Sin cambios respecto a la Revisión 1: son campos de identidad/administrativos (`teamID`, `teamName`, `owner`, fechas, `countryID`, `leagueID`, `regionID`, `hasSupporter`) que no corresponden a "conceptos de juego" del Manual/Wiki, por lo que no aplica una búsqueda de verificación — su significado ya era autoevidente por el nombre del campo y el valor observado. Se mantienen como ✅ Confirmado, salvo `countryID`/`leagueID`/`regionID`/`LastLeagueStatisticsMatchRound`/`LastLeagueStatisticsSeason`, que siguen como referencias externas sin nombre resoluble (❓ para el significado del *valor*, aunque el *campo* en sí es claro).

---

## [league] — Posición en la liga (temporada actual)

No se encontró una página oficial de Wiki dedicada a documentar los nombres de campo suecos de esta sección (`spelade`, `gjorda`, `inslappta`, `poang`, `placering`). Estos términos son vocabulario futbolístico sueco genérico, no conceptos de juego específicos de Hattrick con página propia — no hay una fuente oficial de Hattrick que los "documente" como tal, más allá de que describen estadísticas de liga estándar (partidos jugados, goles a favor, goles en contra, puntos, posición), universales en cualquier competición de fútbol y no exclusivas de Hattrick.

| Campo | 28-ago | 03-sep | Significado | Confianza |
|---|---|---|---|---|
| `serie` | `V.181` | `V.181` | Identificador de la serie/división | ✅ (estable, autoevidente) |
| `spelade` | 5 | 6 | Partidos jugados | 🔵 — etimología sueca clara, sin fuente oficial de Hattrick que documente el nombre de campo |
| `gjorda` | 4 | 6 | Goles a favor | 🔵 — ídem |
| `inslappta` | 12 | 12 | Goles en contra | 🔵 — ídem |
| `poang` | 3 | 6 | Puntos | 🔵 — ídem |
| `placering` | 6 | 5 | Posición en la tabla | 🔵 — ídem |

**Limitación sin cambios:** esta sección solo contiene el resumen del propio club; el HRF no incluye la tabla completa de la liga.

---

## [club] — Cuerpo técnico e instalaciones (niveles agregados)

**Actualización importante (S6 — Staff):** la Wiki oficial documenta que el sistema de personal actual de Hattrick permite exactamente **6 tipos de especialista contratable**: Assistant Coach (hasta 2), Medic, Form Coach, Sports Psychologist, Financial Director, Tactical Assistant — cada uno con nivel de habilidad de 1 a 5 (0 = no contratado). Además, **el Spokesperson (portavoz de prensa) fue eliminado como personal contratable en octubre de 2015 (temporada global 60)**: *"On October 2015 (global season 60), Spokesperson specialist was removed as a staff member. Instead all teams gained the highest effect of a level 5 for free."* (S6). Esto **confirma y explica** por qué `presstalesman=0` en ambos snapshots: ya no es un nivel contratable, el campo quedó vestigial.

También documenta (S6) que "Doctor" fue renombrado a "Medic" y "Physiotherapist" a "Form Coach": *"It was also reintroduced the Financial Director from Accountants, Doctor was renamed to Medic and Physiotherapist to Form Coach."*

| Campo | 28-ago | 03-sep | Significado | Confianza |
|---|---|---|---|---|
| `hjTranare` | 4 | 4 | Hipótesis: nivel de Entrenador Asistente (*Assistant Coach*) — el sueco "hjälptränare" significa literalmente "entrenador ayudante" | 🔵 — concepto "Assistant Coach" oficialmente documentado (S6, escala 1-5), pero el campo no coincide exactamente en escala con el valor 4 observado (podría exceder 5 en la lectura ingenua, o representar otra cosa); **no confirmado** |
| `psykolog` | 0 | 2 | Nivel de Psicólogo Deportivo (*Sports Psychologist*) | ✅ — correspondencia sueco→inglés directa ("psykolog"=psicólogo) + rol oficialmente documentado (S6) + escala observada (0-2) cabe en la escala oficial 0-5 |
| `presstalesman` | 0 | 0 | Nivel de Portavoz (*Spokesperson*) — **rol eliminado del juego desde 2015**; el campo queda en 0 porque ya no es contratable | ✅ — confirmado explícitamente por S6 |
| `lakare` | 2 | 2 | Nivel de Médico (*Medic*, antes "Doctor") | ✅ — correspondencia sueco→inglés directa ("läkare"=médico) + renombrado documentado oficialmente (S6) + escala observada (2) cabe en 0-5 |
| `financialDirectorLevels` | 0 | 0 | Nivel de Director Financiero (*Financial Director*) | ✅ — coincidencia literal del nombre de campo en inglés con el rol oficial (S6) |
| `formCoachLevels` | 2 | 0 | Nivel de Entrenador de Forma (*Form Coach*, antes "Physiotherapist") | ✅ — coincidencia literal del nombre de campo + renombrado documentado oficialmente (S6) |
| `tacticalAssistantLevels` | 0 | 0 | Nivel de Asistente Táctico (*Tactical Assistant*) | ✅ — coincidencia literal del nombre de campo con el rol oficial (S6) |
| `juniorverksamhet` | 0 | 0 | Actividad juvenil | 🔵 — sin página oficial dedicada a un campo equivalente |
| `undefeated` | 0 | 1 | Racha de invicto | ✅ — autoevidente, confirmado por el archivo mismo |
| `victories` | 0 | 1 | Racha de victorias consecutivas | ✅ — autoevidente |
| `fanclub`, `GlobalRanking`, `LeagueRanking`, `RegionRanking`, `PowerRating` | — | — | Métricas de club sin página oficial dedicada al campo específico | 🔵 |

**Hallazgo relevante para el dominio:** dado que ahora sabemos que solo 6 tipos de especialista existen y cada club puede tener **máximo 4 contratados simultáneamente** (S6: *"up to 4 staff members in total"*), el futuro motor de "Command Center" (`Product.md`) podría usar esta regla oficial para advertir al manager cuántos huecos de personal tiene libres — esto es una regla de negocio confirmada, no una hipótesis.

---

## [team] — Estado de entrenamiento, moral y experiencia táctica

**Actualización importante (S1, S2, S11, S12):** se confirmó oficialmente la existencia de exactamente **8 habilidades entrenables** (Skill, S1): *Stamina, Playmaking, Scoring, Defending, Winger, Set Pieces, Goalkeeping, Passing*. También se confirmaron las escalas numéricas oficiales exactas para Team Spirit (11 niveles, 0–10) y Confidence (10 niveles, 0–9) en la página Denominations (S2).

| Campo | 28-ago | 03-sep | Significado | Confianza |
|---|---|---|---|---|
| `trLevel` | 100 | 100 | Nivel de entrenamiento del club | 🔵 |
| `staminaTrainingPart` | 10 | 15 | % del entrenamiento asignado a resistencia — configurable, cambió entre semanas | ✅ (campo de configuración, confirmado por el cambio observado) |
| `trTypeValue` / `trType` | 8 / `Jugadas` | 8 / `Jugadas` | Tipo de entrenamiento activo. "Jugadas" ya viene en español en el propio archivo | ✅ — el valor ya es texto explícito, y "Playmaking" es una de las 8 habilidades oficiales (S1) |
| `stamningValue` | 4 | 4 | Moral de equipo (*Team Spirit*) | ✅ — **coincidencia exacta**: la Wiki oficial (S11) declara que el valor de reinicio de cada temporada es *"a default level composed (4.5)"*, y la tabla de denominaciones (S2) sitúa "composed" exactamente en el nivel 4 de una escala de 0 a 10. Nuestro valor observado es 4, coincidiendo exactamente con esa posición oficial |
| `stamning` | `serenos` | `serenos` | Etiqueta de Team Spirit en español | ✅ — "sereno/a" es una traducción razonable de "composed" (nivel 4 confirmado arriba); coherente con el valor numérico |
| `sjalvfortroendeValue` | 2 | 2 | Confianza de equipo (*Confidence*) | ✅ — **coincidencia exacta**: la tabla de denominaciones oficial (S2) sitúa el nivel 2 de la escala de Confidence (0–9) en el término "wretched" |
| `sjalvfortroende` | `Muy baja` | `Muy baja` | Etiqueta de Confidence en español | ✅ — "Muy baja" es coherente con "wretched" (nivel 2, casi el mínimo de una escala de 10 niveles) |
| `exper433`, `exper451`, `exper352`, `exper532`, `exper343`, `exper541`, `exper442`, `exper523`, `exper550`, `exper253` | — | — | Experiencia táctica del equipo por formación (*Squad Formation Experience*) | 🔵 — la Wiki (S2, "Squad & Youth Squad Formation Experience (9)") confirma que este concepto existe oficialmente con una escala documentada de 0 a 8 ("non-existent" a "excellent"); sin embargo, **varios valores observados en el archivo superan 8** (p. ej. `exper352=10`), lo que no encaja del todo con la escala documentada — se marca como concepto confirmado pero con una discrepancia sin resolver, no forzar la coincidencia |

---

## [lineup] — Alineación configurada (próximo partido)

**Actualización (S10 — Coach):** se confirmó oficialmente que existen **tres tipos de actitud táctica del entrenador**: *Neutral Coach, Offensive Coach, Defensive Coach* (S10). También se confirmó oficialmente el concepto de **"style of play"** como una barra ajustable de tendencia ofensiva/defensiva, cuyo rango de ajuste depende del nivel del Asistente Táctico: *"With each tactical assistant level, you can move up to 20 percentage points away from your coach's affinity"* (S10, sección Tactical Assistant).

| Campo | Ejemplo | Significado | Confianza |
|---|---|---|---|
| `teamid` | `3301513` | Redundante con `[basics].teamID` | ✅ |
| `matchid` | `768977085` → `42018042` | ID del partido asociado | 🔵 — sin cambios respecto a Revisión 1, sin fuente oficial que documente este campo del `.hrf` |
| `matchtyp` | `1` → `50` | Código de tipo de partido | ❓ — no se encontró tabla oficial de códigos |
| `trainer` | `512205178` | playerID del entrenador | ✅ |
| `installning` | `0` | Sin evidencia oficial ni interna suficiente | ❓ |
| `styleOfPlay` | `0` | Barra de estilo de juego (ofensivo/defensivo) | ✅ — concepto oficialmente confirmado (S10); el valor `0` en ambos snapshots es coherente con `tacticalAssistantLevels=0` en `[club]`, ya que sin Asistente Táctico no hay margen para mover la barra — **esta correlación interna entre dos secciones distintas del mismo archivo refuerza la confirmación** |
| `tactictype` | `0` | Hipótesis: táctica secundaria (Hattrick documenta oficialmente tácticas secundarias como Presión, Contraataque, Jugar Creativamente, Ataque por el Medio/las Bandas, Disparos Lejanos, aunque esto no se investigó a fondo en esta revisión) | 🔵 |
| `keeper`...`centralForward`, `substgk1`...`substxt2` | playerID o `0` | Posiciones/suplentes — vocabulario fijo de roles | ✅ — confirmado por comparación entre snapshots (Revisión 1) |
| `captain` | playerID | Capitán | ✅ |
| `kicker1` | playerID | Lanzador designado de balón parado | 🔵 |
| `order_*` | `0` | Sin evidencia oficial ni interna suficiente | ❓ |
| `penalty0`...`penalty10` | playerID | Orden de lanzadores de penalti | ✅ |

---

## [economy] — Finanzas del club

Sin cambios de fondo: esta sección ya estaba mayormente **✅ Confirmada por evidencia interna directa** en la Revisión 1 (coincidencias numéricas exactas entre `ExpectedCash`/`Cash` y `ExpectedWeeksTotal`/`LastWeeksTotal` de una semana a otra), lo cual sigue siendo el tipo de evidencia más fuerte posible. No se encontró una página oficial de Hattrick que documente estos nombres de campo específicos del `.hrf` (el Manual sí documenta el sistema económico general — ingresos por espectadores, patrocinadores, etc. — pero no bajo estos nombres de campo), así que se mantiene la clasificación de la Revisión 1.

---

## [arena] — Estadio

Sin cambios: campos administrativos autoevidentes, sin necesidad de verificación externa. Se mantiene ✅ para los campos estructurales y 🔵 para las abreviaturas suecas de tipo de asiento (`antalStaplats`, `antalSitt`, `antalTak`, `antalVIP`).

---

## [player&lt;ID&gt;] — Bloque de jugador

### Identidad, salud y estado general

Sin cambios sustanciales respecto a Revisión 1 para los campos de identidad (`name`, `firstname`, `lastname`, `ald`, `agedays`, `arrivaldate`, `homegr`, `CountryID`, etc.) — siguen ✅/🔵 igual que antes, no son "conceptos de juego" verificables contra el Manual.

**`ska` (estado de lesión) — actualización (S4, Injury):**

La Wiki oficial confirma el mecanismo completo: las lesiones se muestran como **"+N semanas"**, con un estado especial **"bruised" (magullado) que se representa como el valor 0**: *"Once a player almost recovered he gets a bandage next to his name instead of the red plus. A bruised player can play [...]"* y la duración se estima en semanas, contando regresivamente. Esto **confirma oficialmente el concepto general** (cuenta regresiva en semanas, 0 = magullado/jugable) que ya habíamos hipotetizado en la Revisión 1 a partir de que el valor de Pazour bajó de 2 a 1 entre snapshots.

| Campo | Significado | Confianza |
|---|---|---|
| `ska` | Semanas de lesión restantes (0 = magullado, jugable) | 🔵 — el **concepto** (cuenta regresiva en semanas, 0=magullado) está oficialmente confirmado (S4); pero la convención específica de este archivo de usar **`-1` para "sin lesión"** no aparece documentada en ninguna fuente oficial — es una convención propia del formato `.hrf`/HO, no de Hattrick. Se mantiene como hipótesis para ese detalle concreto |
| `warnings` | Amonestaciones acumuladas | 🔵 — sin página oficial dedicada al conteo de amarillas acumuladas como atributo expuesto, aunque el concepto de tarjetas sí es central en el Manual de reglas |

### Habilidades (10 atributos numéricos por jugador)

**Este es el bloque donde la verificación tuvo el mayor impacto.** Resultado general: **el concepto de cada una de las 8 habilidades entrenables de Hattrick queda oficialmente confirmado** (S1, con definiciones textuales exactas), y las escalas numéricas oficiales (S2, S8) permiten verificar que los rangos de valores observados en el archivo son consistentes con esas escalas. **Pero, siguiendo la instrucción del usuario, la correspondencia exacta entre cada abreviatura sueca del `.hrf` (`for`, `uth`, `spe`, `mal`, `fra`, `ytt`, `fas`, `bac`, `mlv`, `rut`) y la habilidad oficial correspondiente permanece SIN CONFIRMAR por ninguna fuente oficial** — Hattrick no publica el diccionario de campos del `.hrf`. Se conserva la hipótesis de la Revisión 1 como pista de investigación, explícitamente marcada como no oficial.

**Las 8 habilidades oficiales, citadas textualmente (S1 — Skill):**

| Habilidad oficial | Definición textual (S1) |
|---|---|
| Stamina | "decides how much of his ability to perform a player loses during the course of the match" |
| Playmaking | "the ability to control the ball and turn it into scoring opportunities" |
| Scoring | "The ball is supposed to go into the net" |
| Winger | "the ability to finish off scoring opportunities by advancing down the sides" |
| Goalkeeping | "The ball should not make it into your own net" |
| Passing | jugadores que saben dar el pase decisivo ayudan al ataque del equipo |
| Defending | "the ability to stop opponent attacks" |
| Set Pieces | "The outcome of your free kicks and penalties depends on how skilled your set pieces taker is" |

**Escala oficial confirmada (S2, "Player Abilities (21)"):** 0 (non-existent) a 20 (divine). Todos los valores observados en el archivo (1–11 aprox.) caben cómodamente en este rango — consistente, aunque no concluyente por sí solo.

| Campo | Pista de investigación (NO oficial) | Confianza del campo |
|---|---|---|
| `for` | Forma (*Form*) — confirmada como concepto oficial y central: *"Form is one of the most important characteristics for any player, determining how well he is able to use his skills"* (hallado en investigación general, no en las 15 fuentes citadas arriba con URL exacta — pendiente de re-confirmar con cita directa) | ❓ para el campo — concepto de Form sí es oficial y central en Hattrick, pero la correspondencia `for`→Form no está confirmada por fuente citable con URL verificada en esta revisión |
| `uth` | Resistencia (*Stamina*) — sueco *uthållighet* | ❓ para el campo — concepto Stamina oficialmente confirmado (S1); mapeo del campo no confirmado |
| `spe` | Ataque/Jugadas (*Playmaking*) — sueco *spelförståelse*; coincide con que el club entrena "Jugadas" (`trType`) | ❓ para el campo — concepto Playmaking oficialmente confirmado (S1); mapeo del campo no confirmado, aunque la coincidencia con `trType=Jugadas` es una correlación interna sugerente |
| `mal` | Definición (*Scoring*) — sueco *mål* = "gol" | ❓ para el campo — concepto Scoring oficialmente confirmado (S1); mapeo no confirmado |
| `fra` | Pase (*Passing*) — sueco *framspelning* | ❓ para el campo — concepto Passing oficialmente confirmado (S1); mapeo no confirmado |
| `ytt` | Banda (*Winger*) — sueco *ytter* = "extremo" | ❓ para el campo — concepto Winger oficialmente confirmado (S1); mapeo no confirmado |
| `fas` | Balón parado (*Set Pieces*) — sueco *fasta situationer* | ❓ para el campo — concepto Set Pieces oficialmente confirmado (S1); mapeo no confirmado |
| `bac` | Defensa (*Defending*) — sueco *back* | ❓ para el campo — concepto Defending oficialmente confirmado (S1); mapeo no confirmado |
| `mlv` | Portería (*Goalkeeping*) — sueco *målvakt*; los dos únicos porteros del plantel tienen los valores más altos en este campo | ❓ para el campo — concepto Goalkeeping oficialmente confirmado (S1); la correlación interna (porteros con valores más altos) es la pista más fuerte de todo este bloque, pero sigue sin ser una fuente oficial, así que el campo se marca desconocido |
| `rut` | Experiencia (*Experience*) — sueco *rutin* | ❓ para el campo — concepto Experience oficialmente confirmado con definición y escala propia (S8: *"Experience simulates that a player has managed to learn things which improve his performance aside from the main skills"*, escala 0–20 igual que las habilidades); mapeo del campo `rut` no confirmado |

**Nota añadida tras evaluar el CSV de Hattrick Organizer** (`docs/ho-csv-comparison.md`, sin implementar ningún adaptador para él — ver D-020 sobre esa decisión): el export de HO nombra sus propias columnas de forma que coincide, campo por campo y valor por valor (verificado contra 3 jugadores del `.hrf` real, incluyendo un portero), exactamente con la hipótesis de esta tabla — `mlv`→Portería, `bac`→Defensa, `ytt`→Banda, `spe`→Jugadas, `fra`→Pase, `mal`→Definición, `fas`→Balón Parado, `for`→Forma, `rut`→Experiencia. Esto **aumenta la confianza informal** en la hipótesis, pero sigue siendo evidencia de nivel 5 del Hattrick First Principle (consenso de comunidad — HO no es Hattrick, y podría arrastrar el mismo error que cualquier otra fuente no oficial). **No se promueve ningún campo a ✅ ni se modifica D-019** — la condición de resolución sigue siendo, exclusivamente, la verificación contra la pantalla de habilidades dentro del propio juego.

**Importante:** estos ocho conceptos (incluyendo Form y Experience) están genuinamente documentados por Hattrick — no son invenciones. Lo que permanece abierto es exclusivamente la traducción "nombre de campo del `.hrf` → concepto oficial", porque esa traducción es un artefacto del formato de exportación, no del juego, y Hattrick no la publica. **Se recomienda, antes de construir cualquier lógica de dominio sobre estos diez campos, verificarlos directamente contra la pantalla de habilidades de un jugador dentro del juego** (comparar el valor mostrado en pantalla con el valor del campo en el `.hrf` del mismo jugador el mismo día) — esa sería la única forma de confirmarlos con certeza para *este* club.

**Sigue sin existir ningún campo de "potencial"** en el archivo — confirmado por ausencia, sin cambios respecto a Revisión 1.

**Limitación de granularidad:** sin cambios — los valores son enteros; Hattrick subdivide cada nivel en sub-niveles decimales (confirmado indirectamente por S4, que habla de "injury sublevel" con decimales, y por S9/TSI, que menciona "form sub-level" — ambos confirman que el juego maneja sub-niveles decimales internamente aunque el `.hrf` solo exponga el entero).

### Personalidad (no son habilidades entrenables) — actualización (S3, S2)

**Este bloque tuvo la verificación más sólida de todo el documento.** La Wiki oficial (S3, Personality) confirma textualmente: *"Personality is defined by four attributes: leadership, agreeability, honesty and aggressiveness."* Además, la página de Denominaciones (S2) publica las escalas numéricas exactas de cada uno, y estas escalas **coinciden exactamente** con los rangos observados en el archivo.

| Campo | Atributo oficial | Escala oficial (S2) | Escala observada en el archivo | Confianza |
|---|---|---|---|---|
| `gentleness` | Agreeability | 0 (nasty fellow) – 4 (popular guy), con un 5º nivel superior sin número fijo ("beloved team member") | 0–4 | ✅ — coincidencia exacta de rango + las etiquetas en español ("malintencionado", "agradable", "popular", "carismático") corresponden temáticamente a los términos oficiales ("nasty fellow", "pleasant guy", "popular guy", "sympathetic guy") |
| `honesty` | Honesty | 0 (infamous) – 4 (righteous), con "saintly" como techo | 0–4 | ✅ — coincidencia exacta de rango + nombre de campo en inglés literalmente igual al término oficial ("Honesty") + etiquetas coherentes ("deshonesto"→dishonest, "infame"→infamous, "honesto"→honest, "justo"→upright, "honorable"→righteous) |
| `Aggressiveness` | Aggressivity / Aggressiveness | 0 (tranquil) – 4 (fiery), con "unstable" como techo | 0–4 | ✅ — coincidencia exacta de rango + nombre de campo en inglés idéntico al término oficial + etiquetas coherentes ("tranquilo"→tranquil, "calmado"→calm, "estable"→balanced, "temperamental"→temperamental, "iracundo"→fiery) |
| `led` | Leadership | 0 (non-existent) – 7 (solid), escala "Form/Leadership/Coach Skills" | 1–5 | 🔵 — el campo es una abreviatura ("led"), no el nombre completo; la escala observada (1–5) cabe dentro de la oficial (0–7) pero no la agota, así que no es una confirmación tan fuerte como los tres anteriores |

**Definiciones oficiales citadas textualmente (S3):**
- Honesty: *"determines the odds of a player earning a yellow card for diving in order to gain a free kick or penalty for his team"*, con tabla de probabilidades exactas por nivel.
- Aggressiveness: *"determines the odds of a player earning a yellow card for fouling an opposing player during a match"*, también con tabla de probabilidades exactas.
- Leadership: *"show the potential as team captain and is important choosing a coach"*.
- Agreeability: *"determines how a team is affected when that player is added or traded away during a transfer"* — y, según S11 (Team Spirit), influye directamente en la probabilidad de que una transferencia haga bajar la moral del equipo, con una tabla de porcentajes exactos por nivel de Agreeability.

Esto **confirma con fuente oficial** una relación causal que en la Revisión 1 solo podíamos anotar como relevante para "decisiones tácticas": la personalidad de un jugador (`honesty`, `Aggressiveness`) predice matemáticamente su riesgo de tarjeta, y su `gentleness` predice el riesgo de fuga de moral de equipo al ficharlo o venderlo.

### Especialidad — actualización (S5)

La Wiki oficial (S5, Specialty) confirma que existen exactamente **7 especialidades**: *Unpredictable, Head, Technical, Powerful, Quick*, más dos especialidades raras: *Resilient (antes llamada Regainer)* y *Support*. Los valores de `specialityLabel` observados en el archivo (`Técnico`, `Rápido`, `Cabeceador`, `Imprevisible`, `Potente`) corresponden temáticamente a 5 de las 7 especialidades oficiales (Technical, Quick, Head, Unpredictable, Powerful).

| Campo | Significado | Confianza |
|---|---|---|
| `speciality` / `specialityLabel` | Especialidad del jugador (una de 7 posibles, oficialmente documentadas) | ✅ |

### Economía del jugador — actualización (S9, S13, S14)

| Campo | Significado | Confianza |
|---|---|---|
| `sal` | Salario semanal | ✅ — el Manual (S13, Wages) confirma la fórmula general (250€ base + contribución de la habilidad principal + habilidades secundarias + bono de Set Pieces) y una tabla oficial de contribución salarial por nivel de habilidad, coherente con los órdenes de magnitud observados en el archivo |
| `mkt` | Hipótesis: Valor de Mercado (*Market Value*) | 🔵 — Hattrick documenta oficialmente el "Market value" como concepto **distinto** de TSI (S14: *"The current market value of a player may differ greatly from what his TSI [...] might lead you to expect"*), lo que confirma que existe un concepto oficial llamado así; pero no hay fuente oficial que confirme que el campo `mkt` del `.hrf` sea específicamente ese valor y no, por ejemplo, el TSI (S9) — ambos se expresan como números de magnitud similar. Campo no confirmado. **Nota añadida tras evaluar el CSV de Hattrick Organizer** (`docs/ho-csv-comparison.md`): el export de HO llama a este mismo valor literalmente `"TSI"`, no "Valor de Mercado" — coincidencia exacta verificada en 3 jugadores. Esto apunta en la dirección contraria a la hipótesis original de esta fila. Es evidencia de nivel 5 (consenso de comunidad, HO no es Hattrick), **no se promueve a hecho confirmado ni cambia la confianza 🔵** |
| `Cost` (solo entrenador) | Coste de contratación del entrenador | ✅ — autoevidente, coherente con la tabla oficial de precios de contratación de entrenadores (S10, Coach) |

### Estadísticas y rendimiento

Sin verificación oficial posible para `gev`, `gtl`, `gtc`, `gtt`, `hat`: no se encontró ninguna página oficial que documente un desglose de goles por tipo con estos nombres. **Siguiendo la instrucción del usuario, se retira la hipótesis previamente asignada ("goles en toda la carrera") y estos campos quedan explícitamente como Desconocidos, sin significado asignado.**

| Campo | Confianza |
|---|---|
| `GoalsCurrentTeam`, `MatchesCurrentTeam` | ✅ — autoevidentes, nombre de campo describe el dato directamente |
| `gev` | ❓ — sin evidencia oficial; hipótesis anterior retirada |
| `gtl`, `gtc`, `gtt` | ❓ — sin evidencia oficial; no suman de forma consistente con `GoalsCurrentTeam` |
| `hat` | ❓ — sin evidencia oficial (posible "hat-trick" por el nombre, pero no confirmado; se retira como hipótesis firme y se deja como pista no oficial únicamente) |
| `rating` (campo de jugador, valores de -2 a 11) | ❓ — no coincide con ninguna escala oficial de valoración de partido encontrada (S1/S2 no documentan esta escala); se mantiene desconocido |

### Último partido jugado

| Campo | Significado | Confianza |
|---|---|---|
| `LastMatch_Date`, `LastMatch_Rating`, `LastMatch_RatingEndOfGame`, `LastMatch_PlayedMinutes` | Autoevidentes por nombre de campo | ✅ |
| `LastMatch_id` | Referencia externa a un partido | ✅ (como referencia; el partido en sí no está documentado en este archivo) |
| `LastMatch_PositionCode` | **❓ Desconocido — investigación cerrada, ver nota debajo de la tabla.** | ❓ |
| `LastMatch_Type` | Código de tipo de partido | ❓ — ver nota debajo de la tabla (hallazgo colateral de la misma investigación, sin resolver todavía) |

**Investigación cerrada sobre `LastMatch_PositionCode` (revisión posterior, solo fuentes oficiales):**

Hattrick documenta oficialmente, en la API CHPP (`matchLineup.asp` y `matchOrders.asp`, S16/S17), **dos** conceptos numéricos distintos para posición, ambos citables:

- **`RoleID`** (1–21): *"An integer indicating which formal 'slot' (Role) the player has filled in the match... there can only be one (or zero) player with a particular RoleID."* Escala: 1=Keeper, 2=Right back, 3=Central Defender 1, 4=Central Defender 2, 5=Left Back, 6=Right winger, 7=Inner Midfield 1, 8=Inner Midfield 2, 9=Left winger, 10=Forward 1, 11=Forward 2, 12–16=Suplente (por línea), 17=Set Pieces, 18=Captain, 19–21=Replaced player 1/2/3.
- **`PositionCode`** (1–11 únicamente): *"An integer indicating the position the player played at, after repositioning (behaviour) has been taken into account... there can be several players with PositionCode 10 (Forward 1)."* Solo cubre las 11 posiciones de campo, sin suplentes ni capitán.

**Ninguna de las dos escalas oficiales coincide con los valores observados en `LastMatch_PositionCode` del `.hrf`** (100, 101, 102, 103, 105–113 en nuestras dos muestras reales): la magnitud (cientos, no unidades) y la cantidad de valores distintos observados (14) no calzan con ninguna tabla oficial (11 o 21 valores, empezando en 1).

Además, se revisó específicamente la documentación oficial de `players.asp` (S15) — el endpoint CHPP más cercano por contenido a los datos de jugador que expone el `.hrf` — y **no menciona ningún campo `LastMatch_*` en absoluto**. El grupo `LastMatch_*` completo (`LastMatch_Date`, `LastMatch_Rating`, `LastMatch_id`, `LastMatch_PositionCode`, `LastMatch_PlayedMinutes`, `LastMatch_RatingEndOfGame`, `LastMatch_Type`) es una construcción propia del formato `.hrf`, que —como ya establece este documento desde la Revisión 1— no tiene especificación oficial publicada por Hattrick.

**Conclusión: el significado de `LastMatch_PositionCode` permanece desconocido.** No se le asigna significado. La coincidencia de nombre con el `PositionCode` oficial de CHPP es sugerente pero no suficiente — los rangos de valores no coinciden, y ninguna fuente oficial documenta el campo del `.hrf` en sí. Resolver esto definitivamente requeriría evidencia empírica (cruzar `LastMatch_PositionCode` contra las posiciones ya confirmadas en `[lineup]`/`[lastlineup]` para el mismo jugador y partido) — deliberadamente **fuera de alcance** de esta investigación, que se limitó a fuentes oficiales por instrucción explícita.

**Hallazgo colateral, sin resolver (mismo viaje de investigación):** S16/S17/S18 también documentan oficialmente un `MatchType` con escala 1–12 (1=Liga, 2=Clasificación, 3=Copa, 4=Amistoso normal, 5=Amistoso con reglas de copa, 6=reservado, 7=Hattrick Masters, 8–9=Amistoso internacional, 10–11=Selección nacional, 12=Amistoso de selección). El campo del `.hrf` `LastMatch_Type` (valores observados: 0, 1, 4) **tampoco calza** con esta escala oficial (que empieza en 1, no en 0) — mismo patrón que `LastMatch_PositionCode`: nombre parecido, rango de valores distinto. Se deja anotado como pendiente, sin investigar más a fondo por estar fuera del alcance de esta historia (que pidió específicamente `LastMatch_PositionCode`).

### Campos exclusivos del bloque "entrenador" (`[player512205178]`) — actualización (S10)

| Campo | Significado | Confianza |
|---|---|---|
| `TrainerType` | Hipótesis: actitud táctica del entrenador | 🔵 — Hattrick confirma oficialmente (S10) que existen exactamente **tres tipos de entrenador**: *Neutral Coach, Offensive Coach, Defensive Coach*, cada uno con efectos porcentuales documentados en ataque/defensa. El campo `TrainerType=2` observado cabría en una enumeración de 3 valores, pero no hay fuente oficial que confirme el orden exacto de la numeración (¿0=Neutral, 1=Offensivo, 2=Defensivo, o algún otro orden?) |
| `TrainerSkillLevel` | Nivel de habilidad de entrenamiento del entrenador (*Training Skill*) | ✅ — S10 confirma que la habilidad de entrenamiento del entrenador usa la misma escala "Form/Leadership/Coach Skills" (1–8) documentada en S2; el valor observado (3) cabe en ese rango, y el propio Manual describe textualmente esta habilidad como *"the most important ability for a coach"* |
| `TrainerStatus`, `ContractDate` | — | `TrainerStatus`: ❓ sin evidencia oficial. `ContractDate`: ✅ autoevidente |

**Hallazgo sin resolver, ahora más preciso gracias a la verificación:** `[club].hjTranare=4` y `[player512205178].TrainerSkillLevel=3` **no coinciden numéricamente**, pese a que ambos podrían, en principio, describir la habilidad del mismo entrenador. Con la nueva evidencia (S6 confirma que "Assistant Coach" es un rol de personal *distinto* del entrenador principal, con su propia escala 0–5), la hipótesis más consistente es que `hjTranare` **no** es la habilidad del entrenador principal, sino la de sus asistentes — lo que explicaría la discrepancia sin contradicción. Sigue sin confirmarse oficialmente.

---

## [xtra] — Fechas del ciclo semanal y metadatos varios

Sin cambios: no se encontró documentación oficial (Manual/Wiki/Developer Blog) de los campos `DailyUpdate1`–`DailyUpdate5`, `LeagueLevelUnitID`, ni de la semántica exacta del ciclo. Se mantienen como ❓ Desconocido, siguiendo la instrucción de no asignarles significado. Las redundancias ya confirmadas por comparación interna (`CountryId`≈`countryID`, `TrainerID`/`TrainerName`≈bloque del jugador entrenador, `ArrivalDate`≈`activationDate`) siguen ✅.

---

## [lastlineup] — Última alineación realmente jugada

Sin cambios de fondo respecto a la Revisión 1. La distinción estructural entre el vocabulario de `[lineup]` y `[lastlineup]`, y la naturaleza condicional del grupo `subst0*`, siguen confirmadas por evidencia interna directa (✅), sin necesidad de fuente externa porque son hechos observables en la comparación de los dos archivos, no conceptos de juego a verificar.

---

## [staff] — Cuerpo técnico

**Actualización (S6):** confirmado oficialmente que cada especialista tiene "Skill Level" de 1 a 5, y que el número total de especialistas contratables simultáneamente está limitado a 4 (2 de ellos pudiendo ser Asistentes de Entrenador). Esto no cambia la clasificación de `staffNStaffType` (sigue ❓, sin tabla oficial de códigos encontrada), pero sí permite anotar con fuente oficial qué roles son posibles en principio: Assistant Coach, Medic, Form Coach, Sports Psychologist, Financial Director, Tactical Assistant, más el "Secretary" descrito como personal voluntario no oficial de especialista (*"Secretary is a volunteer staff that reports on latest game news"*, S6).

| Campo | Significado | Confianza |
|---|---|---|
| `staffNName`, `staffNStaffId`, `staffNStaffLevel`, `staffNCost` | Autoevidentes | ✅ |
| `staffNStaffType` | Código de rol del especialista — 6 roles posibles oficialmente documentados (S6), pero sin tabla oficial que mapee el código numérico a cada uno | ❓ — se retira la hipótesis de la Revisión 1 que vinculaba el cambio de `staff2` con la contratación de un psicólogo; **esa correlación queda como observación interna sin confirmación oficial**, no como hecho |

---

## Resumen de cambios de esta revisión

**Subieron a ✅ Confirmado (con fuente oficial citada):**
`stamningValue`/`stamning` (Team Spirit), `sjalvfortroendeValue`/`sjalvfortroende` (Confidence), `gentleness` (Agreeability), `honesty` (Honesty), `Aggressiveness` (Aggressivity), `speciality`/`specialityLabel` (7 especialidades oficiales), `sal` (fórmula salarial oficial), `TrainerSkillLevel` (escala Coach Skills), `styleOfPlay` (concepto + correlación interna con `tacticalAssistantLevels`), `psykolog`, `presstalesman` (explicado por su eliminación oficial en 2015), `lakare`, `financialDirectorLevels`, `formCoachLevels`, `tacticalAssistantLevels`.

**Quedaron en 🔵 (concepto oficial confirmado, campo sin confirmar):**
Las 8 abreviaturas de habilidad + `rut` (Experience) + `for` (Form) permanecen sin poder confirmarse como campo específico — aunque los 10 conceptos detrás de ellas sí están oficialmente documentados. También `ska` (concepto de lesión confirmado, detalle de `-1` no), `led` (Leadership confirmado, campo abreviado no), `mkt` (Market Value existe pero no se distingue de TSI para este campo), `TrainerType` (3 tipos de entrenador confirmados, orden numérico no), `LastMatch_PositionCode` (concepto de RoleID confirmado por CHPP, tabla numérica no), `hjTranare` (rol Assistant Coach confirmado, pero discrepancia numérica sin resolver con `TrainerSkillLevel`).

**Se retiraron explícitamente hipótesis previas por falta de respaldo oficial (ahora ❓ Desconocido, sin significado asignado):**
`gev`, `gtl`, `gtc`, `gtt`, `hat`, `rating` (jugador), `staffNStaffType` (correlación con contratación de psicólogo retirada), `matchtyp`, `LastMatch_Type`, `TrainerStatus`, `DailyUpdate1`–`DailyUpdate5`, `installning`, `order_*`.

**Sigue pendiente y no puede resolverse sin más evidencia (HRF de otro club, u otra fuente):**
Codificación de caracteres exacta; equipo juvenil sin datos de muestra; ningún campo de "potencial" de jugador — confirmado por ausencia, no por documentación.
