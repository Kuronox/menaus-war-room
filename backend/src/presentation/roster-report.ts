import type { PlayerSummaryContract } from '../infrastructure/hrf/hrf-adapter';

/**
 * Renders the "Plantilla" block: an executive summary (totals) followed
 * by one compact line per player, sorted alphabetically by name — see
 * docs/roster-design.md. Pure formatting: every fact (including the
 * `null`/`undefined` distinction on `speciality` and
 * `injuryWeeksRemaining`) was already decided by HrfAdapter; this module
 * only turns it into the Spanish text the manager sees.
 */

function formatName(name: string | undefined): string {
  return name ?? 'Nombre no disponible';
}

function formatAge(age: number | undefined): string {
  return age === undefined ? 'Edad no disponible' : `${age} años`;
}

function formatSpeciality(speciality: string | null | undefined): string {
  if (speciality === undefined) {
    return 'Especialidad no disponible';
  }
  return speciality === null ? 'Ninguna' : speciality;
}

function formatInjury(weeksRemaining: number | null | undefined): string {
  if (weeksRemaining === undefined) {
    return 'Lesión no disponible';
  }
  if (weeksRemaining === null) {
    return 'Sin lesión';
  }
  const noun = weeksRemaining === 1 ? 'semana restante' : 'semanas restantes';
  return `Lesión: ${weeksRemaining} ${noun}`;
}

function formatAccumulatedWarnings(count: number | undefined): string {
  return count === undefined ? 'Sanciones acumuladas: no disponible' : `Sanciones acumuladas: ${count}`;
}

// Parsed by hand (not via `Date`) so the result never depends on how this
// runtime's Date/Intl implementation interprets a non-ISO string — the
// same caution that led to hand-rolling formatAmount's thousands grouping.
function formatDateEs(raw: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (match === null) {
    return raw;
  }
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

// The three LastMatch_* fields describe one event — shown together or
// not at all, rather than a partially-filled fragment that would be
// harder to read than a plain "no disponible".
function formatLastMatch(
  rating: number | undefined,
  playedMinutes: number | undefined,
  date: string | undefined,
): string {
  if (rating === undefined || playedMinutes === undefined || date === undefined) {
    return 'Último partido: no disponible';
  }
  return `Último partido: ${rating} (${playedMinutes} min, ${formatDateEs(date)})`;
}

function formatPlayerLine(player: PlayerSummaryContract): string {
  return [
    formatName(player.name),
    formatAge(player.age),
    formatSpeciality(player.speciality),
    formatInjury(player.injuryWeeksRemaining),
    formatAccumulatedWarnings(player.accumulatedWarnings),
    formatLastMatch(player.lastMatchRating, player.lastMatchPlayedMinutes, player.lastMatchDate),
  ].join(' — ');
}

/**
 * Sorts by `name` (Spanish locale-aware, so accented letters land in
 * their correct alphabetical place — verified empirically against this
 * runtime, see docs/roster-design.md and roster-report.spec.ts), with
 * `playerId` as a stable, deterministic tie-breaker. A player with no
 * known name sorts after every named player, ordered among themselves by
 * `playerId` — never omitted, just placed last.
 */
export function compareByNameThenId(a: PlayerSummaryContract, b: PlayerSummaryContract): number {
  if (a.name === undefined || b.name === undefined) {
    if (a.name === b.name) {
      return a.playerId.localeCompare(b.playerId);
    }
    return a.name === undefined ? 1 : -1;
  }
  const byName = a.name.localeCompare(b.name, 'es');
  return byName !== 0 ? byName : a.playerId.localeCompare(b.playerId);
}

export function formatRosterBlock(roster: PlayerSummaryContract[]): string[] {
  const injuredCount = roster.filter((player) => typeof player.injuryWeeksRemaining === 'number').length;
  const warnedCount = roster.filter((player) => (player.accumulatedWarnings ?? 0) > 0).length;
  const sorted = [...roster].sort(compareByNameThenId);

  return [
    'Plantilla:',
    `Jugadores: ${roster.length}`,
    `Lesionados: ${injuredCount}`,
    `Con amonestaciones acumuladas: ${warnedCount}`,
    '',
    ...sorted.map(formatPlayerLine),
    '',
  ];
}
