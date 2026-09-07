# Diseño: "Comparación entre dos HRF"

## Propósito

Diseñar la historia que responde la pregunta del manager "¿cómo cambió mi club entre la semana pasada y esta semana?", reutilizando exclusivamente lo ya implementado (`ImportHrfUseCase`, `Club`, `TeamStatusContract`, `FinancialHealthContract`, `LeagueStatusContract`). No se escribe código en este documento — es la aplicación directa de la restricción ya fijada en **D-021**.

---

## Restricción de partida (D-021) y cómo la respeta este diseño

D-021 exige, para cualquier diseño de comparación, que:

1. `pnpm analyze <archivo>` (un solo HRF) siga siendo un caso de uso permanente e independiente — **no se toca `analyze()` en absoluto** en este diseño; se agrega una función nueva al lado, no se modifica la existente.
2. La comparación sea un caso de uso **separado**, construido sobre dos análisis individuales — no una reescritura del actual.
3. La comparación reutilice `HrfFileReader`, `HrfSectionParser` y `HrfAdapter` **tal cual son**, sin un segundo parser ni un segundo adaptador.
4. Antes de que exista persistencia, la comparación puede tomar dos rutas de archivo directamente del manager.
5. La lógica de comparación no deba cambiar el día que exista persistencia — solo cambiaría de dónde sale "el HRF anterior".

Este diseño cumple los cinco puntos: la única entrada a Infraestructura sigue siendo `ImportHrfUseCase.execute(filePath)`, llamado dos veces (una por archivo); la comparación en sí se construye **exclusivamente a partir de los dos `ImportResult`** que ya produce ese caso de uso, sin volver a tocar secciones ni archivos crudos. El día que haya un `ImportBatch` persistido, lo único que cambiaría es de dónde sale el segundo `ImportResult` — la función de comparación no se enteraría de la diferencia.

---

## Entrada: cómo el manager indica "anterior" y "actual"

`pnpm analyze` pasa a aceptar **una o dos** rutas de archivo:

```
pnpm analyze <archivo.hrf>                     # ya existe, sin cambios (D-021 §1)
pnpm analyze <hrf-anterior.hrf> <hrf-actual.hrf>   # nuevo
```

El orden es puramente posicional: el primer argumento es "anterior", el segundo es "actual". **No se infiere nada de los nombres de archivo** — aunque los dos HRF de ejemplo del proyecto ya traen una fecha en el nombre (`3301513-2026-08-28.hrf`, `3301513-2026-09-03.hrf`), esa convención de nombre no está documentada ni confirmada como estable, y basarse en ella violaría el principio de "nunca inventar". Es el manager quien decide el orden con la posición de los argumentos.

Pasar el mismo archivo dos veces es un caso válido, no un error: produce una comparación de un HRF contra sí mismo (todos los deltas en cero, ningún campo "cambió"). No se agrega ninguna validación especial para ese caso — es simplemente aritmética correcta.

---

## Arquitectura propuesta

```
Presentation                         Application                    Infrastructure
─────────────                        ───────────                    ──────────────
compareHrf(prevPath, curPath)
  ├─ ImportHrfUseCase.execute(prevPath) ──────────────────────────→ HrfFileReader
  ├─ ImportHrfUseCase.execute(curPath)  ──────────────────────────→ HrfSectionParser
  │                                                                  HrfAdapter
  ├─ compareImportResults(previous, current)
  │     (función pura, Application, sin I/O)
  │
  └─ arma el reporte en español a partir de:
        - los dos ImportResult crudos (para mostrar fallos de importación, si los hay)
        - el ComparisonResult (para las líneas de comparación)
```

**Dos piezas nuevas, ninguna abstracción de dominio nueva:**

1. `backend/src/application/compare-import-results.ts` — función pura `compareImportResults(previous: ImportResult, current: ImportResult): ComparisonResult`. Vive en Application, igual que `ImportResult` mismo; no importa nada de Infraestructura salvo los tipos de Contract ya existentes (mismo patrón que ya usa `import-result.ts` al importar `TeamStatusContract` etc. de `hrf-adapter.ts` solo como tipos).
2. `backend/src/presentation/compare-hrf.ts` — función `compareHrf(previousPath: string, currentPath: string)`, misma forma de retorno que `analyze()` (`{ lines: string[]; failed: boolean }`) para que `main()` los trate de forma simétrica. Reutiliza los helpers de formato ya existentes en `analyze.ts` (`formatAmount`, `formatSignedAmount`, `formatStep`, `formatWarning`, `STEP_LABELS`, `ERROR_MESSAGES`, `WARNING_MESSAGES`), que pasan a exportarse desde ese archivo — no se duplica ni se reescribe ninguno.

`main()` en `analyze.ts` solo agrega el `if` de despacho:

```
argv[3] presente  → compareHrf(argv[2], argv[3])
argv[3] ausente   → analyze(argv[2])   // exactamente como hoy
```

