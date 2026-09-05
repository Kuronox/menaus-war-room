# Diseño: "¿Cómo está la salud financiera de mi club esta semana?"

## Propósito

Diseña el bloque mínimo de FINANCES para el reporte, usando únicamente campos ✅ confirmados de `[economy]` (Sprint 0). No se implementa nada en este documento.

---

## Qué ya está confirmado (sin investigación nueva)

`hrf-data-dictionary.md` ya marca `[economy]` como la sección con más confianza del archivo — no por autoevidencia de nombre solamente, sino por **coincidencias numéricas exactas entre los dos `.hrf` reales** (evidencia empírica directa, no solo hipótesis):

- `ExpectedCash` de una semana = `Cash` real de la semana siguiente (confirmado, exacto).
- `LastWeeksTotal` de una semana = `ExpectedWeeksTotal` de la semana anterior (confirmado, exacto).

Verifiqué además, con los mismos dos archivos, que `ExpectedWeeksTotal = IncomeSum − CostsSum` cuadra exactamente (2.021.845 − 468.545 = 1.553.300) — un tercer punto de confirmación aritmética, no solo semántica.

---

## Los cuatro campos elegidos, y qué pregunta responde cada uno

| Campo HRF | Pregunta del manager que responde | Por qué este y no otro |
|---|---|---|
| `Cash` | "¿Cuánto efectivo tengo ahora mismo?" | El dato más básico de salud financiera; ✅ confirmado, sin ambigüedad |
| `ExpectedCash` | "¿Cuánto voy a tener después de la próxima actualización?" | Ya viene calculado por el propio juego — no es una proyección nuestra, es la proyección de Hattrick, confirmada exacta contra el archivo siguiente |
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
