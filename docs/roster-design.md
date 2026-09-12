# Diseño: "¿Cómo está mi plantilla?"

## Propósito

Diseñar el primer bloque de reporte sobre jugadores individuales — un panorama general de la plantilla, no un análisis de riesgo — usando exclusivamente campos del **Grupo A** de `docs/player-field-readiness-inventory.md` que describen al jugador: identidad, edad, especialidad, lesión/sanción y actividad reciente. La personalidad (`gentleness`/`honesty`/`Aggressiveness`/`led`) queda **deliberadamente fuera**, no como una historia separada, sino como un enriquecimiento futuro de esta misma vista, según tu instrucción. No se implementa nada en este documento.

---

## Los campos elegidos, y qué pregunta responde cada uno

Toda la confianza citada acá ya está establecida en `hrf-data-dictionary.md` / `docs/player-field-readiness-inventory.md` — no hay investigación nueva.

| Campo HRF | Pregunta que responde | Confianza |
|---|---|---|
| `name` | "¿Quién es?" | ✅ |
| `ald` | "¿Qué edad tiene?" | ✅ |
| `specialityLabel` | "¿Qué lo distingue tácticamente?" | ✅ (7 especialidades oficiales confirmadas, S5) |
| `ska` | "¿Está lesionado, y por cuántas semanas más?" | 🔵 (mecanismo de cuenta regresiva confirmado oficialmente, S4) |
| `warnings` | "¿Está cerca de una sanción?" | 🔵 (concepto de acumulación central en el Manual, campo mismo sin página oficial dedicada) |
| `LastMatch_Rating`, `LastMatch_PlayedMinutes`, `LastMatch_Date` | "¿Jugó hace poco, y cómo le fue?" | ✅ |

**Deliberadamente fuera de esta historia:**
- Personalidad (`gentleness`, `honesty`, `Aggressiveness`, `led`) — enriquecimiento futuro de este mismo bloque, no una historia nueva, por instrucción tuya explícita.
- `sal` (salario) — ✅ confirmado, pero conceptualmente más cercano a Finanzas que a "estado de la plantilla"; **confirmado fuera de esta historia.**
- Todo el Grupo B (`for`, `uth`, `spe`, `mal`, `fra`, `ytt`, `fas`, `bac`, `mlv`, `rut`) y Grupo C (`mkt`, `TrainerType`, `rating`, etc.) — sin cambios, siguen sin evidencia suficiente.
- Comparación entre dos importaciones — esta historia es de **una sola importación**. Ya verifiqué en `docs/player-field-readiness-inventory.md` que `speciality`/personalidad no cambiaron ni una vez en las tres semanas reales disponibles, así que un panorama de una sola importación ya es completamente útil; comparar entre semanas queda como una extensión posterior, no como parte de esta pieza.

---

## Exclusión del entrenador

Mismo criterio que ya usa `HrfAdapter.countPlayers()`: se excluye la sección `[player<ID>]` cuyo ID coincide con `[xtra].TrainerID`. No se introduce ningún criterio nuevo.

---

## Dos decisiones de traducción que necesitan tu confirmación explícita, porque interpretan un valor crudo

1. **`ska=-1` → "sin lesión"**: la Wiki confirma oficialmente que `0` significa "magullado, jugable" y que el conteo es regresivo en semanas — pero **no documenta `-1`** como parte de esa escala oficial; es una convención propia del formato `.hrf`/HO. La evidencia empírica (19 de 20 jugadores estables en `-1` en las tres semanas, y el único jugador lesionado bajando 2→1→0 sin pasar nunca por negativo) hace que "sin lesión" sea la única lectura consistente, pero sigue siendo nuestra interpretación, no un hecho oficial. Propongo mapear `-1` a `null` (ausencia de lesión activa) en el contrato, dejando cualquier otro valor como el número de semanas restantes.
2. **`specialityLabel` vacío → "sin especialidad"**: `speciality=0` (sin etiqueta) no es una de las 7 especialidades oficiales confirmadas — es el estado base "ninguna". Coherente con cómo ya se trata en el archivo, pero lo marco explícitamente porque es una traducción, no un valor literal del campo.

---

## Manejo de un jugador con datos incompletos (ajustado según tu instrucción)

Los bloques anteriores (`TeamStatusContract`, etc.) son "todo o nada": si falta un campo requerido, todo el bloque se omite con un warning. Para la plantilla, la regla es otra, según tu instrucción: **ningún jugador se excluye de la lista por datos faltantes.** El bloque siempre muestra a todos los jugadores disponibles (todas las secciones `[player<ID>]` que no sean el entrenador); cada campo individual que falte se marca como no disponible en ese campo puntual, sin ocultar al jugador ni al resto de sus datos.

