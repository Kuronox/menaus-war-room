# Menaus War Room

## Mission

Menaus War Room is a decision support system for managing a Hattrick football club.

It is NOT a dashboard.

A dashboard answers:

> What happened?

War Room answers:

> What should I do next?

The long-term vision is to assist the manager with:

- Training optimization
- Tactical recommendations
- Squad management
- League analysis
- Financial planning
- Transfer decisions
- Scouting
- Historical analysis
- AI explanations

The project follows an incremental development approach.

The HRF file is the primary source of truth.

## Status today

The backend (`backend/`) has a working end-to-end command: given one `.hrf` file, it reports the club's identity, team status (spirit/confidence/training focus) and financial health, in Spanish, on the console.

```bash
cd backend
pnpm install
pnpm analyze <path-to-file.hrf>
```

This is a single-file report — it does not yet compare across weeks, persist anything, or expose an API. See [ARCHITECTURE.md](ARCHITECTURE.md), [TASKS.md](TASKS.md) and [DECISIONS.md](DECISIONS.md) for the current state and what's deliberately not built yet.