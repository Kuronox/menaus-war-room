# Architecture

The project follows Clean Architecture.

Presentation

↓

Application

↓

Domain

↓

Infrastructure

↓

Data

---

The parser must be isolated.

Business logic must never depend on HRF.

The AI never makes decisions.

The AI explains decisions produced by deterministic algorithms.

---

Current source of truth

1. HRF
2. Manual league data
3. Manual opponent data