# Changelog

## v0.6.0

### Added
- First rule of the decision-support layer: `injuredPlayerRule` (`backend/src/application/rules/injured-player.rule.ts`), a pure, deterministic function over already-confirmed data (`PlayerSummaryContract.injuryWeeksRemaining`) — no HRF access, no external source, no AI. Reports every player with a confirmed active injury (`weeksRemaining > 0`); a "bruised but playable" player (`weeksRemaining = 0`, per the Hattrick Wiki) is deliberately excluded. See `docs/rule-design.md`.
- Marks the start of a project priority shift, formalized as D-022: from extracting HRF data to assisting the manager's decisions.

### Not included in this release
- The rule is not yet wired into `pnpm analyze` — that connection (and any orchestration point for evaluating more than one rule, `evaluateRules` or similar) is deliberately deferred until a second real rule exists to demonstrate the pattern (`docs/evaluate-rules-design.md`, approved but not implemented).

## v0.5.0

### Added
- `pnpm analyze` now includes a "Plantilla" block: an executive summary (Jugadores/Lesionados/Con amonestaciones acumuladas) followed by one line per player, sorted alphabetically. See `docs/roster-design.md`.
- A missing per-player field no longer excludes that player from the roster — only "no disponible" for that one field. Only zero usable player sections omits the whole block.

## v0.4.0

### Added
- `pnpm analyze <previous.hrf> <current.hrf>`: comparison report between two HRF snapshots, covering Club, Team Status, Financial Health and League Status — same blocks already available for a single file, shown as "previous → current" with every numeric delta already computed. See `docs/hrf-comparison-design.md`.
- A failed import on either side, or the two files belonging to different clubs, aborts the comparison with an explicit Spanish message instead of producing a misleading result.

### Fixed
- `formatAmount` no longer relies on `toLocaleString('es')` for thousands separators — that call was found to skip the separator for four-digit numbers in this runtime (`4245` instead of `4.245`). Grouping is now computed deterministically by hand.

## v0.1.0

### Added
- Initial project documentation.
- Official architecture.
- Technology stack definition.
- Backend initialized with NestJS.
- Vitest, ESLint and Prettier configured.

### Evaluated
- Support for Hattrick Organizer's player CSV export — discarded: it is a derived view of the same HRF file, not an independent data source (see `docs/ho-csv-comparison.md`).