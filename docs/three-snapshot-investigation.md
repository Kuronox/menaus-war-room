# Investigación: comparación entre tres HRF reales (2026-08-28, 2026-09-03, 2026-09-10)

## Propósito

Antes de diseñar v0.5.0, comparar los tres HRF reales disponibles campo por campo (no solo los dos que ya usa el comparador) para: (1) confirmar qué ya sabíamos, (2) detectar qué **no podía verse con solo dos archivos**, y (3) decidir si el backlog actual sigue siendo el más valioso a la luz de la evidencia. No se escribió código para esta investigación — es puramente documental, siguiendo el mismo método que `docs/ho-csv-comparison.md` y el cierre de `LastMatch_PositionCode`: evidencia empírica citada como tal, nunca como hecho oficial, e hipótesis marcadas explícitamente como hipótesis.

Archivos usados: `data/hrf/3301513-2026-08-28.hrf` (semana 1, matchround 6), `-09-03.hrf` (semana 2, matchround 7), `-09-10.hrf` (semana 3, matchround 8). Mismo club (3301513, Menaus) en los tres.

---

## Resumen ejecutivo

El hallazgo más importante **contradice una afirmación ya escrita como "confirmado, exacto"** en `docs/financial-health-design.md`. Con solo dos archivos, `ExpectedCash`/`ExpectedWeeksTotal` parecían una proyección exacta del propio Hattrick. Con el tercero, esa proyección **falla por completo** en la transición semana 2 → semana 3. Esto cambia qué historia conviene construir a continuación — ver la sección de reordenamiento propuesto.

Además aparecieron dos patrones nuevos, visibles únicamente al tener tres puntos en vez de dos: un desfase de una semana entre un cambio de plantilla técnica y su reflejo en los costos, y una secuencia de tres valores consecutivos en un campo hoy sin significado asignado (`ska`) que sugiere — sin confirmarlo — una cuenta regresiva.

---

## 1. Qué permanece completamente estable en las tres semanas

Sin excepción, en los tres archivos:

- `[basics]`: `teamID`, `teamName`, `season`, `seasonOffset`, `countryID`, `leagueID`, `regionID`, `owner`, `activationDate`, `LastLeagueStatisticsMatchRound`/`Season` (siempre 0 — sin evidencia todavía de que este campo cambie alguna vez).
- `[league].serie`: `V.181` sin cambio, incluso tras la derrota de la semana 3.
- `[team]`: `trType` (`Jugadas`), `stamning` (`serenos`), `sjalvfortroende` (`Muy baja`), `trLevel` (100) — **ninguno de los tres campos que ya expone `TeamStatusContract` cambió en tres semanas seguidas**, ni tras la victoria de la semana 2 ni tras la derrota de la semana 3. Esto es evidencia empírica a favor de la decisión ya tomada de mostrar `anterior → actual` sin ninguna etiqueta ("cambió"/"sin cambios"): en la práctica, con datos reales, casi siempre se verían los dos valores repetidos, y eso ya comunica "no cambió" sin necesidad de una palabra.
- `[arena]`: capacidad, `RebuiltDate`, `ExpansionDate` — sin cambios (esperable, la arena no cambia por resultados semanales).
- El conjunto de secciones de nivel superior es idéntico en los tres archivos (mismas 24 secciones, mismos 20 jugadores + 1 entrenador). No aparece ni desaparece ninguna sección completa entre estas tres semanas.

## 2. Qué cambia de forma predecible (cadencia semanal)

- `matchround`: 6 → 7 → 8 (incrementa exactamente en 1 cada semana).
- `[league].spelade`: 5 → 6 → 7 (un partido más cada semana, consistente con `matchround`).
- `[xtra].TrainingDate`: siempre exactamente 7 días después de la fecha del archivo anterior.
- `[xtra].SeriesMatchDate`: también avanza exactamente 7 días cada semana, sin excepción.
- `[xtra].DailyUpdate1`–`DailyUpdate4`: las cuatro fechas se desplazan exactamente 7 días completos cada semana, manteniendo el mismo patrón relativo entre sí.

Esto confirma con un tercer punto lo que con dos ya se sospechaba: hay un grupo de campos de fecha con cadencia semanal estrictamente regular, útil como referencia de "qué tan seguido cambia esto" para cualquier futura funcionalidad basada en fechas.

## 3. Hallazgo principal: la "proyección financiera" no siempre se cumple