`ImportWarningCode.RosterUnavailable` queda reservado exclusivamente para el caso en que **no pueda construirse ninguna plantilla en absoluto** — es decir, cero secciones `[player<ID>]` utilizables después de excluir al entrenador (por ejemplo, un archivo sin ningún jugador). Con datos parciales en uno o varios jugadores, el bloque igual se genera y se muestra completo; no hace falta ningún warning adicional, porque no se está ocultando información — cada "no disponible" ya queda explícito en la línea de ese jugador.

Esto simplifica el diseño respecto a la versión anterior: ya no hace falta decidir qué campos son "obligatorios" para incluir a un jugador, ni un conteo agregado de excluidos — no se excluye a nadie.

---

## Contrato propuesto

Con el ajuste de "no excluir a nadie", casi todos los campos pasan a ser opcionales — el único que siempre existe es `playerId`, porque viene del propio nombre de la sección (`player<ID>`), no de un valor que pueda faltar dentro de ella:

```
PlayerSummaryContract
├── playerId: string                          (siempre presente — es el ID de la sección)
├── name?: string                              (de name; ausente si el campo falta)
├── age?: number                               (de ald; ausente si falta o no es un número válido)
├── speciality?: string                        ("Sin especialidad" si specialityLabel viene vacío; ausente solo si specialityLabel no existe en absoluto — caso distinto de "vacío")
├── injuryWeeksRemaining?: number | null        (número = semanas restantes; null = sin lesión activa, de ska=-1; ausente = el campo ska no existía en absoluto)
├── accumulatedWarnings?: number                (de warnings)
├── lastMatchRating?: number
├── lastMatchPlayedMinutes?: number
└── lastMatchDate?: string
```

**Por qué `injuryWeeksRemaining` distingue tres estados (número / `null` / ausente) y no dos:** siguiendo el mismo principio ya aplicado en todo el proyecto (ausente ≠ vacío ≠ cero), "sin lesión" (`ska=-1`, un hecho confirmado) y "no sabemos" (el campo `ska` no está en la sección) son cosas distintas y no deben mostrarse igual. Ningún otro contrato de este proyecto necesitó antes esta distinción de tres estados porque todos eran "todo o nada"; acá es necesaria porque cada campo se reporta de forma independiente por jugador. **Confirmado.**

`ImportResult.roster?: PlayerSummaryContract[]` — igual que los demás bloques: presente si pudo generarse al menos un jugador, ausente (con `RosterUnavailable`) solo si no se pudo generar ninguno.

**Pregunta de diseño ya identificada en la investigación previa, y que sigo sin resolver acá a propósito:** esto se modela como una lista de Contracts, no como una entidad `Player` de dominio — mismo criterio liviano que `TeamStatusContract`. Introducir una entidad `Player` con identidad y comportamiento queda pendiente hasta que una historia concreta la necesite (p. ej. comparar el mismo jugador entre dos semanas), siguiendo D-018.

---

## Reporte propuesto

Con 20 jugadores, una tabla de columnas fijas es frágil (nombres con acentos y apóstrofes de largo muy variable, como *"Björn 'Vikingo' Rosborn"*). Propongo una línea compacta por jugador en vez de una tabla — más simple de implementar y consistente con el resto del reporte, que ya es de líneas de texto, no de tablas:

```
Plantilla (20 jugadores):
Óscar Ayala — 22 años — Sin especialidad — Sin lesión — Sanciones acumuladas: 0 — Último partido: 3.5 (91 min, 26/08/2026)
Jorge Martínez — 22 años — Sin especialidad — Sin lesión — Sanciones acumuladas: 2 — Último partido: 3.5 (91 min, 26/08/2026)
Vítězslav Pazour — 32 años — Imprevisible — Lesión: 2 semanas restantes — Sanciones acumuladas: 0 — Último partido: 5.5 (18 min, 23/08/2026)
...
```

(Valores tomados del `.hrf` real de la semana 1. Ningún jugador de los tres archivos reales tiene hoy un campo faltante de los elegidos, así que no hay un ejemplo real de "no disponible" — el siguiente es un ejemplo **sintético**, solo para ilustrar el formato de un campo puntual ausente, no un dato de ningún archivo real):

```
Jugador de ejemplo — Edad no disponible — Sin especialidad — Lesión: no disponible — Sanciones acumuladas: 0 — Último partido: no disponible
```

**Orden de los jugadores (ajustado según tu instrucción):** ya no se usa el orden del archivo. Se ordena por `name`, de forma estable e independiente del formato de exportación. Dos decisiones concretas para que quede bien especificado:

