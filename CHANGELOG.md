# Changelog

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