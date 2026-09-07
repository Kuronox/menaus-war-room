import type {
  FinancialHealthContract,
  LeagueStatusContract,
  TeamStatusContract,
} from '../infrastructure/hrf/hrf-adapter';
import type { ImportResult } from './import-result';

/**
 * Why `compareImportResults` could not produce a comparison at all —
 * English identifiers only, same policy as ImportErrorCode. See
 * docs/hrf-comparison-design.md.
 */
export enum ComparisonErrorCode {
  PreviousImportFailed = 'PreviousImportFailed',
  CurrentImportFailed = 'CurrentImportFailed',
  ClubMismatch = 'ClubMismatch',
}

/**
 * Why one specific comparison block (not the whole comparison) is
 * missing — mirrors ImportWarningCode: never stops the comparison, just
 * omits that one block.
 */
export enum ComparisonWarningCode {
  TeamStatusComparisonUnavailable = 'TeamStatusComparisonUnavailable',
  FinancialHealthComparisonUnavailable = 'FinancialHealthComparisonUnavailable',
  LeagueStatusComparisonUnavailable = 'LeagueStatusComparisonUnavailable',
}

export interface ComparisonWarning {
  code: ComparisonWarningCode;
}

/**
 * A text field carried through as-is from both imports. Presentation only
 * interpolates `previous`/`current` — it never decides whether the value
 * "changed" (see docs/hrf-comparison-design.md: no derived label for
 * categorical fields, no scale exists to judge them).
 */
export interface TextFieldComparison {
  previous: string;
  current: string;
}

/**
 * A numeric field with its difference already computed here, in
 * Application — Presentation only formats `delta`, it never subtracts
 * `previous` from `current` itself (see docs/hrf-comparison-design.md).
 */
export interface NumericFieldComparison {
  previous: number;
  current: number;
  delta: number;
}

export interface TeamStatusComparison {
  teamSpirit: TextFieldComparison;
  confidence: TextFieldComparison;
  trainingType: TextFieldComparison;
}

export interface FinancialHealthComparison {
  cash: NumericFieldComparison;
  expectedCash: NumericFieldComparison;
  lastWeekBalance: NumericFieldComparison;
  currentWeekProjectedBalance: NumericFieldComparison;
}

export interface LeagueStatusComparison {
  division: TextFieldComparison;
  position: NumericFieldComparison;
  points: NumericFieldComparison;
  matchesPlayed: NumericFieldComparison;
  goalsFor: NumericFieldComparison;
  goalsAgainst: NumericFieldComparison;
}

/**
 * The result of comparing two ImportResult. This is the only thing
 * Presentation depends on to build the comparison report — it never sees
 * the raw contracts side by side, and every difference it needs to show
 * is already computed here. See docs/hrf-comparison-design.md.
 */
export interface ComparisonResult {
  succeeded: boolean;
  /** Present only if succeeded is false. */
  errorCode?: ComparisonErrorCode;
  /** Present only if succeeded is true. */
  club?: { id: string; name: string };
  /** Present only if both imports had a teamStatus — absent otherwise, with a matching entry in `warnings`. */
  teamStatus?: TeamStatusComparison;
  /** Present only if both imports had a financialHealth — absent otherwise, with a matching entry in `warnings`. */
  financialHealth?: FinancialHealthComparison;
  /** Present only if both imports had a leagueStatus — absent otherwise, with a matching entry in `warnings`. */
  leagueStatus?: LeagueStatusComparison;
  warnings: ComparisonWarning[];
}

function textField(previous: string, current: string): TextFieldComparison {
  return { previous, current };
}

function numericField(previous: number, current: number): NumericFieldComparison {
  return { previous, current, delta: current - previous };
}

function compareTeamStatus(previous: TeamStatusContract, current: TeamStatusContract): TeamStatusComparison {
  return {
    teamSpirit: textField(previous.teamSpirit, current.teamSpirit),
    confidence: textField(previous.confidence, current.confidence),
    trainingType: textField(previous.trainingType, current.trainingType),
  };
}

function compareFinancialHealth(
  previous: FinancialHealthContract,
  current: FinancialHealthContract,
): FinancialHealthComparison {
  return {
    cash: numericField(previous.cash, current.cash),
    expectedCash: numericField(previous.expectedCash, current.expectedCash),
    lastWeekBalance: numericField(previous.lastWeekBalance, current.lastWeekBalance),
    currentWeekProjectedBalance: numericField(
      previous.currentWeekProjectedBalance,
      current.currentWeekProjectedBalance,
    ),
  };
}

function compareLeagueStatus(previous: LeagueStatusContract, current: LeagueStatusContract): LeagueStatusComparison {
  return {
    division: textField(previous.division, current.division),
    position: numericField(previous.position, current.position),
    points: numericField(previous.points, current.points),
    matchesPlayed: numericField(previous.matchesPlayed, current.matchesPlayed),
    goalsFor: numericField(previous.goalsFor, current.goalsFor),
    goalsAgainst: numericField(previous.goalsAgainst, current.goalsAgainst),
  };
}

/**
 * Compares two ImportResult — one per HRF file, both already produced by
 * ImportHrfUseCase.execute() — into a ComparisonResult. Pure function: no
 * file access, no HrfFileReader/HrfSectionParser/HrfAdapter involved (see
 * docs/hrf-comparison-design.md, D-021).
 *
 * `previous` is the older HRF, `current` is the newer one — the caller
 * decides which is which; this function never infers it from filenames or
 * dates.
 *
 * Comparing two different clubs is not attempted: if `previous.club.id`
 * and `current.club.id` differ, the comparison fails with `ClubMismatch`
 * rather than producing a result that looks valid.
 */
export function compareImportResults(previous: ImportResult, current: ImportResult): ComparisonResult {
  if (!previous.succeeded || previous.club === undefined) {
    return { succeeded: false, errorCode: ComparisonErrorCode.PreviousImportFailed, warnings: [] };
  }
  if (!current.succeeded || current.club === undefined) {
    return { succeeded: false, errorCode: ComparisonErrorCode.CurrentImportFailed, warnings: [] };
  }
  if (previous.club.id !== current.club.id) {
    return { succeeded: false, errorCode: ComparisonErrorCode.ClubMismatch, warnings: [] };
  }

  const warnings: ComparisonWarning[] = [];

  let teamStatus: ComparisonResult['teamStatus'];
  if (previous.teamStatus !== undefined && current.teamStatus !== undefined) {
    teamStatus = compareTeamStatus(previous.teamStatus, current.teamStatus);
  } else {
    warnings.push({ code: ComparisonWarningCode.TeamStatusComparisonUnavailable });
  }

  let financialHealth: ComparisonResult['financialHealth'];
  if (previous.financialHealth !== undefined && current.financialHealth !== undefined) {
    financialHealth = compareFinancialHealth(previous.financialHealth, current.financialHealth);
  } else {
    warnings.push({ code: ComparisonWarningCode.FinancialHealthComparisonUnavailable });
  }

  let leagueStatus: ComparisonResult['leagueStatus'];
  if (previous.leagueStatus !== undefined && current.leagueStatus !== undefined) {
    leagueStatus = compareLeagueStatus(previous.leagueStatus, current.leagueStatus);
  } else {
    warnings.push({ code: ComparisonWarningCode.LeagueStatusComparisonUnavailable });
  }

  return {
    succeeded: true,
    club: { id: current.club.id, name: current.club.name },
    teamStatus,
    financialHealth,
    leagueStatus,
    warnings,
  };
}
