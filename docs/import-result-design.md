# Diseño de `ImportResult`

## Propósito

Este documento diseña la estructura que `ImportHrfUseCase.execute()` debería devolver para resolver D-016, sin implementar nada todavía. El objetivo es que **Application encapsule por completo** `HrfFileReader` + `HrfSectionParser` + `HrfAdapter` + la construcción del `Club`, y que **Presentation reciba en un único objeto** todo lo que necesita para construir el reporte — sin volver a tocar ninguna pieza de Infrastructure ni del Domain directamente.

No se escribe código en este documento. Las formas de datos se describen en tablas y en una notación conceptual (igual que ya hace [data-contracts.md](data-contracts.md)), no como interfaces ejecutables.

**Estado: revisado y confirmado. Listo para pasar a implementación en cuanto se apruebe explícitamente.**

---

## Decisiones confirmadas en esta revisión

1. **`ImportHrfUseCase` construye las entidades del dominio internamente.** Presentation no vuelve a llamar `Club.create()` ni a conocer cómo se construye ningún objeto de dominio — esto resuelve, dentro de esta misma historia, la integración Application↔Domain que antes tratábamos aparte (ver el razonamiento original más abajo).
2. **El nombre se mantiene: `ImportResult`.** Representa una importación, no un formato específico — la fuente podrá cambiar (CHPP, manual) sin que Presentation se entere ni cambie su forma de consumirlo.
3. **`ImportStep` / `ImportErrorCode` se mantienen como nombres de los enumerados.** Se revisaron los *valores* de `ImportStep` uno por uno — ver más abajo, se corrigió una ambigüedad real.
4. **No se expone `Section[]` ni ningún detalle interno del pipeline.** Confirmado sin cambios.
5. **Se agrega `warnings: ImportWarning[]`** — información relevante para el manager que no es un fallo de la importación. Diseñado más abajo.

---

## Por qué `ImportHrfUseCase` también construye `Club` (razonamiento original, ya aprobado)

D-016 se limitó, en su momento, a "Presentation no debe conocer Reader/Parser/Adapter". Pero el reporte también le pedía a Presentation que llamara a `Club.create()` directamente — algo que se había dejado aparte como la historia "integración Application↔Domain".

Al diseñar `ImportResult` para que Presentation tenga "toda la información necesaria para construir el reporte", no se puede resolver una cosa sin la otra: si `ImportResult` expusiera un `ClubContract` crudo para que Presentation llame `Club.create()` por su cuenta, Presentation seguiría construyendo una entidad de Domain fuera de su capa — el mismo problema de D-016, un nivel más abajo. Por eso `ImportHrfUseCase` pasa a llamar `Club.create()` internamente, y `ImportResult` entrega el `Club` ya construido.

---

## Revisión de los valores de `ImportStep` (punto 3)

Se revisó cada valor para confirmar que nombra una **etapa completada**, no una acción en curso:

| Valor original | ¿Ambiguo? | Valor final |
|---|---|---|
| `FileRead` | **Sí.** En inglés, "read" se escribe igual en presente y pasado ("read the file" / "the file was read") — como identificador aislado, `FileRead` puede leerse como una orden ("¡Lee el archivo!") tanto como un hecho consumado. Es el único de los cuatro con este problema. | **`FileLoaded`** — "load/loaded" no tiene esa ambigüedad, y expresa con claridad que la etapa ya ocurrió. |
| `SectionsParsed` | No — participio pasado inequívoco. | Sin cambio. |
| `ContractGenerated` | No — participio pasado inequívoco. | Sin cambio. |
| `ClubCreated` | No — participio pasado inequívoco. | Sin cambio. |

Por consistencia, el código de error correspondiente también cambia: `FileReadFailed` → `FileLoadFailed`.

Los valores de `ImportErrorCode` (`FileLoadFailed`, `MissingRequiredField`, `InvalidClub`, `Unknown`) no se sometieron a esta misma revisión porque no describen una etapa completada — describen *qué salió mal*, que es gramaticalmente otra cosa (un problema, no un hecho consumado). No es una inconsistencia, es que responden preguntas distintas.

---

## Forma propuesta (notación conceptual, no código)

```
ImportResult
├── succeeded: boolean
├── club: Club | ausente
├── steps: lista de ImportStepOutcome, en orden de ejecución
└── warnings: lista de ImportWarning (puede estar vacía)

ImportStepOutcome
├── step: uno de {FileLoaded, SectionsParsed, ContractGenerated, ClubCreated}
├── succeeded: boolean
├── errorCode: uno de {FileLoadFailed, MissingRequiredField, InvalidClub, Unknown} | ausente
└── errorDetail: texto técnico original (inglés, para diagnóstico) | ausente

ImportSummary  (solo presente si SectionsParsed tuvo éxito)
├── sectionCount: number
└── playerCount: number

ImportWarning
├── code: identificador en inglés (ver más abajo — hoy no hay ninguno definido)
└── detail: texto técnico opcional, para diagnóstico

ImportResult también incluye:
└── summary: ImportSummary | ausente
```

