# Flujo de Uso del Manager — de la descarga del HRF al War Room Report

## Propósito

Este documento describe la **secuencia de uso completa**, desde que el manager descarga el HRF de Hattrick hasta que recibe el War Room Report semanal. No describe pantallas ni interfaz — describe decisiones, entradas, procesamiento y salidas, usando el vocabulario ya establecido en el [Canonical Domain Model](canonical-domain-model.md), los [Data Contracts](data-contracts.md), la [Mapping Strategy](hrf-mapping-strategy.md) y las [Validation Rules](validation-rules.md). El objetivo, tal como lo pidió el usuario, es **validar la experiencia de uso antes de construir ningún componente técnico**.

Este documento no modifica ninguna decisión arquitectónica ya tomada — es una capa de validación de experiencia sobre lo ya diseñado.

---

## 0. Marco: por qué este flujo es semanal, no arbitrario

Hattrick actualiza el club del manager en momentos fijos de la semana (confirmado en Sprint 0: `[xtra].TrainingDate`, `EconomyDate`, `SeriesMatchDate`, `DailyUpdate1`–`5`). El flujo de uso de War Room **no impone su propio calendario** — se sincroniza con el ciclo real del juego. El evento que dispara todo el flujo es siempre el mismo: *el manager decide que ha pasado algo en Hattrick que vale la pena analizar* (normalmente, después de una actualización de entrenamiento, un partido, o una actualización económica).

---

## 1. Vista general de la secuencia

```
 (en Hattrick.org, fuera del sistema)
 [1] Manager descarga el .hrf
        │
        ▼
 [2] Manager importa el archivo al sistema
        │
        ▼
 [3] Adaptador HRF parsea + valida  ──── falla estructural ───▶ Rechazo, manager informado, fin del ciclo
        │  (import aceptado, con o sin marcas de revisión)
        ▼
 [4] Sistema detecta huecos de información no cubiertos por el HRF
        │
        ▼
 [5] Manager decide si completa esos huecos manualmente (opcional, por hueco)
        │
        ▼
 [6] Sistema procesa: compara contra el snapshot anterior, corre los motores determinísticos
        │
        ▼
 [7] Sistema arma el Command Center (prioridades) y el War Room Report completo
        │
        ▼
 [8] Manager revisa el reporte y decide sus acciones
        │
        ▼
 (en Hattrick.org, fuera del sistema)
 [9] Manager ejecuta esas acciones directamente en Hattrick (alineación, fichajes, etc.)
        │
        └──▶ vuelve a [1] la próxima vez que haya algo nuevo que analizar
```

---

## 2. Etapa por etapa

### [1] Descarga del HRF — fuera del sistema

**Actor:** manager, directamente en Hattrick.org. **No es una acción del sistema.**

El sistema no puede automatizar este paso (requeriría credenciales de Hattrick, fuera del alcance actual — ver `DECISIONS.md` D-002, HRF sigue siendo la fuente de verdad manual del manager). Es el único paso del flujo que ocurre completamente fuera de Menaus War Room.

### [2] Importación del archivo

**Actor:** manager. **Entrada:** el archivo `.hrf` descargado.

**Decisión del manager:** ninguna decisión de contenido — solo decide *cuándo* importar. No necesita saber nada sobre el formato del archivo ni sobre qué contiene.

### [3] Parseo y validación automáticos

**Actor:** sistema (`HrfAdapter` + Validation Rules). **Entrada:** el archivo crudo. **Salida:** un `ImportBatch` nuevo + los snapshots que produce (condición de cada jugador, economía, entrenamiento, alineación, clasificación propia en liga).

**Decisión del sistema:** aceptar, aceptar-con-marcas-de-revisión, o rechazar (ver [validation-rules.md](validation-rules.md) §1). Un rechazo duro (p. ej. archivo corrupto, faltan campos de procedencia) detiene el ciclo aquí y se lo comunica al manager en términos simples — nunca se le pide que "arregle" el archivo, porque el archivo no es su responsabilidad, es un export de Hattrick.

