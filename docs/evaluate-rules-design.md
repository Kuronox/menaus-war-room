# Diseño: `evaluateRules` — el punto mínimo de orquestación

**Estado: diseño aprobado, implementación diferida.** Con una sola regla real (`injuredPlayerRule`), `evaluateRules` no resuelve todavía un problema concreto — sería una función que envuelve a una sola llamada sin combinar nada. Se implementa recién cuando exista una segunda regla real, extrayéndola de la necesidad concreta de combinar ambas, no por anticipación. Si al llegar ese momento el patrón descrito acá sigue siendo el correcto, se implementa tal cual; si la segunda regla revela algo que este documento no previó, se ajusta primero el diseño.

## Propósito

Diseñar únicamente el punto donde se combinan los resultados de varias reglas — no un mecanismo para ejecutarlas dinámicamente. Con una sola regla real (`injuredPlayerRule`, ya implementada y aprobada), el objetivo es encontrar **el lugar natural donde viven las reglas** en el código, no construir infraestructura para ellas. No se implementa nada en este documento.

## Explícitamente fuera de alcance (otra vez, para que quede junto al diseño)

`RuleEngine`, `RuleRegistry`, pipeline de ejecución, prioridades de ejecución, configuración dinámica de qué reglas correr. Si algo de esto pareciera necesario más abajo, se detiene y se documenta como tal — nada de esto resultó imprescindible.

---

## ¿Por qué hace falta este punto, si hoy hay una sola regla?

No para "repartir trabajo entre muchas reglas" (eso sería motivo de un `RuleEngine`). Hace falta porque, el día que exista una historia de Presentation que muestre hallazgos en `pnpm analyze`, esa historia necesita **un solo lugar al que llamar**, sin tener que conocer ni importar cada archivo de regla por separado. Hoy ese lugar tendría un solo llamado adentro; mañana, dos. La historia de Presentation (todavía no diseñada) depende de que este punto exista, no de que sepa correr reglas dinámicamente.

---

## La pregunta central: ¿cómo combinar resultados de reglas con `Finding` distintos, sin un `Finding` compartido?

Esta es la parte no trivial del diseño. Ya decidimos (`docs/rule-design.md`) que `InjuredPlayerFinding` es un tipo propio, no una implementación de una interfaz `Finding` genérica. Combinar los resultados de dos reglas con formas distintas sin inventar esa interfaz compartida es, en TypeScript, perfectamente posible: un array puede tener un **tipo unión estructural**, inferido automáticamente, sin declarar ninguna interfaz nueva.

### Opción considerada y descartada: un objeto con una clave por regla

```
{ injuredPlayer: InjuredPlayerFinding[] }
```

Cada regla nueva agrega una clave. Se descarta porque introduce un tipo nombrado nuevo (`RuleFindings` o como se llame) que hay que mantener, y porque un futuro reporte que quiera "recorrer todos los hallazgos" tendría que conocer cada clave de antemano en vez de iterar una lista — exactamente el tipo de estructura que este documento debería evitar mientras no haya evidencia de que hace falta.

### Opción elegida: un array plano, con el tipo unión que TypeScript infiere solo

```
evaluateRules(result: ImportResult): InjuredPlayerFinding[]
```

Hoy, con una sola regla, la firma es literalmente el tipo de esa regla. El día que exista una segunda regla con su propio `Finding`, la firma pasa a ser una unión (`InjuredPlayerFinding | NombreDeLaSegundaFinding`) — sin declarar ninguna interfaz compartida, porque una unión de tipos en TypeScript no exige que sus miembros compartan estructura. Cada `Finding` sigue siendo dueño de su propia forma; lo único que los une es aparecer en el mismo array. Un consumidor futuro que necesite distinguir uno de otro ya puede hacerlo hoy con el campo `ruleId` que cada `Finding` ya trae (`docs/rule-design.md` §4).

Esto no es una abstracción nueva — es una lista. No hay ningún tipo que "implementar", ningún registro, ninguna configuración.

---

## Contrato propuesto

```
evaluateRules(result: ImportResult): InjuredPlayerFinding[]
```

Implementación conceptual (para ilustrar la forma, no para copiar literalmente):

```
function evaluateRules(result):
  return [...injuredPlayerRule(result)]
```

Cuando exista una segunda regla, este archivo es el único que cambia para combinarlas:

```
function evaluateRules(result):
  return [...injuredPlayerRule(result), ...segundaRegla(result)]
```

La lista de reglas que corre `evaluateRules` está **escrita directamente en su cuerpo** — no se recibe como parámetro, no se lee de una configuración, no hay forma de pedirle que corra "otro conjunto" de reglas. Eso es exactamente lo que lo distingue de un `RuleRegistry`: acá no hay nada que registrar, solo una función que sabe, por su propio código, cuáles son las reglas que existen hoy.

---

## Por qué esto no es un `RuleEngine`, `RuleRegistry` ni `Pipeline`

| Concepto fuera de alcance | Qué tendría, que `evaluateRules` no tiene |
|---|---|
| `RuleRegistry` | Una lista de reglas registrable/consultable en tiempo de ejecución (agregar/quitar reglas sin editar código) |
| `RuleEngine` | Ejecución desacoplada de reglas "genéricas" (sin conocer sus nombres de antemano), manejo de errores por regla, quizás ejecución paralela |
| `Pipeline` | Etapas con orden, dependencias entre reglas, posibilidad de que una regla dependa del resultado de otra |
| Prioridades de ejecución | Cualquier noción de qué regla "importa más" o en qué orden deberían mostrarse los hallazgos |

`evaluateRules` no tiene nada de esto: es una función que llama, por nombre, a las reglas que ya existen, y concatena sus resultados. Agregar o quitar una regla requiere editar esta función directamente — eso es una característica de este diseño, no una limitación a resolver todavía.

---

## Dónde vive esto

```
backend/src/application/rules/
├── injured-player.rule.ts   (ya existe)
└── evaluate-rules.ts        (nuevo — importa cada regla y las combina)
```

Mismo directorio que las reglas mismas — es, literalmente, "donde viven las reglas": el archivo que cualquiera que agregue una regla nueva sabe que tiene que tocar.

---

## Testabilidad

Con una sola regla, el test verifica que `evaluateRules(result)` devuelve exactamente lo mismo que `injuredPlayerRule(result)` para los mismos casos ya cubiertos (sin plantilla, sin lesionados, con lesionados, con un jugador magullado excluido) — probando que el punto de combinación no pierde ni duplica nada, no reprobando la lógica de la regla en sí (eso ya lo cubre `injured-player.rule.spec.ts`). El día que exista una segunda regla, se agrega un test que confirme que los hallazgos de ambas aparecen juntos en el mismo array.

---

## Qué no resuelve este documento

- Cómo se muestra el resultado de `evaluateRules` en `pnpm analyze` (historia de Presentation aparte).
- Qué reglas se agregan después de `injuredPlayerRule` — ninguna se diseña ni se anticipa acá.
- Qué pasa si dos reglas futuras necesitan compartir estructura — se resuelve cuando esa segunda regla exista y lo demuestre, no antes (mismo criterio que `docs/rule-design.md`).

---

## Preguntas necesarias para implementar

1. ¿`evaluateRules` como nombre te sigue pareciendo bien, o preferís otro (p. ej. `getFindings`, `runRules`)?
2. ¿De acuerdo con que la lista de reglas quede escrita directamente en el cuerpo de la función (sin parámetro, sin configuración), tal como se propone arriba?
