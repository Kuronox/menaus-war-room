import type { ImportResult } from '../import-result';

/**
 * Identifies which rule produced a given finding — same translation
 * pattern as `ImportWarningCode`: an English identifier, Presentation
 * maps it to the Spanish text the manager sees. Starts with one member;
 * grows one at a time as new rules are added, same as `ImportWarningCode`
 * did (see docs/rule-design.md).
 */
export enum RuleId {
  InjuredPlayer = 'InjuredPlayer',
}

/**
 * One player currently out with an active injury. Deliberately its own
 * type, not a shared `Finding` interface — see docs/rule-design.md: a
 * shared shape is introduced only once a second rule reveals what is
 * actually common between two rules, not before.
 *
 * `weeksRemaining` is always greater than 0 here — `0` ("bruised,
 * playable" per the Hattrick Wiki, see docs/roster-design.md) is
 * deliberately excluded from this rule, not conflated with it. That
 * state may become its own rule later if it proves useful to the
 * manager.
 */
export interface InjuredPlayerFinding {
  ruleId: RuleId.InjuredPlayer;
  playerId: string;
  weeksRemaining: number;
}

/**
 * Reports every player with a confirmed active injury
 * (`PlayerSummaryContract.injuryWeeksRemaining > 0`, already translated
 * from the HRF's `ska` field by `HrfAdapter`). Pure and deterministic:
 * the same `ImportResult` in always produces the same findings out — no
 * HRF access, no external source, no AI (see docs/rule-design.md).
 *
 * Returns an empty array both when the roster is unavailable and when it
 * is available but nobody is injured — that distinction is already
 * visible via `ImportResult.warnings` (`RosterUnavailable`), not
 * repeated here (docs/rule-design.md §3).
 */
export function injuredPlayerRule(result: ImportResult): InjuredPlayerFinding[] {
  if (result.roster === undefined) {
    return [];
  }

  const findings: InjuredPlayerFinding[] = [];
  for (const player of result.roster) {
    if (typeof player.injuryWeeksRemaining === 'number' && player.injuryWeeksRemaining > 0) {
      findings.push({
        ruleId: RuleId.InjuredPlayer,
        playerId: player.playerId,
        weeksRemaining: player.injuryWeeksRemaining,
      });
    }
  }
  return findings;
}