- Comparación de nombres con reconocimiento de acentos/diacríticos (`localeCompare('es')`), para que "Óscar" y "Ekin" queden en el lugar alfabético correcto en vez del orden binario crudo que ubicaría las letras acentuadas de forma inconsistente.
- **Verificación empírica ya realizada** (dado el antecedente de `toLocaleString('es')` — ver `report-formatting.ts`): ordené los 20 nombres reales de la plantilla con `localeCompare('es')` y con el sort binario por defecto. A diferencia del bug de agrupación de miles, acá **`localeCompare('es')` se comporta correctamente** en este runtime: ubica "Joël D'Andrès" entre "Jan-Philipp" y "Jorge" (como "Joel"), y "Óscar Ayala" entre "Moisés" y "Pedro" (como "Oscar"). El sort binario, en cambio, manda ambos al final de la lista por el punto de código de la letra acentuada — confirma por qué hace falta `localeCompare` y no un sort por defecto. No hace falta un comparador determinista de respaldo; se implementa con `localeCompare('es')` directamente. Este hallazgo se protege con un test automatizado al implementar (contra los mismos nombres reales), no solo con esta verificación manual — si algún día un runtime distinto lo rompe, ese test lo va a detectar y ahí sí se resuelve con un comparador determinista propio, igual que se hizo con `formatAmount`.
- Como desempate estable ante un nombre duplicado o ausente, se usa `playerId` en segundo lugar — así el orden nunca depende de la posición en el archivo, ni siquiera en el caso límite de dos jugadores con el mismo nombre o sin nombre.

**Dónde vive el ordenamiento:** en Presentation, no en `HrfAdapter`. El contrato (`ImportResult.roster`) se arma en el orden en que aparecen las secciones — una traducción honesta del archivo — y es la capa de presentación la que decide, por una razón puramente de lectura del reporte, mostrar la lista ordenada por nombre. Coherente con la regla ya establecida (D-016 y el diseño de la comparación de HRF): Presentation solo formatea, nunca decide hechos.

Sin juicios de valor en ninguna línea — se muestran los hechos del archivo, nunca "necesita descanso" ni "en riesgo".

---

## Resumen ejecutivo al inicio del bloque (nuevo, según tu instrucción)

Antes del detalle jugador por jugador, una línea de totales — mismo estilo que ya usa `Resumen HRF:` en el reporte de un solo archivo:

```
Plantilla:
Jugadores: 20
Lesionados: 1
Con amonestaciones acumuladas: 2
```

- **Jugadores:** cuenta todas las secciones `[player<ID>]` mostradas (excluyendo al entrenador), sin importar si a algún jugador le falta algún campo — se cuenta a todos los que aparecen en el detalle.
- **Lesionados:** cuenta solo a los jugadores con `injuryWeeksRemaining` como número (lesión activa confirmada) — no cuenta ni a los `null` (sin lesión) ni a los ausentes (dato desconocido, que no deben sumarse como "sano" ni como "lesionado").
- **Con amonestaciones acumuladas:** cuenta jugadores con `accumulatedWarnings > 0` — **confirmado**, se usa esta redacción y no "Sancionados", porque hoy solo conocemos el hecho (cantidad de amonestaciones) y no una regla oficialmente confirmada que permita derivar una sanción activa. Si en el futuro esa regla queda respaldada por evidencia suficiente, el reporte podrá evolucionar a "Sancionados: N" sin cambiar el modelo de datos — el campo subyacente (`accumulatedWarnings`) no cambia, solo cómo se lo presenta.

---

## Sobre el identificador estable del jugador

`playerId` ya estaba en la versión anterior de este contrato — lo confirmo como campo obligatorio (nunca ausente, nunca opcional) precisamente por la razón que diste: es lo único que permitirá correlacionar al mismo jugador entre dos importaciones el día que exista una comparación de plantilla, sin depender de `name` (que además podría, en teoría, repetirse entre dos jugadores distintos).

## Pendiente de tu confirmación

1. ¿De acuerdo con las dos traducciones de la sección "decisiones de traducción" (`ska=-1`→`null`, `specialityLabel` vacío→"Sin especialidad")?
2. ¿El formato de línea compacta te parece bien, o preferís que explore una tabla de columnas pese a la fragilidad de nombres largos?

Ya confirmado: salario fuera de esta historia, personalidad como enriquecimiento futuro, modelo de tres estados para `injuryWeeksRemaining`, no excluir jugadores por datos incompletos, `playerId` obligatorio, orden por nombre en Presentation con `localeCompare('es')` (verificado empíricamente contra los 20 nombres reales, protegido con test al implementar), resumen ejecutivo con "Jugadores"/"Lesionados"/"Con amonestaciones acumuladas".

No se ha escrito ninguna línea de implementación — quedan dos preguntas menores abiertas antes de considerar este diseño listo para implementar.