`step`, `errorCode` y `code` (de `ImportWarning`) son identificadores en inglés, no texto — es Presentation quien los traduce a la frase en español que el manager ve, según la Política de Idioma de `CLAUDE.md`. Application no debería contener ningún string en español.

---

## Campo nuevo: `warnings: ImportWarning[]`

**Quién lo produce:** `ImportHrfUseCase`, cuando detecta algo que el manager debería saber pero que no impide completar la importación.

**Quién lo consume:** Presentation, para una futura sección del reporte (no definida en este documento — hoy el reporte no tiene un lugar para warnings; eso es una decisión de la propia historia de implementación, no de este diseño).

**Por qué pertenece al resultado:** es la diferencia entre "la importación falló" (`steps`/`succeeded`) y "la importación funcionó, pero hay algo que el manager debería revisar" — dos categorías de información genuinamente distintas que `steps` no puede expresar sin forzar un "éxito parcial" ambiguo. `warnings` **nunca** afecta a `succeeded`: una importación con warnings sigue siendo `succeeded: true` si los cuatro pasos completaron.

**Una honestidad que vale la pena dejar por escrito:** con el alcance actual del pipeline (HRF → `Club`, solo `id`+`name`), **no existe todavía ningún productor real de un warning** — el campo empezará su vida como una lista siempre vacía. No lo agrego porque haya un caso concreto ya implementado, sino porque vos lo pediste explícitamente *y* porque ya sabemos, por trabajo de diseño anterior, que va a tener contenido real pronto y sin necesidad de rediseñar `ImportResult` otra vez:
- `manager-usage-flow.md` (etapa [3]) ya especifica que la primera importación de un club (sin `ImportBatch` anterior) debe "reportarlo explícitamente como 'aún no disponible'" en vez de callarlo — ese es un warning, casi textualmente.
- `manager-usage-flow.md` (etapa [4]) especifica huecos de información que el sistema debe señalar sin bloquear el reporte (datos de rival ausentes, por ejemplo) — también un warning.
- D-019 (el reemplazo de D-009) implica que, el día que los 10 campos de habilidad crudos empiecen a fluir por este pipeline, cada campo todavía-sin-verificar es candidato natural a un warning ("Playmaking sin verificar, mostrando campo crudo `spe`").

Por eso **no se define ningún valor concreto de `code` en este documento** — inventar códigos para funcionalidades que no existen todavía (rival, histórico, skills) sería exactamente la sobre-anticipación que D-018 pide evitar. El primer caso real que necesite emitir un warning define su propio `code` en ese momento.

**Alternativas descartadas:**
- No agregar el campo todavía, esperando a que exista el primer productor real. Descartada porque la pediste explícitamente, y porque —a diferencia de un campo puramente especulativo— esta vez sí conocemos con precisión, gracias a `manager-usage-flow.md`, qué lo va a poblar y cuándo; el costo de esperar sería tener que volver a tocar la forma de `ImportResult` (y a todo lo que ya lo consuma) apenas empiece la próxima historia relevante.
- Modelar los warnings como `ImportStepOutcome` con `succeeded: true` y un mensaje. Descartada: mezclaría dos conceptos con semántica distinta (pasos obligatorios del pipeline vs. información contextual) en una sola lista, obligando a Presentation a filtrar por algún criterio para saber cuáles son cuáles.
- Un solo booleano `hasWarnings` sin detalle. Descartada: no le da a Presentation nada que mostrar, solo que algo existe sin decir qué.

---

## Campo por campo (sin cambios respecto a la versión anterior, ya aprobados)

### `club: Club | ausente`

**Quién lo produce:** `ImportHrfUseCase`, llamando internamente a `Club.create(contract.clubId, contract.name)` sobre el `ClubContract` que ya obtiene de `HrfAdapter`.

**Quién lo consume:** Presentation, para las líneas "Club:" e "ID:" del reporte.

**Por qué pertenece al resultado:** es la única forma de que Presentation obtenga la entidad sin construirla ella misma. Ausente cuando el pipeline no llega a esa etapa, o cuando `Club.create()` mismo rechaza los datos.