**Caso especial — primera importación:** si no existe ningún `ImportBatch` anterior para este club, el sistema lo detecta y **desactiva** cualquier análisis que dependa de comparación histórica (entrenamiento detectado, evolución, comparación semanal) — no los omite en silencio, los reporta explícitamente como "aún no disponible: se necesita al menos una importación anterior", siguiendo la regla de nunca ocultar una ausencia de datos.

### [4] Detección de huecos de información

**Actor:** sistema. Este es el paso que traduce las limitaciones ya documentadas en Sprint 0 (el HRF solo cubre el propio club) en una acción concreta para el manager.

El sistema revisa, para el ciclo de esta semana, qué información **relevante para el reporte** no está cubierta por el import recién aceptado, y la clasifica en dos tipos:

| Tipo de hueco | Ejemplo | ¿Bloquea el reporte? |
|---|---|---|
| **Dato puntual de esta semana** | Quién es el rival del próximo partido y cómo juega | No — el reporte se genera igual, con esa sección marcada explícitamente como no disponible si el manager no la completa |
| **Dato de configuración de fondo** | Tabla completa de la liga (otros clubes), nombres de países | No — no se pide cada semana, solo la primera vez o cuando cambie |

**Importante:** el sistema **nunca bloquea** la generación del War Room Report por falta de datos manuales — siguiendo la regla de "nunca inventar" de `AGENTS.md`, la respuesta correcta a un dato ausente es reportarlo como ausente, no impedir que el resto del reporte (que sí tiene datos) llegue al manager.

### [5] Entrada manual (opcional, por hueco)

**Actor:** manager. **Decisión:** para cada hueco detectado en [4], el manager decide si lo completa ahora, lo completa después, o lo deja sin completar esta semana.

Ver la tabla completa de qué se puede/debe introducir manualmente en la sección 3.

### [6] Procesamiento — motores determinísticos

**Actor:** sistema. **Entrada:** el snapshot recién importado + (si existen) los datos manuales de [5] + el histórico de snapshots anteriores del mismo club.

Esta etapa no requiere ninguna decisión del manager — es puramente automática, y corresponde a los motores ya previstos en `ROADMAP.md` (Sprint 2/3), aquí descritos solo como pasos de flujo, no como diseño de algoritmo:

1. **Comparación semanal** — snapshot actual vs. snapshot(s) anteriores: cambios de forma, lesiones, sanciones, moral, finanzas.
2. **Detección de entrenamiento** — qué jugadores se entrenaron, minutos jugados vs. minutos disponibles, desperdicio de entrenamiento.
3. **Evolución de jugadores** — pops, caídas de forma, tendencia de valor de mercado.
4. **Optimización de alineaciones** — tres salidas distintas a partir del mismo `SkillSet`, cada una con un objetivo ya fijado por las reglas del producto (no una elección semanal del manager):
   - *Alineación de Liga*: balance entre competitividad y entrenamiento.
   - *Alineación Amistosa*: maximiza entrenamiento, resultado es secundario.
   - *Best XI*: la alineación más fuerte posible, ignora entrenamiento (para finales, arena, torneos).
5. **Análisis de rival** — solo se ejecuta si el manager completó el hueco de datos de rival en [5]; si no, esta sección del reporte se marca explícitamente como no disponible, con el motivo.
6. **Priorización para el Command Center** — agrega todo lo anterior en la lista de decisiones accionables con color (🔴🟡🟢) que describe `Product.md`.

**Nota sobre explicación por IA:** `ARCHITECTURE.md` establece que la IA nunca decide, solo explica decisiones ya producidas por estos algoritmos determinísticos. En el flujo actual (antes de Sprint 5) este paso de explicación **no existe todavía** — el reporte se entrega con los resultados de los algoritmos, sin explicación en lenguaje natural generada por IA. Se deja marcado como una etapa futura que se insertará aquí mismo, entre [6] y [7], sin cambiar el resto del flujo.

