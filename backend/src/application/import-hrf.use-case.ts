import { Injectable } from '@nestjs/common';
import { Club, InvalidClubError } from '../domain/club';
import { HrfAdapter, HrfFieldMissingError } from '../infrastructure/hrf/hrf-adapter';
import { HrfFileReader } from '../infrastructure/hrf/hrf-file-reader';
import { HrfSectionParser } from '../infrastructure/hrf/hrf-section-parser';
import {
  ImportErrorCode,
  ImportStep,
  ImportWarningCode,
  type ImportResult,
  type ImportStepOutcome,
  type ImportSummary,
  type ImportWarning,
} from './import-result';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs the full HRF import pipeline for one file: load it, parse its
 * syntax, adapt it into a Data Contract, and construct the resulting
 * Domain entities — returning a single ImportResult that is all
 * Presentation needs (see docs/import-result-design.md).
 *
 * HrfFileReader, HrfSectionParser, HrfAdapter and Club.create() are fully
 * encapsulated here — nothing outside this class touches them directly
 * for this pipeline. A failed step stops the pipeline (later steps are
 * not attempted). Team status and financial health are best-effort
 * enrichments: their failure never stops the pipeline, it is recorded as
 * an `ImportWarning` instead — see import-result.ts.
 *
 * Design note (D-015): depends directly on the concrete
 * HrfFileReader/HrfSectionParser/HrfAdapter, not on an abstract Import
 * Port — accepted as temporary technical debt while HRF is the only
 * import source.
 */
@Injectable()
export class ImportHrfUseCase {
  constructor(
    private readonly fileReader: HrfFileReader,
    private readonly sectionParser: HrfSectionParser,
    private readonly hrfAdapter: HrfAdapter,
  ) {}

  /**
   * Convenience factory for manual construction outside the NestJS DI
   * container (e.g. from a CLI entry point) — wires the concrete
   * Infrastructure implementations directly, consistent with D-015.
   * Prefer constructor injection once real DI wiring exists.
   */
  static create(): ImportHrfUseCase {
    return new ImportHrfUseCase(new HrfFileReader(), new HrfSectionParser(), new HrfAdapter());
  }

  async execute(filePath: string): Promise<ImportResult> {
    const steps: ImportStepOutcome[] = [];
    const warnings: ImportWarning[] = [];

    let rawText: string;
    try {
      rawText = await this.fileReader.readFile(filePath);
    } catch (error) {
      steps.push({
        step: ImportStep.FileLoaded,
        succeeded: false,
        errorCode: ImportErrorCode.FileLoadFailed,
        errorDetail: errorMessage(error),
      });
      return { succeeded: false, steps, warnings };
    }
    steps.push({ step: ImportStep.FileLoaded, succeeded: true });

    // HrfSectionParser never throws — unrecognized lines are skipped, not
    // rejected (see HU4) — so this step cannot fail on its own.
    const sections = this.sectionParser.parse(rawText);
    steps.push({ step: ImportStep.SectionsParsed, succeeded: true });

    const summary: ImportSummary = {
      sectionCount: sections.length,
      playerCount: this.hrfAdapter.countPlayers(sections),
    };

    // Team status and financial health are independent, best-effort
    // enrichments — not core pipeline steps: their absence is a warning,
    // never a reason to fail the whole import (see
    // docs/import-result-design.md, "Regla de comportamiento: errores vs.
    // warnings").
    let teamStatus: ImportResult['teamStatus'];
    try {
      teamStatus = this.hrfAdapter.toTeamStatusContract(sections);
    } catch (error) {
      warnings.push({ code: ImportWarningCode.TeamStatusUnavailable, detail: errorMessage(error) });
    }

    let financialHealth: ImportResult['financialHealth'];
    try {
      financialHealth = this.hrfAdapter.toFinancialHealthContract(sections);
    } catch (error) {
      warnings.push({ code: ImportWarningCode.FinancialHealthUnavailable, detail: errorMessage(error) });
    }

    let clubId: string;
    let clubName: string;
    try {
      const contract = this.hrfAdapter.toClubContract(sections);
      clubId = contract.clubId;
      clubName = contract.name;
    } catch (error) {
      steps.push({
        step: ImportStep.ContractGenerated,
        succeeded: false,
        errorCode:
          error instanceof HrfFieldMissingError
            ? ImportErrorCode.MissingRequiredField
            : ImportErrorCode.Unknown,
        errorDetail: errorMessage(error),
      });
      return { succeeded: false, steps, summary, teamStatus, financialHealth, warnings };
    }
    steps.push({ step: ImportStep.ContractGenerated, succeeded: true });

    try {
      const club = Club.create(clubId, clubName);
      steps.push({ step: ImportStep.ClubCreated, succeeded: true });
      return { succeeded: true, club, steps, summary, teamStatus, financialHealth, warnings };
    } catch (error) {
      steps.push({
        step: ImportStep.ClubCreated,
        succeeded: false,
        errorCode: error instanceof InvalidClubError ? ImportErrorCode.InvalidClub : ImportErrorCode.Unknown,
        errorDetail: errorMessage(error),
      });
      return { succeeded: false, steps, summary, teamStatus, financialHealth, warnings };
    }
  }
}
