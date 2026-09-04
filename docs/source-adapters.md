# Source Adapters — Arquitectura de múltiples fuentes

## Propósito

Define la arquitectura que permite a Menaus War Room aceptar datos de **múltiples orígenes** (HRF hoy; CHPP, datos manuales, y otras fuentes en el futuro) sin que el dominio conozca ninguno de ellos. Complementa [canonical-domain-model.md](canonical-domain-model.md) y [data-contracts.md](data-contracts.md), y debe leerse junto con `ARCHITECTURE.md`, que ya establece Clean Architecture como el patrón general del sistema.

---

## 1. Principio arquitectónico: Puertos y Adaptadores

Se adopta el patrón **Ports & Adapters (Arquitectura Hexagonal)** para la capa de importación de datos, encajado dentro de la Clean Architecture ya declarada en `ARCHITECTURE.md`:

```
                    ┌───────────────────────────┐
                    │         Domain             │   ← Entidades, Value Objects,
                    │  (Canonical Domain Model)  │      reglas de Hattrick.
                    └─────────────▲───────────────┘      No conoce ninguna fuente.
                                  │ usa
                    ┌─────────────┴───────────────┐
                    │        Application           │   ← Casos de uso: "importar
                    │   (Import Use Case / Port)   │      datos", "validar import",
                    └─────────────▲───────────────┘      "publicar snapshot".
                                  │ implementa
        ┌─────────────────────────┼─────────────────────────┬───────────────────┐
        │                         │                         │                   │
┌───────┴────────┐      ┌─────────┴────────┐      ┌─────────┴────────┐  ┌───────┴────────┐
│  HRF Adapter    │      │  CHPP Adapter    │      │  Manual Adapter  │  │  Future Adapter │
│ (Infrastructure)│      │  (futuro)        │      │                  │  │   (extensión)   │
└─────────────────┘      └──────────────────┘      └──────────────────┘  └─────────────────┘
```

**Regla de dependencia (no negociable, reafirmando `ARCHITECTURE.md`):** las flechas de conocimiento apuntan hacia adentro. Un adaptador conoce el dominio (para poder producir sus contratos); **el dominio nunca conoce a ningún adaptador**. Esto es lo que permite añadir un adaptador CHPP el día de mañana sin tocar una sola línea del dominio.

---

## 2. El "Import Port"

Cada adaptador cumple un mismo contrato conceptual — el **Import Port** — sin importar su fuente. No se especifica aquí como código (fuera de alcance de este Sprint), sino como responsabilidad:

> Dado un dato crudo específico de una fuente, producir uno o más objetos que cumplan los [Data Contracts](data-contracts.md) del dominio, junto con exactamente un `ImportBatch` de procedencia — o rechazar la importación completa con un motivo explícito si no puede cumplir los contratos obligatorios.

Todo adaptador es responsable de:

1. **Traducción** — convertir su formato nativo a los contratos canónicos (ver estrategia específica de HRF en [hrf-mapping-strategy.md](hrf-mapping-strategy.md); cada adaptador futuro tendrá su propio documento de mapeo equivalente).
2. **Procedencia** — generar el `ImportBatch` con `sourceType`, `sourceDescriptor` y `observedAt` correctos para su fuente.
3. **Honestidad sobre lo desconocido** — nunca inventar un valor para cumplir un campo obligatorio; si no puede, debe rechazar ese registro (ver [validation-rules.md](validation-rules.md)).
4. **Aislamiento** — ningún nombre de campo, código de estado, o peculiaridad de su formato de origen debe aparecer en ningún tipo, nombre o valor que cruce hacia el dominio.

---

## 3. Adaptadores previstos

### 3.1 `HRFAdapter` (Sprint 1–2, primera implementación)

- **Entrada:** archivo de texto `.hrf`.
- **Estrategia de mapeo:** [hrf-mapping-strategy.md](hrf-mapping-strategy.md).
- **Particularidad:** es un formato de solo lectura y de instantánea única — nunca produce actualizaciones incrementales, siempre un snapshot completo del club en un instante.
- **Cobertura:** club propio, plantilla propia, alineaciones propias. **No** cubre datos de otros clubes ni de la liga completa (confirmado en Sprint 0) — por diseño, este adaptador nunca podrá alimentar `DivisionStanding` de un club que no sea el propio, ni datos de rivales.

### 3.2 `CHPPAdapter` (futuro, no implementado en este Sprint)

- **Entrada prevista:** respuestas XML de la API oficial CHPP de Hattrick.
- **Diferencia clave frente a HRF:** CHPP es una API activa (se puede pedir un recurso concreto — un jugador, un partido, un club rival), no un volcado único. Esto significa que el `CHPPAdapter` podrá, a diferencia del `HRFAdapter`, **sí alimentar datos de otros clubes** (rivales, mercado de fichajes) y datos de partidos completos (`Match` con detalle) — precisamente lo que Sprint 0 identificó como ausente del HRF.
- **Reutilización:** dado que ambas fuentes describen en gran medida el mismo dominio (club propio, jugadores, habilidades), se espera una superposición significativa de campos con `HRFAdapter` — cuando ambos adaptadores estén activos, aparece el problema de **conflicto entre fuentes** (ver §5).
- Este documento **no** diseña el mapeo CHPP en detalle — es trabajo de un Sprint futuro, cuando exista necesidad y acceso a la API. Se documenta aquí únicamente el lugar que le corresponde en la arquitectura.