### [7] Generación del War Room Report

**Actor:** sistema. **Salida:** el reporte completo, con las secciones ya definidas en `Product.md` (Estado del Club, Entrenamiento, Alineación de Liga, Alineación Amistosa, Best XI, Análisis de Rival, Desarrollo, Command Center) — cada sección con sus datos, o con una nota explícita de "no disponible" donde falte información, nunca con un vacío silencioso.

### [8] Revisión y decisión del manager

**Actor:** manager. **Entrada:** el War Room Report. **Decisión:** qué hacer con cada recomendación — el sistema no decide por él, solo prioriza y explica (o lo hará, en Sprint 5).

Este es el punto donde el manager ejerce su juicio: puede aceptar la alineación sugerida, ignorarla, actuar sobre una alerta de lesión, decidir un fichaje, etc. **El sistema no tiene visibilidad de qué decide el manager fuera de Hattrick** — no hay retroalimentación automática de "el manager siguió esta recomendación", salvo lo que se refleje en el próximo HRF importado.

### [9] Ejecución en Hattrick — fuera del sistema

**Actor:** manager, directamente en Hattrick.org. El sistema **no envía nada de vuelta a Hattrick** — no configura alineaciones, no hace ofertas de fichaje, no cambia el entrenamiento. Esto es un límite de diseño explícito, no una limitación técnica temporal (ver sección 5).

El ciclo se cierra aquí y vuelve a [1] la próxima vez que el manager tenga algo nuevo que analizar.

---

## 3. Información automática vs. información manual

| Información | Origen | Frecuencia de entrada manual |
|---|---|---|
| Identidad y estado del propio club (plantilla, habilidades, forma, lesiones, finanzas, entrenamiento, moral, confianza, personal técnico, entrenador, alineación configurada) | **Automático** — HRF, vía `HrfAdapter` | Nunca (siempre que el manager importe el archivo) |
| Clasificación propia en la liga (partidos jugados, puntos, posición) | **Automático** — HRF | Nunca |
| Rival del próximo partido: identidad, formación, fortalezas/debilidades, tendencias tácticas | **Manual** — el HRF no incluye ningún dato de otros clubes (confirmado en Sprint 0) | Cada semana que se quiera la sección de Análisis de Rival en el reporte; opcional |
| Tabla completa de la liga (posición y resultados de los **demás** clubes) | **Manual** — el HRF solo trae la fila del propio club | Solo cuando cambie o se quiera actualizar; no es un dato semanal obligatorio |
| Nombres de país, y otras tablas de referencia estáticas (p. ej. leyenda de especialidades, roles de personal) | **Manual, pero de una sola vez** — configuración inicial, no una tarea semanal | Una vez, al configurar el sistema |
| Prioridad táctica de un partido concreto que se aparte de la regla por defecto (p. ej. "este amistoso sí importa ganarlo") | **Manual, opcional** — la regla por defecto (liga=balance, amistoso=entrenamiento, Best XI=ignorar entrenamiento) ya la conoce el sistema sin que el manager la repita cada semana | Solo cuando el manager quiera anular la regla por defecto |
| Habilidades de jugador (`SkillSet`) | **Automático**, pero marcado de **confianza no verificada** (ver `DECISIONS.md` D-009) hasta que se complete la verificación manual pendiente de Sprint 0/1 | La verificación es una tarea de una sola vez, no semanal |

**Regla general que resume la tabla:** todo lo que describe *al propio club* llega automáticamente del HRF. Todo lo que describe *al mundo fuera del propio club* (rivales, otros equipos de la liga, nombres de referencia) requiere entrada manual, porque ninguna fuente automática actual lo provee — esto es consecuencia directa de la limitación de cobertura del HRF confirmada en Sprint 0, no una elección de diseño arbitraria.