---

## `compareImportResults`: qué hace y qué no hace

Su único trabajo es decidir **si la comparación es posible** y, si lo es, empaquetar los pares `{previous, current}` de cada contrato — no calcula deltas ni formatea nada en español. El cálculo de diferencias (resta, "cambió"/"sin cambios") queda en Presentation, exactamente donde ya vive `formatAmount`/`formatSignedAmount` para el reporte individual. Esto mantiene la misma división de responsabilidad que ya existe: Application = datos estructurados en inglés, Presentation = texto e interpretación visual en español.

### Tipos propuestos (mismo estilo que `import-result.ts`)

```
ComparisonErrorCode:
  PreviousImportFailed   — el ImportResult "anterior" tuvo succeeded=false
  CurrentImportFailed    — el ImportResult "actual" tuvo succeeded=false
  ClubMismatch           — ambos importaron bien, pero club.id difiere

ComparisonWarningCode:
  TeamStatusComparisonUnavailable        — falta teamStatus en alguno de los dos lados
  FinancialHealthComparisonUnavailable   — falta financialHealth en alguno de los dos lados
  LeagueStatusComparisonUnavailable      — falta leagueStatus en alguno de los dos lados

ComparisonResult:
  succeeded: boolean
  errorCode?: ComparisonErrorCode        // solo si succeeded=false
  club?: { id: string; name: string }
  teamStatus?: { previous: TeamStatusContract; current: TeamStatusContract }
  financialHealth?: { previous: FinancialHealthContract; current: FinancialHealthContract }
  leagueStatus?: { previous: LeagueStatusContract; current: LeagueStatusContract }
  warnings: ComparisonWarning[]
```

Nótese que reutiliza los `*Contract` ya existentes tal cual — no se crean interfaces de "delta" genéricas (`FieldComparison<T>` o similar): eso sería exactamente el tipo de abstracción anticipada que D-018 pide evitar hasta que un caso concreto la exija, y aquí no hace falta — con `{previous, current}` alcanza.

### Reglas de comparabilidad

Misma jerarquía que ya existe en `ImportResult` (errores detienen, warnings no):

- Si `previous.succeeded === false` → `ComparisonResult.succeeded = false`, `errorCode = PreviousImportFailed`. No se produce ningún bloque.
- Si `current.succeeded === false` (y el anterior sí importó) → `errorCode = CurrentImportFailed`.
- Si ambos importaron pero `previous.club.id !== current.club.id` → `errorCode = ClubMismatch`. Comparar dos clubes distintos no tiene sentido analítico y no se debe mostrar como si lo tuviera.
- Si ambos importaron, son el mismo club, pero a uno le falta `teamStatus` (o `financialHealth`, o `leagueStatus`) — **no se aborta la comparación entera**: ese bloque específico se omite y se agrega el `ComparisonWarning` correspondiente, igual que hoy un `ImportResult` puede tener éxito con warnings.

Presentation, ante `PreviousImportFailed`/`CurrentImportFailed`, no necesita que `compareImportResults` le repita el detalle: ya tiene el `ImportResult` original completo (con sus `steps`) y puede reutilizar el mismo `formatStep` que usa `analyze()` para mostrar exactamente por qué falló ese lado.

---

## Qué se compara por bloque, y cómo se expresa (sin inventar interpretación)

| Bloque | Campos | Tratamiento | Por qué |
|---|---|---|---|
| Club | `id`, `name` | Se valida igualdad, no se muestra "delta" — solo se usa para encabezar el reporte | La identidad del club no es algo que "cambie" entre dos HRF del mismo club |
| Estado del Equipo | `teamSpirit`, `confidence`, `trainingType` | `anterior → actual`, sin ninguna etiqueta adicional (ni "cambió" ni "sin cambios") | Son valores categóricos de texto (p. ej. "Jugadas" → "Defensa"); no existe una escala ordinal oficial confirmada para ellos, así que no se dice "mejoró"/"empeoró" — y, por instrucción explícita, tampoco se agrega una etiqueta derivada como "cambió"/"sin cambios": se muestran los dos valores tal cual y el manager saca su propia conclusión. Cuando ambos valores coinciden, se ven simplemente repetidos (p. ej. "serenos → serenos") — eso ya comunica "sin cambios" sin necesidad de una palabra extra |
| Finanzas | `cash`, `expectedCash`, `lastWeekBalance`, `currentWeekProjectedBalance` | `anterior → actual (delta con signo)`, reutilizando `formatSignedAmount` ya existente | Son números; la resta es aritmética, no interpretación |
| Liga | `division` | `anterior → actual`, mismo criterio que Estado del Equipo (sin etiqueta) | Igual que el equipo: no hay confirmación oficial de qué significa el identificador de serie en términos de nivel, así que no se etiqueta como "ascenso"/"descenso" ni siquiera como "cambió" |
| Liga | `position`, `points`, `matchesPlayed`, `goalsFor`, `goalsAgainst` | `anterior → actual (delta)` | Números directos del HRF; se muestra el delta sin juicio de valor ("mejor"/"peor") |

