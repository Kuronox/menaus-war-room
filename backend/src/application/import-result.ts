import type { Club } from '../domain/club';
import type { FinancialHealthContract, TeamStatusContract } from '../infrastructure/hrf/hrf-adapter';

/**
 * A pipeline stage `ImportHrfUseCase` completes, named as a fact already
 * accomplished — not an action. See docs/import-result-design.md for why
 * `FileLoaded` (not `FileRead`, which is ambiguous between present and
 * past tense in English) was chosen.
 */
export enum ImportStep {
  FileLoaded = 'FileLoaded',
  SectionsParsed = 'SectionsParsed',
  ContractGenerated = 'ContractGenerated',
  ClubCreated = 'ClubCreated',
}

/**
 * Why a given ImportStep failed. English identifiers only — per CLAUDE.md's
 * Language Policy, Presentation is responsible for translating each one to
 * the Spanish message the manager sees; Application never contains Spanish
 * text.
 */
export enum ImportErrorCode {
  FileLoadFailed = 'FileLoadFailed',
  MissingRequiredField = 'MissingRequiredField',
  InvalidClub = 'InvalidClub',
  Unknown = 'Unknown',
}

export interface ImportStepOutcome {
  step: ImportStep;
  succeeded: boolean;
  /** Present only when succeeded is false. */
  errorCode?: ImportErrorCode;
  /** Original technical message (English), for diagnostics — not meant to be shown to the manager as-is. */
  errorDetail?: string;
}

/** Present only once HrfSectionParser has run — see docs/import-result-design.md. */
export interface ImportSummary {
  sectionCount: number;
  playerCount: number;
}

/**
 * Why a given ImportWarning was raised. English identifiers only, same
 * reasoning as ImportErrorCode. `TeamStatusUnavailable` is the first
 * concrete value — introduced with the team-status story, not
 * anticipated ahead of it (see D-018 and docs/import-result-design.md).
 */
export enum ImportWarningCode {
  TeamStatusUnavailable = 'TeamStatusUnavailable',
  FinancialHealthUnavailable = 'FinancialHealthUnavailable',
}

/**
 * Information relevant to the manager that is not an import failure —
 * e.g. missing opponent data, no previous snapshot to compare against, an
 * unverified field. Never affects `ImportResult.succeeded` — a successful
 * import with warnings is still a success (see docs/import-result-design.md,
 * "Regla de comportamiento: errores vs. warnings").
 */
export interface ImportWarning {
  code: ImportWarningCode;
  detail?: string;
}

/**
 * The result of running the full HRF import pipeline for one file. This
 * is the only thing Presentation depends on to build its report — it
 * never sees HrfFileReader, HrfSectionParser, HrfAdapter, or how `Club`
 * gets constructed. See docs/import-result-design.md.
 */
export interface ImportResult {
  succeeded: boolean;
  /** Present only if every step up to and including ClubCreated succeeded. */
  club?: Club;
  /** One entry per pipeline stage attempted, in execution order. A failed step stops the pipeline — later steps are not attempted. */
  steps: ImportStepOutcome[];
  /** Present only once SectionsParsed succeeded. */
  summary?: ImportSummary;
  /** Present only if the "[team]" section was fully readable — absent (not defaulted) otherwise, with a matching entry in `warnings`. */
  teamStatus?: TeamStatusContract;
  /** Present only if "[economy]" was fully readable — absent (not defaulted) otherwise, with a matching entry in `warnings`. */
  financialHealth?: FinancialHealthContract;
  warnings: ImportWarning[];
}
