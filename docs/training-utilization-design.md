# Diseño: "¿Mi entrenamiento fue aprovechado esta semana?"

**Estado: investigación cerrada, funcionalidad retirada del backlog de implementación (D-020).** No implementada y no planificada hasta que se resuelva alguno de los dos bloqueos identificados abajo (documentación oficial nueva sobre `LastMatch_PositionCode`, o una fuente de datos distinta como CHPP). Se conserva como registro de la investigación, no como diseño pendiente de aprobar.

**Nota exploratoria, no prioritaria, sin investigar a fondo:** CHPP (`matchLineup.asp`, ya citado en `hrf-data-dictionary.md`) sí documenta oficialmente `PositionCode` (1–11) por jugador y por partido — esto resolvería directamente el Bloqueo 2 (posición jugada) si el sistema alguna vez consumiera CHPP en vez de (o junto con) HRF. No resuelve el Bloqueo 1 (minutos por semana): esa página no incluye minutos jugados; probablemente habría que derivarlos de los eventos del partido (`live.asp`, sustituciones) por cada partido de la semana (`matchesArchive.asp` para listarlos), sumando varias llamadas — no un solo campo. Requiere además ser desarrollador CHPP autorizado. Queda anotado para retomar si esta funcionalidad se revive con evidencia concreta de necesidad.

## Propósito

Diseña el mínimo necesario para responder esta pregunta usando **únicamente** información confirmada del HRF y reglas oficiales de Hattrick ya citadas con fuente. No se implementa nada en este documento. Donde una regla necesaria no estaba documentada en el proyecto, se investigó ahora en la Wiki oficial (mismo método de Sprint 0) y se cita aquí por primera vez.

---

## Revisión de la documentación existente

- **`Product.md`** (sección "Training"): pide "detectar jugadores entrenados", "detectar minutos faltantes", "calcular minutos restantes", "optimizar liga + amistoso", "prevenir desperdicio de entrenamiento". No define la mecánica de Hattrick detrás de esas palabras.
- **`canonical-domain-model.md`**: define `ClubTrainingSnapshot` (foco de entrenamiento, % de resistencia) y `PlayerMatchPerformance` (minutos jugados por partido), pero explícitamente como snapshot histórico — no resuelve qué regla de negocio aplica.
- **`hrf-data-dictionary.md`**: confirma `LastMatch_PlayedMinutes` como ✅ ("autoevidente por nombre de campo"), y dos campos relevantes pero **no** confirmados: `LastMatch_PositionCode` (🔵 — CHPP confirma el concepto de "RoleID" pero no la tabla numérica) y `[team].trType` (✅, ya en español, ej. "Jugadas").
- **`hrf-mapping-strategy.md`**: no menciona reglas de entrenamiento — solo el mapeo campo→contrato ya conocido.

**Ninguno de los quince hallazgos de Sprint 0 (S1–S15) investigó la mecánica de entrenamiento.** No había una regla ya escrita en el proyecto para responder la pregunta del manager — había que conseguirla.

---

## Investigación nueva (Wiki oficial, citada por primera vez)

