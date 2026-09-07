import { describe, expect, it } from 'vitest';
import { Club } from '../domain/club';
import type { FinancialHealthContract, LeagueStatusContract, TeamStatusContract } from '../infrastructure/hrf/hrf-adapter';
import { ComparisonErrorCode, ComparisonWarningCode, compareImportResults } from './compare-import-results';
import { ImportStep, type ImportResult } from './import-result';

const TEAM_STATUS_PREVIOUS: TeamStatusContract = {
  teamSpirit: 'serenos',
  confidence: 'Muy baja',
  trainingType: 'Jugadas',
};

const TEAM_STATUS_CURRENT: TeamStatusContract = {
  teamSpirit: 'confiados',
  confidence: 'Alta',
  trainingType: 'Defensa',
};

const FINANCIAL_HEALTH_PREVIOUS: FinancialHealthContract = {
  cash: 100,
  expectedCash: 200,
  lastWeekBalance: 10,
  currentWeekProjectedBalance: 20,
};

const FINANCIAL_HEALTH_CURRENT: FinancialHealthContract = {
  cash: 150,
  expectedCash: 180,
  lastWeekBalance: -5,
  currentWeekProjectedBalance: 30,
};

const LEAGUE_STATUS_PREVIOUS: LeagueStatusContract = {
  division: 'V.181',
  position: 6,
  points: 3,
  matchesPlayed: 5,
  goalsFor: 4,
  goalsAgainst: 12,
};

const LEAGUE_STATUS_CURRENT: LeagueStatusContract = {
  division: 'V.181',
  position: 5,
  points: 6,
  matchesPlayed: 6,
  goalsFor: 6,
  goalsAgainst: 12,
};

function successfulImportResult(overrides: Partial<ImportResult> = {}): ImportResult {
  return {
    succeeded: true,
    club: Club.create('1', 'Menaus'),
    steps: [{ step: ImportStep.ClubCreated, succeeded: true }],
    teamStatus: TEAM_STATUS_PREVIOUS,
    financialHealth: FINANCIAL_HEALTH_PREVIOUS,
    leagueStatus: LEAGUE_STATUS_PREVIOUS,
    warnings: [],
    ...overrides,
  };
}

describe('compareImportResults', () => {
  it('compares every block when both imports succeeded for the same club, with deltas already computed', () => {
    const previous = successfulImportResult();
    const current = successfulImportResult({
      teamStatus: TEAM_STATUS_CURRENT,
      financialHealth: FINANCIAL_HEALTH_CURRENT,
      leagueStatus: LEAGUE_STATUS_CURRENT,
    });

    const result = compareImportResults(previous, current);

    expect(result.succeeded).toBe(true);
    expect(result.club).toEqual({ id: '1', name: 'Menaus' });
    expect(result.teamStatus).toEqual({
      teamSpirit: { previous: 'serenos', current: 'confiados' },
      confidence: { previous: 'Muy baja', current: 'Alta' },
      trainingType: { previous: 'Jugadas', current: 'Defensa' },
    });
    expect(result.financialHealth).toEqual({
      cash: { previous: 100, current: 150, delta: 50 },
      expectedCash: { previous: 200, current: 180, delta: -20 },
      lastWeekBalance: { previous: 10, current: -5, delta: -15 },
      currentWeekProjectedBalance: { previous: 20, current: 30, delta: 10 },
    });
    expect(result.leagueStatus).toEqual({
      division: { previous: 'V.181', current: 'V.181' },
      position: { previous: 6, current: 5, delta: -1 },
      points: { previous: 3, current: 6, delta: 3 },
      matchesPlayed: { previous: 5, current: 6, delta: 1 },
      goalsFor: { previous: 4, current: 6, delta: 2 },
      goalsAgainst: { previous: 12, current: 12, delta: 0 },
    });
    expect(result.warnings).toEqual([]);
  });

  it('fails with PreviousImportFailed when the previous ImportResult did not succeed', () => {
    const previous: ImportResult = { succeeded: false, steps: [], warnings: [] };
    const current = successfulImportResult();

    const result = compareImportResults(previous, current);

    expect(result).toEqual({ succeeded: false, errorCode: ComparisonErrorCode.PreviousImportFailed, warnings: [] });
  });

  it('fails with CurrentImportFailed when the current ImportResult did not succeed', () => {
    const previous = successfulImportResult();
    const current: ImportResult = { succeeded: false, steps: [], warnings: [] };

    const result = compareImportResults(previous, current);

    expect(result).toEqual({ succeeded: false, errorCode: ComparisonErrorCode.CurrentImportFailed, warnings: [] });
  });

  it('fails with ClubMismatch when both imports succeeded but belong to different clubs', () => {
    const previous = successfulImportResult({ club: Club.create('1', 'Menaus') });
    const current = successfulImportResult({ club: Club.create('2', 'Otro Club') });

    const result = compareImportResults(previous, current);

    expect(result).toEqual({ succeeded: false, errorCode: ComparisonErrorCode.ClubMismatch, warnings: [] });
  });

  it('reports TeamStatusComparisonUnavailable and omits teamStatus when only one side has it, without affecting other blocks', () => {
    const previous = successfulImportResult({ teamStatus: undefined });
    const current = successfulImportResult();

    const result = compareImportResults(previous, current);

    expect(result.succeeded).toBe(true);
    expect(result.teamStatus).toBeUndefined();
    expect(result.financialHealth).toBeDefined();
    expect(result.leagueStatus).toBeDefined();
    expect(result.warnings).toEqual([{ code: ComparisonWarningCode.TeamStatusComparisonUnavailable }]);
  });

  it('reports FinancialHealthComparisonUnavailable and omits financialHealth when only one side has it, without affecting other blocks', () => {
    const previous = successfulImportResult();
    const current = successfulImportResult({ financialHealth: undefined });

    const result = compareImportResults(previous, current);

    expect(result.succeeded).toBe(true);
    expect(result.teamStatus).toBeDefined();
    expect(result.financialHealth).toBeUndefined();
    expect(result.leagueStatus).toBeDefined();
    expect(result.warnings).toEqual([{ code: ComparisonWarningCode.FinancialHealthComparisonUnavailable }]);
  });

  it('reports LeagueStatusComparisonUnavailable and omits leagueStatus when only one side has it, without affecting other blocks', () => {
    const previous = successfulImportResult({ leagueStatus: undefined });
    const current = successfulImportResult({ leagueStatus: undefined });

    const result = compareImportResults(previous, current);

    expect(result.succeeded).toBe(true);
    expect(result.teamStatus).toBeDefined();
    expect(result.financialHealth).toBeDefined();
    expect(result.leagueStatus).toBeUndefined();
    expect(result.warnings).toEqual([{ code: ComparisonWarningCode.LeagueStatusComparisonUnavailable }]);
  });
});
