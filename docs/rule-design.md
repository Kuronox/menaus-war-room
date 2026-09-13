# Diseño: el contrato y comportamiento de una `Rule`

## Propósito

Diseñar lo mínimo necesario para soportar **una primera regla real**, no un mecanismo genérico de reglas. El contrato debe surgir de esa regla concreta, no anticiparse a reglas futuras. No se implementa nada en este documento.

## Explícitamente fuera de alcance (repetido acá para que quede registrado junto al diseño, no solo en el pedido)

`RuleEngine`, `RuleRegistry`, pipeline de ejecución, IA/LLM, configuración dinámica, sistema de plugins, arquitectura distribuida, prioridades de ejecución. Si en algún punto de este diseño parecía necesario introducir alguno de estos conceptos, se detiene y se documenta como "fuera de alcance" más abajo — ninguno resultó imprescindible para la primera regla real.

---

## Punto de partida: una regla real, no una abstracción

**Regla elegida: "Jugador con lesión activa".** Usa exclusivamente `PlayerSummaryContract.injuryWeeksRemaining`, ya confirmado y disponible desde la historia de Plantilla (v0.5.0) — ningún dato nuevo, ninguna sección nueva del HRF.

Por qué esta y no otra:
- Es información **ya canónica** (Application), no HRF crudo — respeta la restricción del enunciado sin esfuerzo adicional.
- No requiere inventar ningún umbral no confirmado (a diferencia de, por ejemplo, "sancionado" a partir de `accumulatedWarnings`, que ya descartamos en `docs/roster-design.md` por la misma razón: no hay fuente oficial sobre a partir de cuántas amonestaciones se activa una sanción).
- Es directamente relevante para una decisión de alineación — el ejemplo explícito de "decisiones que habilita" (D-022).
- Es de una sola importación — no depende del comparador de HRF ni de `ComparisonResult`. Mantiene el slice mínimo (D-018), igual que se hizo con Team Status antes que con la comparación.

---

## 1. Qué información recibe una `Rule`

**Decisión: el `ImportResult` completo, tal cual ya existe** — no un tipo nuevo, no una proyección recortada.

Para esta regla concreta, solo hace falta `result.roster`. Se consideró definir un tipo más angosto (p. ej. un `RuleInput` que solo exponga los contratos "de negocio" y no `steps`/`warnings`/`club`), pero eso sería inventar una interfaz nueva sin que la primera regla real la necesite — exactamente el tipo de anticipación que este documento debe evitar. Si una regla futura demuestra que el acceso amplio a `ImportResult` genera un problema real (por ejemplo, una regla que termina leyendo `steps` por error), se resuelve en ese momento con evidencia concreta, no antes.

**Restricción explícita, ya establecida por el enunciado y confirmada acá:** una `Rule` nunca recibe HRF crudo (`HrfSections`), nunca llama a `HrfFileReader`/`HrfSectionParser`/`HrfAdapter`, y nunca consulta nada fuera de lo que ya trae el `ImportResult` que se le pasa — ni archivos, ni red, ni IA.

## 2. Qué debe devolver una `Rule`

Una lista de "hallazgos" — en este caso, `InjuredPlayerFinding[]`, uno por cada jugador con lesión activa. Una lista vacía es una respuesta completamente válida y esperable (significa "ningún jugador tiene lesión activa según los datos disponibles"), no un caso de error.

## 3. ¿Hace falta un método `applies()`, o alcanza con devolver cero resultados?

**Decisión: alcanza con la lista vacía. No se diseña `applies()`.**

Se consideraron dos casos donde `applies()` podría distinguir algo que un array vacío no distingue:
1. *"La regla no se puede evaluar porque falta el dato"* (p. ej. `result.roster === undefined`, plantilla no disponible) vs. *"se evaluó y no hay lesionados"*.
2. *"La regla no aplica conceptualmente a este club"* (no existe un caso real de esto todavía para ninguna regla planteada).

Para el caso 1: la ausencia de `result.roster` **ya está reportada** en `result.warnings` (`ImportWarningCode.RosterUnavailable`) por la capa de importación — repetirlo a nivel de regla sería duplicar una información que el reporte ya muestra en otro lado. La regla simplemente devuelve `[]` cuando no tiene los datos que necesita, exactamente igual que cuando evaluó y no encontró nada que reportar. No hay ninguna decisión del manager que dependa de distinguir estos dos casos en el nivel de la regla misma.

Para el caso 2: no existe todavía, con una sola regla real, ningún ejemplo concreto que lo demuestre necesario. Se deja fuera hasta que una regla futura lo requiera con evidencia.

## 4. Forma mínima de un `Finding` (para esta regla, no como estándar general)

```
InjuredPlayerFinding
├── ruleId: RuleId.InjuredPlayer   (identificador de qué regla lo produjo — mismo patrón que ImportWarningCode: identificador en inglés, Presentation lo traduce)
├── playerId: string              (mismo identificador estable ya usado en PlayerSummaryContract)
└── weeksRemaining: number        (el dato crudo confirmado, sin interpretación adicional)
```

Nada de `category`, `severity`, `message` en español, ni referencia a evidencia/confianza dentro del propio `Finding`:

