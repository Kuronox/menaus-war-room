# Comparación: `playerexport.csv` (Hattrick Organizer) vs. HRF

## Propósito

Compara el export CSV de jugadores de Hattrick Organizer (`E:\basura\playerexport.csv`, 21 jugadores + entrenador, mismo club Menaus) contra el HRF ya analizado (`3301513-2026-09-03.hrf`), columna por columna, para decidir si merece un `HOCsvAdapter` independiente. Sin implementación — es análisis puro.

**Metodología:** cada cifra clave se verificó releyendo el `.hrf` real (no de memoria) contra 3 jugadores (Rago, Bossers, Ayala — incluyendo un portero para validar `mlv`) y el bloque del entrenador (para el caso de datos ausentes).

---

## Hallazgo principal: el CSV no aporta ningún dato que el HRF no tenga ya

Las 45 columnas del CSV se agrupan en tres categorías, sin excepción:

1. **Renombrado de un campo HRF ya disponible** (24 columnas) — mismo valor, otro nombre.
2. **El mismo campo HRF, con más decimales** (2 columnas confirmadas: `LA`, `JU`).
3. **Una tabla calculada por Hattrick Organizer, no un dato de Hattrick** (19 columnas — la matriz de valoración por posición).

**Cero columnas caen en "no existe en HRF".** Todo lo que el CSV muestra, o ya está en el `.hrf`, o lo calcula el propio HO a partir de él.

---

## Tabla de clasificación

| Columna CSV | Campo HRF | Categoría | Evidencia |
|---|---|---|---|
| Nombre | `name`/`firstname`/`lastname` | 2 | Igual, salvo que el CSV **corrige** el bug "null " del entrenador (HRF: `name=null Daniel Aguinaga`; CSV: `"Daniel Aguinaga"`) — HO limpia ese defecto conocido |
| ID | nombre de sección `[player<ID>]` | 2 | Idéntico, era parte del nombre de sección, no un campo |
| Posición actual | `PlayerNumber` | 2 | **Nombre engañoso**: no es la posición táctica, es el dorsal. Verificado exacto (Rago=4, Bossers=9, Ayala=1) |
| Edad | `ald` | 2 | Exacto |
| Edad Dias | `agedays` | 2 | Exacto |
| TSI | `mkt` | 2 | **Exacto** (Rago 2290=2290, Bossers 5060=5060, Ayala 2190=2190) — ver nota abajo |
| Salario | `sal` | 2 | Exacto |
| Amonestado | `warnings` | 2 | Exacto |
| Lesionado | `ska` | 2 (con matiz) | Formato "+N" ya confirmado como convención oficial de Hattrick (Wiki: *Injury*) — pero para el entrenador, HRF trae `ska=` (vacío) y el CSV muestra `"+0"`: **HO inventa un valor donde el HRF no tiene ninguno** |
| CM | `homegr` | 2 | `♥`=True, vacío=False, exacto en los 21 jugadores |
| Carácter | `gentlenessLabel` | 1 | Valor idéntico, ya en español en el HRF |
| Agresividad | `AggressivenessLabel` | 1 | Idéntico |
| Honestidad | `honestyLabel` | 1 | Idéntico |
| Especialidad | `specialityLabel` | 1 | Idéntico |
| EX | `rut` | 2 | Exacto (Rago 2=2, Bossers 3=3, Ayala 3=3) |
| LI | `led` | 2 | Exacto (Rago 3=3, Bossers 4=4, Ayala 3=3) |
| Forma | `for` | 2 | Exacto |
| CON | `uth` | 2 | Exacto |
| FI | `loy` | 2 | Exacto |
| POR | `mlv` | 2 | Exacto — confirmado también con un portero (Ayala: mlv=6, POR=6.0) |
| DE | `bac` | 2 | Exacto |
| LA | `ytt` | **3** | Coincide en la parte entera, pero el CSV trae 3 decimales (Rago: ytt=4 → LA=4.096; Bossers: ytt=5 → LA=5.032) |
| JU | `spe` | **3** | Mismo patrón (Rago: spe=5 → JU=5.029; Bossers: spe=4 → JU=4.333) |
| PA | `fra` | 2 | Exacto, sin decimales adicionales en esta muestra |
| AN | `mal` | 2 | Exacto |
| BP | `fas` | 2 | Exacto |
| POR, DC, DC O, DC L, DL, DL O, DL D, DL M, MED, MED O, MED D, MED L, EXT, EXT O, EXT D, EXT M, DEL, DEL D, DEL L (19 columnas) | — | **5** | Matriz de valoración estimada por posición y comportamiento (Normal/Ofensivo/Defensivo/hacia el medio, etc. — coincide con el `Behaviour` oficial de CHPP). No es un dato de Hattrick: es un cálculo propio de HO a partir de las 8 habilidades |

