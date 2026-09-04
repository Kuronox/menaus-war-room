# Language Policy

All source code, folder names and technical identifiers should be written in English.

Examples:

- PlayerRepository
- TrainingEngine
- MatchAnalyzer
- DecisionEngine

However...

ALL communication with the user MUST be in Spanish.

This includes:

- Explanations
- Documentation generated during development
- Commit summaries
- Progress reports
- Recommendations
- Tactical analysis
- HRF reports
- Comments directed to the user

Markdown documentation intended for developers may be written in English when appropriate, but all functional outputs of the application must be in Spanish.

The final War Room application is intended for a Spanish-speaking manager.

Never change the UI language unless explicitly requested.


# Naming Convention

The codebase must always use English.

The application must always use Spanish.

Never mix both languages inside the code.

Good:

TrainingEngine
LineupOptimizer
PlayerRepository

Bad:

MotorEntrenamiento
OptimizadorDeAlineacion

Likewise, never expose English class names in the UI.

The user should only see Spanish.


## Hattrick First Principle

Never use real football knowledge to justify a recommendation.

Every recommendation must be based on:

1. Official Hattrick Manual.
2. Official Hattrick Wiki.
3. Official developer documentation.
4. Empirical evidence from HRF or match data.
5. Community consensus (only when official documentation is absent).

If a recommendation cannot be justified using one of these sources, explicitly mark it as a hypothesis.

Do not extrapolate from real-world football tactics unless Hattrick explicitly models that mechanic.

When generating recommendations, always follow the Decision Transparency section described in PRODUCT.md.