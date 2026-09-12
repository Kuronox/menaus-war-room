# Diseño: "¿Cómo está la salud financiera de mi club esta semana?"

## Propósito

Diseña el bloque mínimo de FINANCES para el reporte, usando únicamente campos ✅ confirmados de `[economy]` (Sprint 0). No se implementa nada en este documento.

---

## Qué ya está confirmado (sin investigación nueva)

`hrf-data-dictionary.md` ya marca `[economy]` como la sección con más confianza del archivo. Con los tres `.hrf` reales disponibles hoy, esto es lo que se sostiene como **identidad aritmética dentro de un mismo archivo** (evidencia empírica directa, exacta en los tres, no solo hipótesis):

- `ExpectedWeeksTotal = IncomeSum − CostsSum`, exacto en las tres semanas (p. ej. semana 2: 2.021.845 − 468.545 = 1.553.300).
- `ExpectedCash = Cash + ExpectedWeeksTotal`, exacto en las tres semanas (p. ej. semana 2: 15.367.994 + 1.553.300 = 16.921.294). Este segundo punto no estaba documentado en la versión anterior de este archivo — ver `docs/expected-cash-investigation.md`.

**Ya no se afirma** que `ExpectedCash`/`ExpectedWeeksTotal` de una semana igualen exactamente `Cash`/`LastWeeksTotal` de la semana siguiente — ver "Limitación conocida" más abajo. Esa afirmación aparecía en una versión anterior de este documento, basada únicamente en los dos primeros `.hrf`, y un tercer archivo la contradijo (`docs/three-snapshot-investigation.md`, sección 3).

---

## Limitación conocida: `ExpectedCash`/`ExpectedWeeksTotal` son una proyección al momento de exportar, no una promesa

`ExpectedCash` y `ExpectedWeeksTotal` representan una proyección calculada en el momento de exportar el HRF — no deben compararse como una igualdad exacta con el snapshot de la semana siguiente, ya que entre ambas exportaciones pueden ocurrir eventos económicos (resultado de un partido, altas/bajas de plantilla, etc.) que modifican el resultado final.

Evidencia: en la transición semana 1→2 la proyección coincidió exactamente con el `Cash` real de la semana siguiente; en la transición semana 2→3 no coincidió en absoluto (diferencia de 269.955 en `Cash`, de 1.284.845 en el balance semanal). Ver `docs/three-snapshot-investigation.md` (sección 3) para el detalle numérico y `docs/expected-cash-investigation.md` para el análisis de por qué ocurre esto.

Esto no invalida ninguno de los cuatro campos como **hecho del archivo que los contiene** — `ExpectedCash` sigue siendo exactamente lo que ese HRF declara para ese momento. Lo que deja de sostenerse es tratarlo como un predictor confiable de un HRF futuro. Ninguna funcionalidad de este proyecto compara todavía `ExpectedCash`/`ExpectedWeeksTotal` de una importación contra el resultado real de la siguiente (el comparador de v0.4.0 compara cada campo contra sí mismo entre dos archivos, nunca `ExpectedCash` contra `Cash`) — así que esta corrección no revierte ningún comportamiento ya implementado, solo corrige una afirmación de este documento de diseño.

---

## Los cuatro campos elegidos, y qué pregunta responde cada uno

| Campo HRF | Pregunta del manager que responde | Por qué este y no otro |
|---|---|---|
| `Cash` | "¿Cuánto efectivo tengo ahora mismo?" | El dato más básico de salud financiera; ✅ confirmado, sin ambigüedad |
| `ExpectedCash` | "¿Cuánto proyecta el juego que voy a tener después de la próxima actualización?" | Ya viene calculado por el propio juego a partir de `Cash` y `ExpectedWeeksTotal` del mismo archivo (identidad exacta, ver arriba) — pero es una proyección al momento de exportar, no una promesa verificada contra el archivo siguiente (ver "Limitación conocida") |
| `LastWeeksTotal` | "¿Gané o perdí dinero la semana que ya cerró?" | Balance neto ya cerrado — un hecho, no una estimación |
| `ExpectedWeeksTotal` | "¿Cómo voy en la semana en curso, hasta ahora?" | Balance neto de la semana todavía abierta — se muestra explícitamente como proyección, no como cierre |

**Deliberadamente fuera de este bloque:** el desglose por categoría (`IncomeSpectators`, `CostsStaff`, `CostsPlayers`, etc.). Son ✅ confirmados también, pero responden una pregunta distinta ("¿de dónde viene/adónde va mi dinero?", un extracto detallado) — no "¿cómo está mi salud financiera?" en general. Meterlos ahora sería exactamateri la "lista de todos los campos económicos" que pediste evitar. Quedan como una posible historia futura aparte.

**También fuera:** cualquier símbolo de moneda. `[xtra].CurrencyRate` confirma que existe una tasa de conversión, pero ninguna fuente del proyecto confirma qué moneda es — mostrar "€" o "$" sería inventar una unidad no confirmada. Los números se muestran sin símbolo, con separador de miles para legibilidad.

---

## La comparación que sí requiere un HRF anterior — y hoy no existe

Las cuatro métricas de arriba **no** requieren comparar contra una importación previa nuestra — todas vienen ya calculadas dentro de un único archivo (el propio Hattrick ya se encarga de "recordar" la semana pasada). Pero hay una pregunta real del manager que sí lo requiere y que este sistema no puede responder todavía: **"¿mi situación mejoró respecto a la última vez que importé un HRF?"** — eso exigiría conservar el `Cash`/`ExpectedCash` de una corrida anterior, y el sistema no persiste nada entre ejecuciones de `pnpm analyze` (sin base de datos todavía, ver D-012).

Siguiendo tu instrucción, esto se declara explícitamente en el reporte como no disponible, no se omite en silencio.

---

## Diseño propuesto

Mismo patrón que `teamStatus`: contrato canónico en `HrfAdapter`, enriquecimiento best-effort en `ImportHrfUseCase` (si `[economy]` falla, es un `warning`, no un error que detiene el pipeline — la salud financiera no es parte de la identidad del club), bloque nuevo en el reporte.

```
FinancialHealthContract
├── cash: number
├── expectedCash: number
├── lastWeekBalance: number       (de LastWeeksTotal)
└── currentWeekProjectedBalance: number   (de ExpectedWeeksTotal)
```

Nombres canónicos — el adaptador no expone `Cash`/`ExpectedCash`/`LastWeeksTotal`/`ExpectedWeeksTotal` tal cual, mismo criterio que ya corregiste para `teamStatus`. Nuevo `ImportWarningCode.FinancialHealthUnavailable` si `[economy]` o alguno de estos cuatro campos falta, o si el valor no es un número válido.

### Reporte

```
Finanzas:
Efectivo actual: 15.367.994
Efectivo esperado tras la próxima actualización: 16.921.294
Balance de la semana pasada (cerrada): +262.880
Balance proyectado de esta semana (en curso): +1.553.300
Tendencia respecto a tu última importación: no disponible (el sistema no conserva importaciones anteriores todavía)
```

Sin juicios de valor ("esto es preocupante", "deberías...") — son cuatro hechos y una ausencia declarada, nada más. No hay una regla oficial documentada sobre qué balance es "sano" o "en problemas", así que no se afirma ninguna.

---

## Pendiente de tu confirmación

1. ¿Los cuatro campos elegidos te parecen el bloque correcto, o preferís incluir/excluir alguno?
2. ¿La línea de "tendencia... no disponible" te parece con el formato correcto, o preferís otra redacción?

No se ha escrito ninguna línea de implementación.
