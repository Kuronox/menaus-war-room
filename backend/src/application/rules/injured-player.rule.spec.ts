import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ImportResult } from '../import-result';
import { ImportHrfUseCase } from '../import-hrf.use-case';
import { injuredPlayerRule, RuleId } from './injured-player.rule';

function importResult(overrides: Partial<ImportResult> = {}): ImportResult {
  return { succeeded: true, steps: [], warnings: [], ...overrides };
}

describe('injuredPlayerRule', () => {
  it('returns no findings when the roster is unavailable', () => {
    const result = importResult({ roster: undefined });

    expect(injuredPlayerRule(result)).toEqual([]);
  });

  it('returns no findings when the roster is available but nobody is injured', () => {
    const result = importResult({
      roster: [
        { playerId: '1' },
        { playerId: '2', injuryWeeksRemaining: null },
        { playerId: '3', injuryWeeksRemaining: undefined },
      ],
    });

    expect(injuredPlayerRule(result)).toEqual([]);
  });

  it('excludes a "bruised" player (weeksRemaining = 0), deliberately not the same as an active injury', () => {
    const result = importResult({ roster: [{ playerId: '1', injuryWeeksRemaining: 0 }] });

    expect(injuredPlayerRule(result)).toEqual([]);
  });

  it('reports exactly the players with an active injury, in roster order, leaving healthy players out', () => {
    const result = importResult({
      roster: [
        { playerId: '1', injuryWeeksRemaining: 3 },
        { playerId: '2', injuryWeeksRemaining: null },
        { playerId: '3', injuryWeeksRemaining: 1 },
        { playerId: '4' },
      ],
    });

    expect(injuredPlayerRule(result)).toEqual([
      { ruleId: RuleId.InjuredPlayer, playerId: '1', weeksRemaining: 3 },
      { ruleId: RuleId.InjuredPlayer, playerId: '3', weeksRemaining: 1 },
    ]);
  });

  it('produces the same findings every time for the same input (deterministic, no hidden state)', () => {
    const result = importResult({ roster: [{ playerId: '1', injuryWeeksRemaining: 2 }] });

    expect(injuredPlayerRule(result)).toEqual(injuredPlayerRule(result));
  });

  it('finds a real injured player end-to-end, from a real HRF import', async () => {
    const filePath = join(__dirname, '../../../../data/hrf/3301513-2026-08-28.hrf');
    const useCase = ImportHrfUseCase.create();

    const result = await useCase.execute(filePath);

    // Vítězslav Pazour (464530779) has ska=2 in this real file — see
    // docs/three-snapshot-investigation.md.
    expect(injuredPlayerRule(result)).toEqual([
      { ruleId: RuleId.InjuredPlayer, playerId: '464530779', weeksRemaining: 2 },
    ]);
  });

  it('excludes the same real player once "bruised" (ska=0), from a later real HRF import', async () => {
    const filePath = join(__dirname, '../../../../data/hrf/3301513-2026-09-10.hrf');
    const useCase = ImportHrfUseCase.create();

    const result = await useCase.execute(filePath);

    // Same player, three weeks later, ska=0 ("bruised, playable") — this
    // rule must not report him as actively injured.
    expect(injuredPlayerRule(result)).toEqual([]);
  });
});