`docs/financial-health-design.md` afirmaba, basado en los dos primeros archivos (ya corregido tras esta investigación — ver `docs/expected-cash-investigation.md`):

> `ExpectedCash` de una semana = `Cash` real de la semana siguiente (confirmado, exacto).
> `LastWeeksTotal` de una semana = `ExpectedWeeksTotal` de la semana anterior (confirmado, exacto).

Con el tercer archivo, verifiqué las dos transiciones posibles:

| Transición | `ExpectedCash` (semana N) | `Cash` real (semana N+1) | ¿Coincide? |
|---|---|---|---|
| Semana 1 → 2 | 15.367.994 | 15.367.994 | ✅ Exacto |
| Semana 2 → 3 | 16.921.294 | 17.191.249 | ❌ Difiere en 269.955 |

| Transición | `ExpectedWeeksTotal` (semana N) | `LastWeeksTotal` (semana N+1) | ¿Coincide? |
|---|---|---|---|
| Semana 1 → 2 | 262.880 | 262.880 | ✅ Exacto |
| Semana 2 → 3 | 1.553.300 | 268.455 | ❌ Difiere en 1.284.845 (por un factor de ~5,8×) |

Es decir: de las dos transiciones que ahora podemos observar, **una se cumple exactamente y la otra falla por completo**. Con solo dos archivos era imposible saber si la coincidencia de la semana 1→2 era una regla general o una casualidad de esa semana en particular; con el tercero queda claro que **no es una regla general**.

**Pista sobre la causa, y por qué se investiga aparte:** en la semana 3, `IncomeSpectators` es `0` (frente a 80.725 y 1.369.045 en las semanas 1 y 2), y en esa misma transición `[xtra].EconomyDate`/`DailyUpdate5` saltan 14 días en vez de los 7 habituales (ver sección 5). Explicar esto con rigor — separando lo que confirma la Wiki oficial de lo que sigue siendo hipótesis — requeriría extenderse más de lo que corresponde a esta comparación general de tres archivos. Se abrió una investigación dedicada: `docs/expected-cash-investigation.md`.

**Consecuencia directa para el producto:** `ExpectedCash`/`ExpectedWeeksTotal` deben tratarse como una **proyección que puede no cumplirse**, no como un valor fiable de antemano. La afirmación "confirmado, exacto" ya fue corregida en `docs/financial-health-design.md` y en `docs/hrf-data-dictionary.md`.

## 4. Otros hallazgos relevantes

### 4.1 Los costos de personal reflejan los cambios de plantilla técnica con una semana de retraso

En `[staff]`, el miembro `staff2` cambió de identidad entre la semana 1 y la semana 2 (Pablo Matas, costo 35.400 → Gerónimo Rocha, costo 33.000), y se mantuvo igual entre la semana 2 y la 3. Sin embargo, `[economy].CostsStaff` **no** bajó en la semana 2 (183.200 → 183.200, sin cambio) — bajó recién en la semana 3 (183.200 → 180.800), y la diferencia (2.400) coincide exactamente con la diferencia de costo entre ambos miembros del cuerpo técnico (35.400 − 33.000 = 2.400).

Esto es evidencia empírica (un solo caso, coincidencia numérica exacta) de que un cambio de plantilla técnica tarda una semana completa en reflejarse en los costos totales. Con solo dos archivos esto habría sido invisible (se habría visto un cambio de plantilla sin cambio de costo, sin forma de saber si el costo cambiaría después). Nivel de confianza: 🔵 empírico, un solo caso — no hay fuente oficial, y conviene una segunda confirmación antes de construir algo sobre esto.

### 4.2 `ska` completa, con datos reales, la cuenta regresiva que la Wiki ya confirma oficialmente

**Corrección respecto a una primera versión de esta sección:** `hrf-data-dictionary.md` ya registraba, antes de esta investigación, una confirmación oficial de la Wiki (S4, *Injury*) sobre `ska`: el concepto general — cuenta regresiva en semanas, con `0` como estado especial "magullado/jugable" — está **oficialmente confirmado**, no es una hipótesis. Lo único que sigue sin confirmar es el detalle específico de que este `.hrf` use `-1` como convención para "sin lesión" (no es parte del texto oficial, es una convención del formato de exportación).