- **`category`** (p. ej. "Lineup"/"Training"/"Market"/"Economy"): tentador dado que D-022 organiza el trabajo futuro justamente en esas categorías, pero una sola regla no alcanza para saber si ese campo debe ser un string libre, un enum cerrado, o algo distinto — se decide cuando exista una segunda regla de una categoría diferente.
- **`severity`**: no hay ninguna fuente oficial que confirme un umbral de urgencia (p. ej. "crítico si quedan más de 2 semanas") — inventarlo violaría D-020 igual que ya se evitó con "Sancionados" en `docs/roster-design.md`.
- **Texto en español**: violaría la separación ya establecida en todo el proyecto (Application en inglés, Presentation traduce) — mismo criterio que `ImportWarningCode`/`WARNING_MESSAGES`.
- **Evidencia/confianza**: `docs/Product.md` ("Decision Transparency") pide que toda *recomendación* incluya su nivel de confianza — pero un `Finding` es una observación, no todavía una recomendación (esa síntesis es, según D-022, un paso posterior). La confianza de esta regla en particular (🔵, mecanismo oficial confirmado por la Wiki S4, ver `docs/roster-design.md`) queda documentada en este archivo y en el código de la regla misma, no repetida en cada instancia de `Finding` — igual que la confianza de un campo del HRF vive en `hrf-data-dictionary.md`, no en cada valor que ese campo produce.

## 5. Alternativas descartadas

| Alternativa | Por qué se descarta (por ahora) |
|---|---|
| `Rule` como clase con métodos `applies()` + `evaluate()` | Ver sección 3 — una sola regla no demuestra que haga falta separar ambos pasos |
| `Rule` como clase (`@Injectable()`, mismo estilo que `HrfAdapter`) | No tiene ninguna dependencia inyectada, ni hoy ni previsible — una función pura es lo mínimo que cumple "determinista y testeable"; una clase agregaría ceremonia sin beneficio |
| Un tipo `Finding` único y compartido por todas las reglas futuras | La regla concreta que tenemos necesita `playerId`/`weeksRemaining` — nada garantiza que una regla económica o de entrenamiento comparta esa forma. Generalizar ahora sería exactamente la anticipación que D-018 pide evitar (mismo motivo por el que se descartó un `FieldComparison<T>` genérico en `docs/hrf-comparison-design.md`) |
| Una interfaz `RuleInput` más angosta que `ImportResult` | Ver sección 1 — ningún problema concreto la justifica todavía |
| La regla consume `ComparisonResult` en vez de (o además de) `ImportResult` | La pregunta ya tiene valor con una sola importación; ampliar el tipo de entrada sin necesidad concreta violaría D-021 (single-file sigue siendo un caso válido e independiente) |
| Incluir `category`/`severity`/texto en español en el `Finding` | Ver sección 4 |

---

## Dónde viviría esto (ubicación, no implementación)

```
backend/src/application/rules/
└── injured-player.rule.ts   (RuleId, InjuredPlayerFinding, injuredPlayerRule)
```

Dentro de `application/`, nunca en `infrastructure/` — coherente con "una Rule solo trabaja con datos canónicos ya producidos por Application/Domain". No se crea un archivo `rule.ts` compartido todavía (ver sección 5, fila "Finding único"): no hay un tipo `Rule` genérico que declarar hasta que una segunda regla demuestre qué es lo realmente común entre dos reglas distintas.

## Testabilidad (requisito explícito del enunciado)

`injuredPlayerRule` sería una función pura: mismo `ImportResult` de entrada, mismo `InjuredPlayerFinding[]` de salida, siempre. Se puede testear con un `ImportResult` construido a mano (sin archivos, sin HRF real) para cada caso: sin plantilla (`roster` ausente → `[]`), plantilla sin lesionados (→ `[]`), un jugador lesionado, varios, y el caso límite de la sección siguiente (`weeksRemaining = 0`).

---

## Qué no resuelve este documento, explícitamente

- Cómo o cuándo se ejecuta esta regla dentro de `pnpm analyze` / `ImportHrfUseCase` (eso es `RuleEngine`/pipeline — fuera de alcance).
- Cómo se traduce `InjuredPlayerFinding` a una línea de reporte en español (historia de Presentation aparte, una vez aprobado este contrato).
- Qué forma tendrá una segunda regla, o qué es genéricamente compartido entre reglas — se decide cuando esa segunda regla exista, no antes.

---

## Resolución (diseño cerrado, listo para implementar)

1. **Umbral de `weeksRemaining`: `> 0` únicamente.** `weeksRemaining = 0` ("magullado, jugable" según la Wiki) queda explícitamente fuera de esta regla — no se conflacionan ambos estados. Si ese estado demuestra valor propio para el manager más adelante, da origen a una regla distinta, no se agrega acá.
2. **Nombre definitivo: `InjuredPlayerFinding`**, con la regla como `injuredPlayerRule` en `injured-player.rule.ts`.
3. **Confirmado: sin tipo `Rule<T>` compartido todavía.** `InjuredPlayerFinding` es un tipo propio de esta regla, no una implementación de una interfaz genérica — una segunda regla, cuando exista, revela qué es lo realmente común entre ambas.

No se ha escrito ninguna línea de implementación todavía en este documento — ver el commit correspondiente para el código.
