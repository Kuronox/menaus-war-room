# Investigación de capacidad: ¿qué campos de jugador ya están listos para una historia?

## Propósito

Antes de crear una entidad `Player`, inventariar **todos** los campos de `[player<ID>]` y clasificarlos por si ya pueden mostrarse o compararse sin depender de los diez campos protegidos por D-019 (`for`, `uth`, `spe`, `mal`, `fra`, `ytt`, `fas`, `bac`, `mlv`, `rut`). El objetivo no es documentar el HRF por documentarlo — eso ya lo hace `hrf-data-dictionary.md`, y esta investigación reutiliza sus niveles de confianza sin volver a derivarlos — sino **identificar la siguiente historia de mayor valor para el manager** entre lo que ya está listo.

No se escribió código. No se investigó ningún campo nuevo: toda la clasificación de confianza citada acá ya existía en `hrf-data-dictionary.md` (Revisión 2); lo nuevo de este documento es la pregunta "¿esto ya sirve para una funcionalidad, o no todavía, y por qué?"

---

## Los tres grupos

### Grupo A — Listos hoy (evidencia suficiente, sin depender de D-019)

| Campo(s) | Confianza | Por qué ya está listo |
|---|---|---|
| `name`, `firstname`, `lastname`, `ald`, `agedays`, `arrivaldate`, `homegr`, `CountryID`, `PlayerNumber`, `NationalTeamID`, `Caps`, `CapsU20` | ✅ | Identidad autoevidente, no son "conceptos de juego" que requieran verificación contra el Manual |
| `gentleness`, `honesty`, `Aggressiveness` | ✅ | Wiki oficial (S3, *Personality*) confirma los cuatro atributos de personalidad, y S2 publica escalas numéricas que coinciden exactamente con los rangos observados. Además, S3 y S11 dan **fórmulas oficiales de riesgo** directamente accionables: `honesty`/`Aggressiveness` predicen la probabilidad de tarjeta amarilla; `gentleness` predice el riesgo de fuga de moral del equipo al fichar o vender a ese jugador |
| `led` (Leadership) | 🔵 | Concepto oficial confirmado (S3); el campo es una abreviatura y la escala observada (1–5) no agota la oficial (0–7), así que la confianza es algo menor que las tres anteriores |
| `speciality` / `specialityLabel` | ✅ | Wiki oficial (S5) confirma exactamente 7 especialidades; los valores observados corresponden temáticamente a 5 de ellas |
| `sal` (salario) | ✅ | Manual (S13) confirma la fórmula oficial de salario, coherente con los órdenes de magnitud del archivo |
| `GoalsCurrentTeam`, `MatchesCurrentTeam` | ✅ | Autoevidentes por nombre de campo |
| `LastMatch_Date`, `LastMatch_Rating`, `LastMatch_RatingEndOfGame`, `LastMatch_PlayedMinutes`, `LastMatch_id` | ✅ | Autoevidentes / referencia externa |
| `ska` | 🔵 | Wiki oficial (S4) confirma el mecanismo general (cuenta regresiva en semanas, 0 = magullado/jugable); solo el detalle de que este archivo use `-1` para "sin lesión" es una convención no oficial del formato — el concepto central sí está confirmado |
| `warnings` | 🔵 | Sin página oficial dedicada al campo, pero el concepto de acumulación de amonestaciones hasta una sanción es central en las reglas del Manual — evidencia empírica de los tres `.hrf` (2→3→0, coherente con una sanción cumplida) corrobora el patrón |
| `TrainerSkillLevel`, `ContractDate` (solo entrenador) | ✅ | Confirmados contra la escala y la documentación oficial de personal técnico (S10) |

### Grupo B — Protegidos por D-019 (nunca se les asigna nombre, sin importar la evidencia informal)

`for`, `uth`, `spe`, `mal`, `fra`, `ytt`, `fas`, `bac`, `mlv`, `rut`. El **concepto** de cada una de las 8 habilidades entrenables de Hattrick está oficialmente confirmado (S1/S2/S8), pero la traducción "abreviatura sueca del `.hrf` → habilidad específica" sigue sin fuente oficial — ni siquiera la coincidencia con el CSV de Hattrick Organizer cambia esto (evidencia de nivel 5, comunidad, ya evaluada y descartada como promoción de confianza en `docs/ho-csv-comparison.md`). D-019 exige verificación manual dentro del propio juego antes de tocar esto. Ninguna historia de esta investigación depende de estos diez campos.

### Grupo C — No listos, por razones distintas a D-019

