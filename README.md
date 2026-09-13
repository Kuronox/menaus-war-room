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

The backend (`backend/`) has a working end-to-end command: given one `.hrf` file, it reports the club's identity, team status (spirit/confidence/training focus), financial health, league standing and the player roster, in Spanish, on the console.

```bash
cd backend
pnpm install
pnpm analyze <path-to-file.hrf>
```

Given two `.hrf` files instead, it reports how the club changed between them — same blocks, shown as "previous → current", with every numeric field's delta already computed:

```bash
pnpm analyze <previous-file.hrf> <current-file.hrf>
```

Neither mode persists anything between runs or exposes an API — every comparison is computed from the two files given on the command line.

The project's priority is shifting from extracting HRF data to assisting the manager's decisions (see D-022 in [DECISIONS.md](DECISIONS.md)). The first step is a small, deterministic rules layer that turns already-confirmed data into explicit findings, with no AI involved — see [docs/rule-design.md](docs/rule-design.md). The first rule (`injuredPlayerRule`) exists and is tested, but is not wired into the console report yet — that connection is deliberately a separate, later story.

See [ARCHITECTURE.md](ARCHITECTURE.md), [TASKS.md](TASKS.md) and [DECISIONS.md](DECISIONS.md) for the current state and what's deliberately not built yet.