Lo que aporta esta investigación de tres archivos no es una hipótesis nueva, sino **una corroboración empírica más completa de ese mecanismo ya confirmado**: de los 20 jugadores, 19 mantienen `ska=-1` sin cambio en las tres semanas (consistente con "sin lesión"). El único que no, Vítězslav Pazour (`player464530779`), muestra: semana 1 `ska=2`, semana 2 `ska=1`, semana 3 `ska=0` — la secuencia completa, terminando exactamente en el `0` que la Wiki documenta como el estado terminal "magullado". Con solo dos archivos se veía el descenso (2→1) pero no se podía confirmar que llegara al valor terminal documentado; con el tercero, la secuencia completa coincide con el mecanismo oficial de punta a punta.

### 4.3 `warnings` (acumulación de tarjetas) se reinicia a cero

El mismo jugador cuyo `ska` bajó también muestra otro patrón: no, en realidad es otro jugador — `player512205186` (Jorge Martínez) tiene `warnings`: 2 → 3 → 0. El salto de 3 a 0 es compatible con una sanción cumplida que reinicia el contador acumulado — un mecanismo ya conocido en Hattrick (acumulación de amonestaciones hasta una sanción). No cambia ninguna decisión de este proyecto (no existe todavía ningún contrato a nivel de jugador), pero es una confirmación empírica adicional de un campo que probablemente ya tiene mejor confianza que los diez de D-019.

### 4.4 `undefeated` y `victories` se comportan como una racha, no como un total de temporada

`[club].undefeated` y `[club].victories`: semana 1 = `0`/`0`, semana 2 = `1`/`1` (tras la victoria), semana 3 = `0`/`0` (tras la derrota). Si fueran totales acumulados de la temporada no podrían bajar; el hecho de que vuelvan a `0` tras una derrota sugiere que son contadores de **racha actual**, no de temporada. Esto es una hipótesis razonable pero no confirmada oficialmente — encaja con los tres puntos disponibles, aunque tres puntos con una sola victoria y una sola derrota no alcanzan para descartar otras explicaciones.

### 4.5 Indicadores "de fondo" no reaccionan de inmediato a un mal resultado

`fanclub` (1.126 → 1.152 → 1.170), `GlobalRanking` (171.875 → 171.712 → 171.609, mejorando) y `LeagueRanking` (1.086 → 1.088 → 1.084) siguieron moviéndose en la misma dirección general **incluso después de la derrota por 6-0 de la semana 3** (`RegionRanking` y `PowerRating` ni se movieron: 23 y 688 en las tres semanas, sin excepción). Con dos archivos no había forma de saber si estos indicadores reaccionan rápido o lento a un resultado; con el tercero queda claro que, al menos en esta ventana, no reaccionan de inmediato. Relevante como advertencia para el futuro: no conviene presentar estos campos como reflejo directo del último resultado.

### 4.6 Todavía no hay ningún ejemplo real de empate

Los deltas de `poang` observados hasta ahora son `+3` (semana 1→2, victoria) y `+0` (semana 2→3, derrota). Nunca `+1` (empate). Esto no es un hallazgo sobre el juego, es una nota sobre la cobertura de nuestros propios datos de prueba: cuando se diseñen tests para cualquier funcionalidad basada en `LeagueStatus`, conviene recordar que ningún archivo de muestra real cubre todavía el caso de empate.

## 5. Campos que aparecieron, desaparecieron o cambiaron de contenido

- `[xtra].LogoURL`: tiene una URL real en la semana 1, y queda **vacío** en las semanas 2 y 3. Un campo puede pasar de tener contenido real a estar presente-pero-vacío sin que la sección desaparezca — el mismo caso que ya distinguimos explícitamente en `HrfFieldMissingError` (vacío ≠ ausente), ahora confirmado también fuera de `[team]`/`[economy]`/`[league]`.
- `[lineup].penalty0`–`penalty10`, `captain`, `kicker1`: tienen IDs de jugador reales en las semanas 1 y 2, y son todos `0` en la semana 3 — un reseteo real de contenido, no un campo faltante.
- El bloque `subst0*` (orden de sustitución programada) aparece dentro de `[lineup]` en la semana 3, mientras que en las semanas 1 y 2 ese mismo bloque solo existía dentro de `[lastlineup]`. Confirma que la forma de una sección puede variar semana a semana según decisiones del propio manager en el juego (si configuró o no una sustitución para el próximo partido) — no es un error de exportación.
- `[xtra].EconomyDate` y `[xtra].DailyUpdate5` avanzan 14 días entre semana 2 y 3 (en vez de los 7 habituales), mientras que `TrainingDate`, `SeriesMatchDate` y `DailyUpdate1`–`4` sí avanzan 7 días exactos esa misma semana. Es la misma semana en la que se rompió la proyección financiera (sección 3) — probablemente relacionado, aunque no hay confirmación oficial de qué representa cada fecha.
- `matchtyp` en `[lineup]` fue `1` en las semanas 1 y 3, pero `50` en la semana 2 — el primer valor distinto de `1` visto hasta ahora, acompañado de un `matchid` de un rango numérico mucho menor (42.018.042 frente a ~768-771 millones en el resto). Sin investigar todavía qué significa; se deja registrado para no perderlo de vista si se toca `[lineup]` en el futuro.