Ejemplo concreto de reporte, usando los dos HRF reales que ya usa el proyecto (`3301513-2026-08-28.hrf` como anterior, `3301513-2026-09-03.hrf` como actual):

```
====================================
MENAUS WAR ROOM — COMPARACIÓN
====================================

Archivo anterior:
3301513-2026-08-28.hrf

Archivo actual:
3301513-2026-09-03.hrf

Club:
Menaus
ID: 3301513

Estado del Equipo:
Moral: serenos → serenos
Confianza: Muy baja → Muy baja
Entrenamiento: Jugadas → Jugadas

Finanzas:
Efectivo actual: 15.105.114 → 15.367.994 (+262.880)
Efectivo esperado tras la próxima actualización: 15.367.994 → 16.921.294 (+1.553.300)
Balance de la semana pasada (cerrada): +258.635 → +262.880 (+4.245)
Balance proyectado de esta semana (en curso): +262.880 → +1.553.300 (+1.290.420)

Liga:
División: V.181 → V.181
Posición: 6 → 5 (-1)
Puntos: 3 → 6 (+3)
Partidos jugados: 5 → 6 (+1)
Goles a favor: 4 → 6 (+2)
Goles en contra: 12 → 12 (+0)

Tiempo de ejecución: XX.XX ms
====================================
```

Si alguno de los tres bloques no está disponible en algún lado, se omite del reporte y aparece en un bloque `Avisos:` idéntico en formato al que ya existe hoy (mismo símbolo `⚠`, mismo lugar en el reporte).

**Convención de formato, sin excepciones:**
- Campos numéricos: siempre `anterior → actual (delta con signo)`, reutilizando `formatSignedAmount` tal cual — incluido el caso sin cambio, que se muestra como `(+0)`, nunca como la palabra "sin cambios". Ningún número lleva una palabra de interpretación.
- Campos categóricos (`teamSpirit`, `confidence`, `trainingType`, `division`): siempre `anterior → actual`, sin ningún sufijo — ni "(cambió)" ni "(sin cambios)". Por instrucción explícita: no se agrega ninguna etiqueta derivada sobre estos campos, ni siquiera una neutra; se muestran los dos valores y el manager decide si cambiaron.

---

## Explícitamente fuera de esta historia

- **Persistencia / base de datos / `ImportBatch`** — las dos rutas siguen viniendo del manager por línea de comandos, como exige D-021 §4.
- **CHPP** — ninguna fuente de datos nueva.
- **Nuevas abstracciones de dominio** (`AggregateRoot`, `DomainEvent`, `Result<T>`, Import Port) — no se toca ninguna.
- **Comparación de más de dos archivos** / historial — D-021 lo previó como una extensión futura, no parte de esta historia.
- **Cualquier interpretación de si un cambio es bueno o malo** (moral, confianza, división, posición) — se muestra el hecho, nunca el juicio.
- **Jugadores, lesiones, sanciones** — no hay contrato implementado para esos datos todavía; no se agregan aquí.

---

## Plan de tests (sin escribir código todavía)

- `compare-import-results.spec.ts` (Application, sin archivos reales, `ImportResult` construidos a mano): caso feliz con los tres bloques presentes; `previous` falló; `current` falló; `ClubMismatch`; cada bloque (`teamStatus`/`financialHealth`/`leagueStatus`) faltante de forma aislada en un solo lado — replicando exactamente el patrón de aislamiento que agregamos recién para `LeagueStatusUnavailable`, para no repetir ese hueco aquí.
- `compare-hrf.spec.ts` (Presentation): caso feliz con los dos HRF reales del proyecto, verificando el texto exacto en español línea por línea; un archivo inexistente en cada posición; los dos HRF reales pasados en el mismo orden pero de clubes distintos (sintético, vía archivo temporal) para probar `ClubMismatch`; mismo archivo pasado dos veces (deltas en cero).

---

## Ajustes aprobados sobre la primera versión de este diseño

1. **Un único comando `pnpm analyze`**: con un archivo produce el reporte actual (sin cambios); con dos archivos produce el reporte comparativo. No se agrega un comando `pnpm compare` separado.
2. **`compareImportResults(previous, current)` sigue siendo una función pura en Application**, construida únicamente a partir de dos `ImportResult` — confirmado, sin cambios respecto a la primera versión de este documento.
3. **Los campos categóricos muestran `anterior → actual` sin ninguna etiqueta derivada** (ni "cambió" ni "sin cambios") — ver "Convención de formato" arriba. Ninguna inferencia ni juicio de valor adicional.

Diseño cerrado con estos tres ajustes incorporados. No se ha escrito ninguna línea de implementación ni de test todavía — a la espera de tu autorización explícita para comenzar.