### 3.3 `ManualEntryAdapter` (futuro)

- **Entrada prevista:** datos introducidos directamente por el manager — tabla de liga completa, notas de scouting de un rival, ajustes que el manager sabe que son ciertos pero ninguna fuente automática reporta.
- **Particularidad:** no hay "parseo" de un formato externo — es esencialmente una interfaz de entrada estructurada que ya produce datos con la forma de los contratos canónicos, pero **sigue pasando por las mismas reglas de validación** que cualquier otro adaptador (ver [validation-rules.md](validation-rules.md)) — un dato manual mal formado se rechaza igual que uno mal parseado.
- Ya anticipado por `ARCHITECTURE.md` como fuente de verdad #2 y #3 ("Manual league data", "Manual opponent data") — este documento le da forma arquitectónica concreta: es un adaptador más, no un mecanismo aparte.

### 3.4 Adaptadores futuros no anticipados

Cualquier fuente nueva (otra herramienta de la comunidad, otro formato de exportación, un scraper de la web pública de Hattrick, etc.) se incorpora como un adaptador adicional que implementa el mismo Import Port. **El dominio no necesita cambiar** para soportar una fuente nueva — solo se añade un documento de mapeo equivalente a [hrf-mapping-strategy.md](hrf-mapping-strategy.md) y el propio adaptador (Sprint futuro, fuera de alcance de este Sprint 1 documental).

---

## 4. Dónde vive cada pieza (referencia a Clean Architecture)

| Capa (`ARCHITECTURE.md`) | Contenido relevante a la importación de datos |
|---|---|
| **Domain** | Entidades, Value Objects, Enumeraciones, reglas de negocio de Hattrick (canonical-domain-model.md) — no sabe que existen adaptadores |
| **Application** | El caso de uso "importar datos de una fuente": orquesta invocar un adaptador (a través del Import Port), pasar el resultado por las reglas de validación, y persistir/publicar los snapshots resultantes. Conoce el Import Port (la abstracción), no conoce ningún adaptador concreto |
| **Infrastructure** | Aquí viven `HRFAdapter`, `CHPPAdapter`, `ManualEntryAdapter` y cualquier otro — cada uno depende del dominio (para producir sus contratos) pero el dominio no depende de ninguno |
| **Data** | Persistencia de los snapshots ya validados — explícitamente fuera de alcance de este Sprint (no se diseña base de datos aquí) |

Esta tabla formaliza, para la importación de datos específicamente, la regla que `ARCHITECTURE.md` ya declara en general ("el parser debe estar aislado", "la lógica de negocio nunca depende del HRF") y la extiende explícitamente a CHPP y a cualquier fuente futura.

---

## 5. Conflictos entre fuentes (decisión pendiente)

Cuando más de una fuente pueda reportar el mismo dato (p. ej. HRF y CHPP reportando ambos el salario del mismo jugador la misma semana), el sistema necesita una política de reconciliación. **Esta política no se resuelve en este Sprint** — hoy no hay conflicto real porque solo existe un adaptador activo (HRF) y las fuentes manuales cubren información que el HRF no tiene en absoluto (confirmado en Sprint 0: liga completa, rivales). Se deja registrada la pregunta para cuando exista un segundo adaptador activo, con dos principios de partida recomendados (no decisiones finales, ver `DECISIONS.md`):

1. **No fusión silenciosa:** el dominio no debe promediar ni "adivinar cuál fuente tiene razón" cuando dos `ImportBatch` de fuentes distintas reportan valores distintos para el mismo snapshot lógico — ambos quedan registrados con su procedencia, y la resolución (cuál mostrar, cuál priorizar) es una decisión de la capa de aplicación, explícita y auditable, no un efecto secundario oculto de la importación.
2. **Prioridad declarada, no implícita:** si se necesita una fuente "autoritativa" por defecto para un tipo de dato (p. ej. HRF como fuente de verdad para plantilla propia, según ya declara `ARCHITECTURE.md`), esa prioridad debe ser una configuración explícita del sistema, documentada en `DECISIONS.md` cuando se decida, no una regla implícita en el código de un adaptador.

---

## 6. Qué NO define este documento

- No define el mecanismo técnico de invocación (llamada de función, cola de mensajes, etc.) — es una decisión de implementación.
- No diseña la API pública de CHPP en detalle (eso pertenece al futuro Sprint que implemente `CHPPAdapter`).
- No diseña la interfaz de usuario del `ManualEntryAdapter`.
- No resuelve la política final de conflicto entre fuentes (§5) — solo dos principios de partida.