| Campo(s) | Por qué no está listo |
|---|---|
| `mkt` | 🔵 pero **ambiguo entre dos conceptos oficiales distintos** (Valor de Mercado vs. TSI) — el CSV de HO lo llama `"TSI"`, contradiciendo la hipótesis original de "Valor de Mercado". Mostrarlo con cualquiera de las dos etiquetas sería inventar cuál de las dos es |
| `gev`, `gtl`, `gtc`, `gtt`, `hat` | ❓ Desconocidos — hipótesis previas retiradas explícitamente, sin evidencia oficial |
| `rating` (valoración del último partido, -2 a 11) | ❓ No coincide con ninguna escala oficial encontrada |
| `LastMatch_PositionCode`, `LastMatch_Type` | ❓ Investigación ya cerrada (D-020) para el primero; el segundo quedó como hallazgo colateral sin resolver. Ninguno se retoma acá |
| `TrainerType` | 🔵 el concepto (3 tipos de entrenador) está confirmado, pero no el orden numérico exacto de la enumeración — mostrarlo como etiqueta sería inventar cuál de los tres es |
| `TrainerStatus` | ❓ Desconocido |

---

## Qué combinación del Grupo A habilita una historia real, y una observación empírica relevante

Repasé los tres `.hrf` reales para ver si los campos del Grupo A **cambian** semana a semana (si no cambiaran nunca, una funcionalidad de comparación no aportaría nada; si cambian, sí):

- `gentleness`, `honesty`, `Aggressiveness`, `led`, `speciality`: **sin excepción, exactamente el mismo valor en las tres semanas, para los 20 jugadores.** Son rasgos que no se movieron ni una vez en esta ventana — coherente con ser atributos fijos del jugador, no algo que fluctúe por resultados semanales (observación empírica de estos tres archivos, no una regla de juego que esta investigación confirme).
- `ska`, `warnings`: **sí cambian** semana a semana (la secuencia 2→1→0 de `ska` y el reinicio 2→3→0 de `warnings` ya documentados en `docs/three-snapshot-investigation.md`).

Esto tiene una consecuencia directa para qué construir primero: una funcionalidad sobre `gentleness`/`honesty`/`Aggressiveness`/`speciality` es igual de útil con **una sola importación** que con una comparación — no hace falta el comparador de HRF para que aporte valor, así que es la porción más pequeña y más alineada con D-018 (slice vertical mínimo). Una funcionalidad sobre `ska`/`warnings`, en cambio, tiene valor real tanto en una sola importación ("¿quién no puedo alinear hoy?") como comparada entre semanas ("¿a quién le cambió el estado esta semana?") — pero el primer paso natural también es de una sola importación.

---

## Historias candidatas identificadas, en orden de recomendación

1. **"¿Qué jugadores son un riesgo de tarjeta o de fuga de moral si los transfiero?"** — usa `honesty`, `Aggressiveness` (riesgo de amarilla, con tablas de probabilidad oficiales ya citadas en `hrf-data-dictionary.md`) y `gentleness` (riesgo de moral al fichar/vender, también con tabla oficial). Es la de mayor confianza (✅ en los tres campos, con fórmulas oficiales, no solo el concepto) y no requiere ninguna sección ni comparación nueva — una sola importación alcanza. Coherente con D-020: preferir menos funcionalidades con alta confianza.
2. **"¿Qué jugadores no puedo alinear esta semana?"** — usa `ska` (lesión activa) y `warnings` (riesgo de sanción). Confianza 🔵 pero con mecanismo general ya confirmado oficialmente; información directamente accionable para la alineación de la semana. También de una sola importación.
3. **(Más adelante, no ahora)** extender el comparador de HRF (v0.4.0) para que la historia 2 también muestre "qué cambió esta semana" jugador por jugador — tiene sentido recién una vez exista algún tipo de listado de jugadores en el reporte; no es la primera pieza a construir.

Ninguna de las tres historias necesita `mkt`, `TrainerType`, ni ningún campo del Grupo B o C.

---

## Pregunta de diseño abierta, deliberadamente no resuelta acá

Ambas historias candidatas necesitan iterar sobre una lista de jugadores — hoy no existe ninguna estructura de dominio para eso (`HrfAdapter.countPlayers()` solo cuenta, no expone datos por jugador). Si eso debería modelarse como una entidad `Player` con identidad, o como una lista de un `PlayerSummaryContract` sin entidad de dominio todavía (mismo patrón liviano que `TeamStatusContract`/`FinancialHealthContract`) es una decisión de diseño real, pero **no la estoy tomando en este documento** — corresponde al documento de diseño de la historia elegida, no a esta investigación de capacidad.

## Qué no cubre esta investigación

- No se investigó ningún campo nuevo — toda la clasificación de confianza viene de `hrf-data-dictionary.md`, Revisión 2.
- No se diseñó ninguna historia todavía — solo se identificaron candidatas y se las ordenó por evidencia disponible.
- No se tocó D-019 ni ninguna otra decisión — el Grupo B permanece exactamente como estaba.
