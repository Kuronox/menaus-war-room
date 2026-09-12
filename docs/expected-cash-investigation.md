# Investigación: ¿qué son realmente `ExpectedCash` y `ExpectedWeeksTotal`?

## Propósito

No programar nada. Explicar, con fuentes oficiales primero y evidencia empírica de los tres `.hrf` reales en segundo lugar, por qué la transición semana 2→3 rompió la relación que con dos archivos parecía una igualdad exacta (`docs/three-snapshot-investigation.md`, sección 3). Mientras esta investigación no dé una explicación suficientemente sólida, **no se construye ninguna funcionalidad que interprete estos dos campos** — instrucción explícita del usuario.

Siguiendo el mismo criterio que el resto del proyecto: los hallazgos oficiales y los empíricos se presentan por separado de las hipótesis, y ninguna hipótesis se trata como si fuera un hecho confirmado.

---

## Nota metodológica sobre el acceso a la Wiki oficial

Intenté acceder directamente a `wiki.hattrick.org/wiki/Finances` y a `wiki.hattrick.org/wiki/Updates` y ambos intentos devolvieron **HTTP 403** (acceso bloqueado). Lo que cito como "oficial" abajo proviene de los extractos que el propio motor de búsqueda mostró de esas páginas (título + fragmento indexado), no de una lectura directa y completa de la página. Es una fuente oficial de menor certeza que una cita verbatim verificada — lo marco así explícitamente en cada punto, y si en el futuro se logra acceder a la página completa, esto debería revisarse.

---

## Confirmado (oficial, con la salvedad metodológica de arriba)

1. **La cifra "esperada" es, por definición del propio juego, una proyección — no un cierre.** La página de Finanzas de Hattrick muestra el efectivo actual junto con un número entre paréntesis que representa los fondos para la semana siguiente, **después** de la actualización semanal. Es explícitamente "lo que podés anticipar", no un valor ya cerrado. (Fuente: wiki.hattrick.org/wiki/Finances, vía extracto de búsqueda.)
2. **La actualización semanal de economía ocurre una vez por semana, en fin de semana, en un horario que depende del país de la liga.** En ese momento se pagan salarios, costos de estadio e intereses, y se reciben los ingresos de patrocinadores; los ingresos y gastos "acumulados desde la última actualización" se suman y el efectivo se recalcula recién ahí. (Fuente: wiki.hattrick.org/wiki/Finances y wiki.hattrick.org/wiki/Updates, vía extracto de búsqueda.)
3. **En partidos de liga, el ingreso por espectadores lo recibe íntegro el equipo local; el visitante no recibe nada.** En partidos de copa se reparte 2/3 local, 1/3 visitante; en amistosos, mitad y mitad. (Fuente: extracto de búsqueda sobre reglas de espectadores de Hattrick.)

## Confirmado (empírico, exacto en los tres `.hrf`, sin excepción — evidencia interna directa)

4. `ExpectedWeeksTotal = IncomeSum − CostsSum`, exacto en las tres semanas.
5. `ExpectedCash = Cash + ExpectedWeeksTotal`, exacto en las tres semanas. Este es un hallazgo nuevo de esta investigación: `ExpectedCash` no es un valor "externo" calculado en algún otro lado — es, dentro del propio archivo, una suma directa de dos campos que el archivo ya declara. Esto por sí solo ya explica **por qué** puede no coincidir con el `Cash` real de la semana siguiente: `ExpectedCash` es el efectivo actual más la proyección de la semana **todavía en curso**, tomada en el instante de exportar el archivo — no un cálculo que "mire hacia adelante" con información que todavía no existe.

## Cómo estos hechos oficiales explican la discrepancia de la semana 2→3

Uniendo los puntos 1–5: `ExpectedWeeksTotal`/`ExpectedCash` reflejan los ingresos y gastos **acumulados hasta el momento de exportar el HRF**, para una semana que se cierra recién en la actualización del fin de semana (punto 2). Cualquier ingreso o gasto que se sume **después** de exportar el archivo, y antes de esa actualización, queda fuera de la cifra "esperada" — no porque el cálculo esté mal, sino porque la cifra nunca pretendió ser un cierre. Esto coincide exactamente con la afirmación con la que abriste esta investigación: es una proyección al momento de exportar, no una promesa.

**Aplicado al caso concreto:** en la semana 3, `IncomeSpectators=0` (frente a 80.725 y 1.369.045 en las semanas 1 y 2). Por el punto 3, esto es exactamente lo que se esperaría si el próximo partido de liga fuera de visitante (el equipo local se queda con todo el ingreso, el visitante con nada) — una explicación oficial y suficiente para esa diferencia puntual, sin necesidad de invocar ninguna irregularidad.

**Lo que esto NO explica todavía (sigue siendo hipótesis, sin confirmar):**

- No hay, en los campos ya mapeados de este proyecto, un dato que confirme directamente si el partido de la semana 3 fue de local o visitante — la explicación de arriba es consistente con la evidencia, pero no está verificada contra un campo del propio archivo que diga "local"/"visitante".
- `[xtra].EconomyDate` y `[xtra].DailyUpdate5` avanzan 14 días entre la semana 2 y la 3, en vez de los 7 habituales (`docs/three-snapshot-investigation.md`, sección 5) — no encontré ninguna fuente oficial que documente qué representa cada una de estas fechas específicas del `.hrf`, así que no puedo afirmar si este salto está relacionado con la discrepancia financiera o es independiente.
- Con una sola discrepancia observada (una transición de tres) no se puede distinguir "esto pasa cada vez que hay un partido de visitante" de "esto pasa por alguna otra razón que todavía no identificamos" — hace falta más de un caso para generalizar.

---

## Qué significa esto para el producto, mientras tanto

- `ExpectedCash`/`ExpectedWeeksTotal` **siguen siendo hechos verdaderos del archivo que los contiene** — mostrarlos como hoy (dentro de un único `pnpm analyze`) sigue siendo correcto, porque no se les atribuye ninguna promesa sobre el futuro.
- No se implementa ninguna funcionalidad que compare `ExpectedCash`/`ExpectedWeeksTotal` de una importación contra el resultado real de la siguiente, ni que presente la diferencia como un error o un incumplimiento — sería interpretar un campo cuyo comportamiento todavía no entendemos del todo.
- El comparador de HRF (v0.4.0) no se ve afectado: compara cada campo contra sí mismo entre dos archivos (p. ej. `cash` anterior vs. `cash` actual), nunca `expectedCash` contra `cash`.

## Qué haría falta para cerrar esta investigación con más confianza

1. Encontrar (o lograr acceder directamente a) una fuente oficial que documente con precisión qué acumula la cifra "esperada" y en qué momento exacto de la semana se calcula.
2. Un campo confiable de "local/visitante" para el próximo partido, para verificar la hipótesis del punto 3 directamente contra los datos del archivo, en vez de por coincidencia circunstancial.
3. Más semanas con snapshots reales — con una sola discrepancia observada, cualquier generalización sigue siendo débil.

Hasta que se cumpla al menos el punto 2, esta investigación se mantiene abierta y ninguna funcionalidad debe tratar `ExpectedCash`/`ExpectedWeeksTotal` como un predictor confiable de la semana siguiente.
