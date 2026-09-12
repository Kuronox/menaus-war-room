import { describe, expect, it } from 'vitest';
import type { PlayerSummaryContract } from '../infrastructure/hrf/hrf-adapter';
import { compareByNameThenId, formatRosterBlock } from './roster-report';

function player(overrides: Partial<PlayerSummaryContract> & { playerId: string }): PlayerSummaryContract {
  return overrides;
}

describe('compareByNameThenId', () => {
  // Regression test: `.sort()` without a locale-aware comparator places
  // accented letters at the end of the alphabet by raw code point, not in
  // their correct Spanish alphabetical position — verified against these
  // exact real player names during design (docs/roster-design.md).
  it('sorts accented real player names into their correct Spanish alphabetical position', () => {
    const names = [
      'Óscar Ayala',
      'Joseph Rago',
      'Germán Madero',
      "Joël D'Andrès",
      'Jan-Philipp Viechtach',
      'Jorge Alarcón',
      'Moisés Martínez',
      'Pedro Albacete',
      'Vítězslav Pazour',
    ];
    const roster = names.map((name, index) => player({ playerId: String(index), name }));

    const sorted = [...roster].sort(compareByNameThenId).map((p) => p.name);

    expect(sorted).toEqual([
      "Germán Madero",
      'Jan-Philipp Viechtach',
      "Joël D'Andrès",
      'Jorge Alarcón',
      'Joseph Rago',
      'Moisés Martínez',
      'Óscar Ayala',
      'Pedro Albacete',
      'Vítězslav Pazour',
    ]);
  });

  it('breaks a tie between two identical names using playerId', () => {
    const a = player({ playerId: '222', name: 'Mismo Nombre' });
    const b = player({ playerId: '111', name: 'Mismo Nombre' });

    expect([a, b].sort(compareByNameThenId)).toEqual([b, a]);
  });

  it('places players with an unknown name after every named player, ordered by playerId', () => {
    const named = player({ playerId: '1', name: 'Ana' });
    const unknownA = player({ playerId: '222' });
    const unknownB = player({ playerId: '111' });

    const sorted = [named, unknownA, unknownB].sort(compareByNameThenId);

    expect(sorted).toEqual([named, unknownB, unknownA]);
  });
});

describe('formatRosterBlock', () => {
  it('renders the executive summary and one fully-populated player line', () => {
    const roster: PlayerSummaryContract[] = [
      player({
        playerId: '1',
        name: 'Ana Jugadora',
        age: 22,
        speciality: 'Imprevisible',
        injuryWeeksRemaining: 2,
        accumulatedWarnings: 1,
        lastMatchRating: 5.5,
        lastMatchPlayedMinutes: 90,
        lastMatchDate: '2026-08-23 02:00:00',
      }),
    ];

    const lines = formatRosterBlock(roster).join('\n');

    expect(lines).toContain('Plantilla:');
    expect(lines).toContain('Jugadores: 1');
    expect(lines).toContain('Lesionados: 1');
    expect(lines).toContain('Con amonestaciones acumuladas: 1');
    expect(lines).toContain(
      'Ana Jugadora — 22 años — Imprevisible — Lesión: 2 semanas restantes — Sanciones acumuladas: 1 — Último partido: 5.5 (90 min, 23/08/2026)',
    );
  });

  it('uses singular "semana restante" for exactly one week of injury', () => {
    const roster: PlayerSummaryContract[] = [player({ playerId: '1', injuryWeeksRemaining: 1 })];

    expect(formatRosterBlock(roster).join('\n')).toContain('Lesión: 1 semana restante');
  });

  it('renders "no disponible" per field, never hiding the player, when data is missing', () => {
    const roster: PlayerSummaryContract[] = [player({ playerId: '1' })];

    const lines = formatRosterBlock(roster).join('\n');

    expect(lines).toContain('Jugadores: 1');
    expect(lines).toContain('Lesionados: 0');
    expect(lines).toContain('Con amonestaciones acumuladas: 0');
    expect(lines).toContain(
      'Nombre no disponible — Edad no disponible — Especialidad no disponible — Lesión no disponible — Sanciones acumuladas: no disponible — Último partido: no disponible',
    );
  });

  it('renders "Ninguna" and "Sin lesión" for confirmed-absent values, distinct from "no disponible"', () => {
    const roster: PlayerSummaryContract[] = [
      player({ playerId: '1', name: 'Sin Rasgos', speciality: null, injuryWeeksRemaining: null }),
    ];

    const lines = formatRosterBlock(roster).join('\n');

    expect(lines).toContain('Sin Rasgos — Edad no disponible — Ninguna — Sin lesión');
  });

  it('does not count players with an unknown injury status as either injured or not injured', () => {
    const roster: PlayerSummaryContract[] = [
      player({ playerId: '1', injuryWeeksRemaining: 3 }),
      player({ playerId: '2', injuryWeeksRemaining: null }),
      player({ playerId: '3' }),
    ];

    expect(formatRosterBlock(roster).join('\n')).toContain('Lesionados: 1');
  });

  it('falls back to the raw string when a match date does not match the expected "YYYY-MM-DD" shape', () => {
    const roster: PlayerSummaryContract[] = [
      player({
        playerId: '1',
        lastMatchRating: 5,
        lastMatchPlayedMinutes: 90,
        lastMatchDate: 'fecha-invalida',
      }),
    ];

    expect(formatRosterBlock(roster).join('\n')).toContain('Último partido: 5 (90 min, fecha-invalida)');
  });
});