---

## 4. Puntos de decisión explícitos

| # | Quién decide | Qué decide | Cuándo |
|---|---|---|---|
| 1 | Manager | Cuándo importar un nuevo HRF | Etapa [1]–[2] |
| 2 | Sistema | Si el import se acepta, se acepta con marcas de revisión, o se rechaza | Etapa [3] |
| 3 | Sistema | Si hay snapshot anterior suficiente para habilitar comparación histórica | Etapa [3] |
| 4 | Manager | Si completa cada hueco de información manual esta semana, o lo deja pendiente | Etapa [5] |
| 5 | Sistema | Qué objetivo de optimización aplica a cada alineación (Liga/Amistoso/Best XI) — **regla fija, no una elección semanal** | Etapa [6] |
| 6 | Sistema | Si ejecuta o no el Análisis de Rival, según haya o no datos de rival disponibles | Etapa [6] |
| 7 | Manager | Qué hacer con cada recomendación del reporte | Etapa [8] |
| 8 | Manager | Cómo y cuándo ejecutar esas decisiones dentro de Hattrick | Etapa [9] |

Nótese que el sistema solo toma decisiones **mecánicas** (aceptar/rechazar datos, aplicar reglas ya fijas) — toda decisión de **criterio futbolístico** (fichar, alinear, negociar) sigue siendo del manager, consistente con `ARCHITECTURE.md`: el sistema no reemplaza el juicio del manager, lo informa.

---

## 5. Límites explícitos de este flujo

- El sistema **no** escribe de vuelta en Hattrick — no hay automatización de acciones dentro del juego. Esto es deliberado: War Room es un sistema de soporte a la decisión, no un bot de gestión.
- El sistema **no** pide al manager información que ya puede derivar de datos automáticos — si un dato está en el HRF, nunca se le vuelve a preguntar.
- El sistema **no** bloquea el reporte semanal por falta de datos manuales — degrada la sección afectada explícitamente en vez de impedir el resto.
- El sistema **no** genera explicaciones en lenguaje natural todavía (eso es Sprint 5) — en este flujo, el reporte llega con resultados y datos, no con narrativa generada por IA.
- El sistema **no** decide la estrategia general del club (qué priorizar esta temporada) — solo ejecuta las reglas ya declaradas en `Product.md`/`AGENTS.md` (entrenamiento sobre resultado en amistosos, Playmaking como entrenamiento principal, etc.).

---

## 6. Preguntas para validar antes de implementar

Estas son decisiones de experiencia, no de arquitectura, que conviene que confirmes antes de que este flujo se traduzca en componentes técnicos:

1. ¿La cadencia de importación debe ser estrictamente manual (el manager decide cuándo subir el archivo), o en algún momento se espera un recordatorio/aviso basado en las fechas de `[xtra]` (p. ej. avisar quand se acerca `SeriesMatchDate`)? Este documento asume importación puramente manual, sin recordatorios, por ahora.
2. Cuando falta el dato de rival (Etapa [4]/[5]), ¿el reporte debe simplemente omitir esa sección con una nota, o debe ofrecer una alternativa reducida (p. ej. una alineación genérica de Best XI en su lugar)? Este documento asumió lo primero (omitir con nota explícita).
3. ¿Los "huecos de configuración de una sola vez" (tabla de países, leyenda de personal) deben resolverse con un paso de configuración inicial separado del flujo semanal, o integrarse la primera vez que aparezca la necesidad dentro del propio flujo? Este documento asumió lo segundo, mencionado en la etapa [4], pero es una decisión de UX abierta.
4. ¿Debe el manager poder importar más de un `.hrf` en la misma sesión (p. ej. para recuperar historial atrasado), o el flujo siempre asume "un import, un reporte"? Este documento describe el caso de un import a la vez.

No se ha implementado nada de esto — quedan como preguntas abiertas para tu validación, junto con el resto del flujo descrito arriba.