---

## Dos hallazgos que van más allá de la tarea pedida, y que dejo señalados sin actuar sobre ellos

**1. Esta comparación resuelve empíricamente el mapeo de los 10 campos protegidos por D-019 — pero no oficialmente.**

Los nombres de columna de HO (`POR`, `DE`, `LA`, `JU`, `PA`, `AN`, `BP`, `Forma`, `CON`, `FI`, `LI`, `EX`) coinciden, campo por campo y valor por valor contra los 3 jugadores verificados, exactamente con la hipótesis de Sprint 0:

`mlv`=Portería, `bac`=Defensa, `ytt`=Banda, `spe`=Jugadas, `fra`=Pase, `mal`=Definición, `fas`=Balón Parado, `for`=Forma, `uth`=Resistencia, `loy`=Fidelidad, `led`=Liderazgo, `rut`=Experiencia.

**Esto es evidencia de consenso comunitario (nivel 5 del "Hattrick First Principle" de `CLAUDE.md`), no documentación oficial.** HO es una herramienta de la comunidad, no Hattrick — su propia convención de nombres podría arrastrar el mismo error que cualquier otra fuente no oficial. **No cambio D-019 con esto.** La condición de resolución que ya fijamos (verificar contra la pantalla de habilidades dentro del juego, campo por campo) sigue siendo la única vía aceptada — mencionar esto es informar, no proponer saltármela.

**2. `TSI` en el CSV confirma que `mkt` es el Total Skill Index, no el Valor de Mercado.**

`hrf-data-dictionary.md` dejó esto como pregunta abierta ("¿Es `mkt` el Valor de Mercado o el TSI?"). El propio HO lo etiqueta "TSI" y el valor coincide exacto. Sigue siendo evidencia de nivel 5 (comunidad), no oficial — lo señalo, no lo doy por resuelto en la documentación sin tu confirmación.

---

## Recomendación: no construir `HOCsvAdapter`

**No aporta ninguna fuente de información nueva.** Es el mismo club, la misma semana, exportado dos veces por la misma herramienta (HO) a partir del mismo `.hrf` — no una fuente independiente como CHPP o entrada manual. Construir un adaptador seguiría exactamente D-008/D-015 en su forma, pero traduciría un archivo que ya es, en esencia, una vista derivada del archivo que `HrfAdapter` ya sabe leer.

**La única ganancia real y confirmada** es la precisión decimal de `ytt`/`spe` (categoría 3) — pero:
- Solo se observó en 2 de las 8 habilidades en esta muestra; no se investigó si las demás también la tienen con otros jugadores.
- Esas dos habilidades siguen dentro del alcance protegido por D-019 — no hay ninguna funcionalidad hoy que consuma su valor entero, mucho menos su decimal.
- Es exactamente el tipo de capacidad que D-018 pide no anticipar sin una necesidad real ya identificada.

**Conclusión:** el CSV no merece un adaptador propio hoy. Si en el futuro el proyecto necesita precisión decimal de habilidades (p. ej. para detectar progreso de entrenamiento sub-nivel, algo que el `.hrf` no puede dar por diseño), ese sería el momento de reconsiderar esto — con esa necesidad concreta ya en la mano, no antes.