## 6. Oportunidades de producto habilitadas específicamente por tener tres snapshots (no dos)

1. **"¿Se cumplió la proyección financiera de la semana pasada?"** — comparar `expectedCash`/`expectedWeeksTotal` de la importación anterior contra `cash`/`lastWeekBalance` de la actual, y mostrar la diferencia. Antes de tener el tercer archivo, esta pregunta ni siquiera tenía sentido plantearla — con dos archivos el único dato disponible sugería que la proyección "siempre se cumple", así que compararla habría parecido redundante. Ahora sabemos que puede no cumplirse, lo que le da valor real a la pregunta.
2. **"¿Está mi equipo en racha?"** — usando `undefeated`/`victories` de un solo archivo (no necesita comparación). Antes de ver el reseteo a `0` tras la derrota, no había evidencia de que estos campos representaran una racha en vez de un total de temporada.
3. **Investigación dedicada de `ska`** — la secuencia 2→1→0 solo es visible con tres puntos; con dos se habría visto como un cambio cualquiera, no como un patrón.
4. **Nota de UX en el bloque de Finanzas**: mencionar que un cambio de plantilla técnica puede tardar una semana en reflejarse en los costos — mejora la explicación existente de "Tendencia" sin ser una funcionalidad nueva.

## 7. Backlog propuesto (reordenado, justificado por esta evidencia)

El orden que yo recomendaría, de mayor a menor prioridad:

1. **Corrección de documentación + investigación dedicada de `ExpectedCash`/`ExpectedWeeksTotal`** — antes de construir nada sobre estos campos, entender por qué la transición semana 2→3 rompe lo observado con dos archivos. Ver `docs/expected-cash-investigation.md`.
2. **"¿Se cumplió la proyección financiera?"** — reutiliza 100% el pipeline y los contratos ya implementados, no requiere ninguna sección nueva, y responde una pregunta que la propia investigación demuestra que el manager necesita. Bloqueada hasta cerrar el punto 1 (no tiene sentido construir una funcionalidad sobre un campo cuyo comportamiento todavía no entendemos del todo).
3. **Investigación (sin código) de `undefeated`/`victories`** — bajo costo, y si se confirma el significado de "racha", habilita una funcionalidad de una sola importación (sin comparación) casi de inmediato.

Lo que **no** subo de prioridad todavía: cualquier funcionalidad sobre `[staff]` (necesitaría un `StaffContract` nuevo, más diseño) y cualquier trabajo sobre la entidad `Player` (sigue fuera de alcance por D-018/D-019 hasta que haya una necesidad concreta y evidenciada — esta investigación aporta pistas, no todavía una necesidad confirmada).

## 8. Qué no cubre esta investigación

- No se investigó el significado oficial de `undefeated`/`victories` — solo se documentaron los patrones observados. Cualquier implementación futura sobre ellos requiere su propia investigación dedicada, con fuentes oficiales, antes de escribir código (regla ya establecida).
- No se investigó `matchtyp=50` ni el bloque `subst0*` — quedan registrados como observaciones, no como investigaciones cerradas.
- Esta investigación compara exactamente tres archivos de un mismo club; ninguna conclusión aquí debe generalizarse a otros clubes o ligas sin evidencia adicional.
- La discrepancia de la sección 3 (`ExpectedCash`/`ExpectedWeeksTotal`) se investiga por separado, con fuentes oficiales, en `docs/expected-cash-investigation.md` — la corrección correspondiente ya se aplicó a `docs/financial-health-design.md` y a `docs/hrf-data-dictionary.md`.