Fuente: [wiki.hattrick.org/wiki/Training](https://wiki.hattrick.org/wiki/Training)

Citas textuales relevantes:

> "Only players who played on certain positions are trained and only player fielded for 90 minute are fully trained, as training is minute based."

> "If a player has seen no 'live action' during the week, he will not train at all."

> "a player can receive a maximum of 90 minutes training per week. If a player plays more than 90 minutes in a trainable position, he will get the most beneficial 90 minutes only."

> "It doesn't matter if the player plays in a friendly game, a cup match or a league game - they're all just as effective from a training point of view."

**Reglas oficiales confirmadas, ahora citables:**
1. El entrenamiento es semanal y se basa en minutos jugados, con un **tope de 90 minutos por semana** — jugar más no da más entrenamiento.
2. Jugar **menos** de 90 minutos da entrenamiento proporcionalmente menor.
3. Un jugador **sin ningún minuto jugado en la semana** no entrena nada.
4. El tipo de partido (liga, copa, amistoso) no afecta la efectividad — todos cuentan igual.
5. **El entrenamiento también depende de la posición jugada** — cada tipo de entrenamiento (Playmaking, Defending, etc.) beneficia principalmente a ciertas posiciones; jugar en una posición no relacionada da un efecto menor o nulo.

---

## Por qué no se puede responder la pregunta completa, con evidencia

**Limitación 1 — el HRF solo expone el último partido, no la semana completa.**
`LastMatch_PlayedMinutes` es un único partido. La regla oficial habla de minutos **acumulados en la semana**. Si un jugador jugó liga y amistoso en la misma semana, el HRF de hoy no permite sumar ambos — solo vemos el más reciente. Cualquier cálculo con este único campo es, en el mejor de los casos, un **piso** (mínimo garantizado), nunca el total real.

**Limitación 2 — la regla de posición no se puede aplicar con los datos que tenemos.**
La Wiki confirma que la posición jugada importa. Se investigó específicamente el significado de `LastMatch_PositionCode` (historia posterior, solo fuentes oficiales) y la conclusión quedó cerrada en `hrf-data-dictionary.md`: **su significado es desconocido** — Hattrick documenta oficialmente dos escalas de posición distintas (`RoleID` 1–21 y `PositionCode` 1–11, ambas en CHPP), pero ninguna coincide con los valores observados en el `.hrf` (100–113), y el grupo `LastMatch_*` no tiene especificación oficial propia. **No se puede determinar si la posición jugada corresponde al tipo de entrenamiento actual.** Implementar esa parte de la regla seguiría siendo inventar una traducción no confirmada.

**Consecuencia:** el diseño que sigue responde una versión **honesta pero parcial** de la pregunta — basada solo en minutos del último partido registrado, marcada explícitamente como un piso, sin considerar todavía si la posición jugada era una posición entrenable.

---

## Diseño propuesto (mínimo, sin nuevas entidades de dominio)

Mismo patrón que `teamStatus` en la historia anterior: información de la corrida actual dentro de `ImportResult`, no una Entity nueva (`Player` sigue sin construirse — sería una expansión de dominio, no la pregunta que se pidió responder).

### En `HrfAdapter` (traducción cruda, sin juicio)

Nuevo método `toPlayerMinutes(sections)`, que recorre las secciones `[player<ID>]` (excluyendo al entrenador, mismo criterio ya usado en `countPlayers`) y devuelve, por jugador:

```
PlayerMinutesContract
├── playerId: string       (el ID de la sección)
├── playerName: string     (entries.name)
└── lastMatchMinutesPlayed: number | ausente   (entries.LastMatch_PlayedMinutes, ausente si el campo no está o está vacío)
```

Nombres canónicos, no crudos — mismo criterio que ya corregiste para `teamStatus`.

### En `ImportHrfUseCase` (aplicación de la regla oficial ya citada)

Clasifica cada jugador según la regla confirmada arriba (nada más):

```
TrainingUtilizationLevel = uno de:
├── FullyUtilized       (lastMatchMinutesPlayed >= 90)
├── PartiallyUtilized   (0 < lastMatchMinutesPlayed < 90)
└── PossiblyUnutilized  (lastMatchMinutesPlayed = 0 o ausente)

PlayerTrainingUtilization
├── playerId, playerName, lastMatchMinutesPlayed (igual que arriba)
└── level: TrainingUtilizationLevel
```

`PossiblyUnutilized` lleva **"Possibly"** en el nombre a propósito: por la Limitación 1, no podemos afirmar que el jugador no entrenó — solo que no hay evidencia de que sí, en este único partido registrado.

### En el reporte (`analyze.ts`) — la recomendación, no solo el dato

En vez de listar los ~20 jugadores, se muestra lo accionable primero:

```
Entrenamiento:
18 de 20 jugadores llegaron al tope semanal de entrenamiento (90+ min. en su último partido)
2 jugadores con posible entrenamiento desaprovechado:
  - Fulano de Tal (0 min. en su último partido registrado)
  - Mengano Pérez (sin partido reciente registrado)
```

Si no hay ningún jugador en `PossiblyUnutilized`, se omite esa segunda parte (no se inventa una lista vacía con encabezado).

---

## Lo que este diseño NO afirma, explícitamente

| No afirma | Por qué |
|---|---|
| Que un jugador "PossiblyUnutilized" definitivamente no entrenó | Podría haber jugado otro partido esta semana no reflejado en `LastMatch_*` (Limitación 1) |
| Que un jugador "FullyUtilized" aprovechó el entrenamiento **del tipo actual** (`trType`) | No sabemos si jugó en una posición entrenable para ese tipo (Limitación 2 — `LastMatch_PositionCode` sin confirmar) |
| Minutos totales de la semana | Solo tenemos el último partido, no un acumulado |
| Nada sobre los 10 campos de habilidad (`for`, `uth`, etc.) | Esta pregunta se responde entera con `LastMatch_PlayedMinutes`, ✅ confirmado desde Sprint 0 — no reabre D-019 |

---

## Pendiente de tu confirmación antes de implementar

1. ¿Aceptás esta versión parcial (piso de minutos del último partido, sin considerar posición) como primera entrega, con las limitaciones explícitas de arriba?
2. ¿El umbral de "recomendación accionable" te parece bien tal cual (mostrar solo la lista de `PossiblyUnutilized`, con el conteo agregado de los demás), o preferís otro formato?
3. Investigar la tabla de `LastMatch_PositionCode` (para poder aplicar la Limitación 2 más adelante) — ¿lo dejamos como pregunta abierta para una historia futura, o te interesa que lo investigue ahora también?

No se ha escrito ninguna línea de implementación.
