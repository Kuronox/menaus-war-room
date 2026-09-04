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