**Alternativas descartadas:**
- Exponer el `ClubContract` crudo y dejar que Presentation llame `Club.create()`. Descartada: reproduce el problema de D-016 un nivel más abajo.
- Aplanar `clubId`/`clubName` como campos sueltos de `ImportResult`. Descartada: duplica lo que `Club` ya modela, sincronización manual innecesaria a medida que `Club` crezca.

### `steps: ImportStepOutcome[]`

**Quién lo produce:** `ImportHrfUseCase`, añadiendo un `ImportStepOutcome` por cada uno de los cuatro pasos internos.

**Quién lo consume:** Presentation, para las líneas "✓/✗" de "Estado:".

**Por qué pertenece al resultado:** progreso granular real, ya conseguido en la iteración anterior, que no debía perderse al encapsular el pipeline.

**Alternativas descartadas:**
- Cuatro booleanos sueltos en paralelo con sus errores. Descartada: no escala, permite estados imposibles.
- Un único `status`/`failedStep`/`error`. Descartada: pierde granularidad ya lograda.
- Etiquetas en español dentro de Application. Descartada por la Política de Idioma.
- `.message` crudo de la excepción como campo principal. Descartada: es la violación de idioma que este rediseño corrige (ver `errorCode`/`errorDetail`).

### `summary: ImportSummary | ausente`

**Quién lo produce:** `ImportHrfUseCase`, a partir de `sections.length` y `HrfAdapter.countPlayers(sections)`, solo si el parseo se completó.

**Quién lo consume:** Presentation, para "Resumen HRF:".

**Por qué pertenece al resultado:** números ya derivados, sin estructura interna de HRF.

**Alternativas descartadas:**
- Exponer `Section[]`/`HrfSections` completo. Descartada por exponer detalle interno innecesario.
- `0` por defecto si no hubo parseo. Descartada: sería un dato inventado.

### `succeeded: boolean`

**Quién lo produce:** `ImportHrfUseCase`.

**Quién lo consume:** Presentation, para el código de salida del proceso.

**Por qué pertenece al resultado:** evita que Presentation tenga que conocer la regla de qué combinación de `steps` cuenta como éxito.

**Alternativas descartadas:**
- Que Presentation derive el éxito recorriendo `steps`. Descartada: acopla a Presentation a una regla que le corresponde a Application.

---

## Qué queda deliberadamente fuera de `ImportResult`, y por qué

| Dato | Por qué no está |
|---|---|
| `filePath` / nombre de archivo | Presentation ya lo tiene — es su propio argumento a `execute(filePath)`. |
| Tiempo de ejecución | Presentation lo mide por fuera, con un único punto de entrada, sin perder precisión. |
| `Section[]` / `HrfSections` crudo | Detalle interno de sintaxis HRF, no de dominio. |
| `ImportBatch` | `Club` no es un snapshot — se introduce con el primer snapshot real, no antes. |
| `.message` crudo de cada excepción, como campo principal | Se conserva como `errorDetail` (diagnóstico), no como lo que se le muestra al manager. |

---

## Impacto en las capas

- **Infrastructure** (`HrfFileReader`, `HrfSectionParser`, `HrfAdapter`): sin cambio de responsabilidad; dejan de ser visibles fuera de `ImportHrfUseCase`.
- **Application** (`ImportHrfUseCase`): construye `Club`, clasifica errores en `errorCode`, calcula `summary`, decide cuándo emitir un `warning`. Es el único lugar, junto con `Club` mismo, que toca Domain.
- **Domain** (`Club`): sin cambios.
- **Presentation** (`analyze.ts`): depende únicamente de `ImportHrfUseCase` y de `ImportResult`. Mide el tiempo y traduce `steps`/`errorCode`/`warnings` al español del reporte — cero conocimiento de Reader/Parser/Adapter/Club.

---

## Regla de comportamiento: errores vs. warnings

- **Un error detiene el pipeline.** Si un `ImportStepOutcome` falla, `ImportHrfUseCase` no intenta los pasos siguientes — el `ImportResult` resultante tiene `succeeded: false`, y `club`/`summary` quedan ausentes según hasta dónde se haya llegado.
- **Un warning nunca detiene una importación correcta.** Su única función es informar al manager sobre información faltante o incompleta — no participa en absoluto en el cálculo de `succeeded`, y su presencia o ausencia no cambia el comportamiento del pipeline.

Esto ya estaba implícito en el diseño de `warnings` de más arriba ("nunca afecta a `succeeded`"), pero queda ahora como regla explícita, no solo como consecuencia de la forma del tipo.

---

## Estado final

Las tres preguntas abiertas de la revisión anterior quedaron resueltas (ver "Decisiones confirmadas" arriba). No quedan puntos pendientes de diseño — el documento está aprobado y pasa a implementación.
