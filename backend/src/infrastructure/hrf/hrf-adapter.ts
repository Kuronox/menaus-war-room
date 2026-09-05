import { Injectable } from '@nestjs/common';
import type { HrfSections } from './hrf-section-parser';

/**
 * The Club-shaped Data Contract this adapter can produce from an HRF file
 * today — see docs/data-contracts.md. Only the two ✅-confirmed fields
 * from Sprint 0 (`teamID`, `teamName`) are extracted; every other Club
 * contract field is left for a later story.
 */
export interface ClubContract {
  clubId: string;
  name: string;
}

/**
 * The club's current team spirit, confidence and training focus — see
 * docs/data-contracts.md. Field names are canonical (`teamSpirit`,
 * `confidence`, `trainingType`), never the HRF originals (`stamning`,
 * `sjalvfortroende`, `trType`) — the Adapter never leaks a source field
 * name into what it returns. Values are passed through exactly as HRF
 * provides them (already Spanish text, e.g. "serenos", "Muy baja",
 * "Jugadas") — no scale, no i18n layer built yet (deliberately out of
 * scope for this story).
 */
export interface TeamStatusContract {
  teamSpirit: string;
  confidence: string;
  trainingType: string;
}

/**
 * The club's financial health this week — see docs/data-contracts.md and
 * docs/financial-health-design.md. Canonical names, never the HRF
 * originals (`Cash`, `ExpectedCash`, `LastWeeksTotal`,
 * `ExpectedWeeksTotal`). No currency symbol is attached anywhere — no
 * source in this project confirms which currency the numbers are in.
 */
export interface FinancialHealthContract {
  cash: number;
  expectedCash: number;
  lastWeekBalance: number;
  currentWeekProjectedBalance: number;
}

/**
 * Thrown when a field required by a Data Contract is not present in the
 * HRF file. Per docs/data-contracts.md: a required field that cannot be
 * provided with certainty must reject the record, not invent a value.
 */
export class HrfFieldMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HrfFieldMissingError';
  }
}

/**
 * Translates the generic section/key-value structure produced by
 * HrfSectionParser into the Domain's Data Contracts — see
 * docs/hrf-mapping-strategy.md. This is the only place in the system that
 * knows an HRF field named "teamID" means a Club's id.
 */
@Injectable()
export class HrfAdapter {
  toClubContract(sections: HrfSections): ClubContract {
    const basics = sections.find((section) => section.name === 'basics');
    if (basics === undefined) {
      throw new HrfFieldMissingError('HRF file is missing required section "[basics]"');
    }

    if (!('teamID' in basics.entries)) {
      throw new HrfFieldMissingError(
        'HRF file is missing required field "teamID" in section "[basics]"',
      );
    }
    if (!('teamName' in basics.entries)) {
      throw new HrfFieldMissingError(
        'HRF file is missing required field "teamName" in section "[basics]"',
      );
    }

    return {
      clubId: basics.entries.teamID,
      name: basics.entries.teamName,
    };
  }

  toTeamStatusContract(sections: HrfSections): TeamStatusContract {
    const team = sections.find((section) => section.name === 'team');
    if (team === undefined) {
      throw new HrfFieldMissingError('HRF file is missing required section "[team]"');
    }

    if (!('stamning' in team.entries)) {
      throw new HrfFieldMissingError(
        'HRF file is missing required field "stamning" in section "[team]"',
      );
    }
    if (!('sjalvfortroende' in team.entries)) {
      throw new HrfFieldMissingError(
        'HRF file is missing required field "sjalvfortroende" in section "[team]"',
      );
    }
    if (!('trType' in team.entries)) {
      throw new HrfFieldMissingError(
        'HRF file is missing required field "trType" in section "[team]"',
      );
    }

    return {
      teamSpirit: team.entries.stamning,
      confidence: team.entries.sjalvfortroende,
      trainingType: team.entries.trType,
    };
  }

  toFinancialHealthContract(sections: HrfSections): FinancialHealthContract {
    const economy = sections.find((section) => section.name === 'economy');
    if (economy === undefined) {
      throw new HrfFieldMissingError('HRF file is missing required section "[economy]"');
    }

    return {
      cash: this.requireNumber(economy.entries, 'Cash', 'economy'),
      expectedCash: this.requireNumber(economy.entries, 'ExpectedCash', 'economy'),
      lastWeekBalance: this.requireNumber(economy.entries, 'LastWeeksTotal', 'economy'),
      currentWeekProjectedBalance: this.requireNumber(economy.entries, 'ExpectedWeeksTotal', 'economy'),
    };
  }

  private requireNumber(entries: Record<string, string>, key: string, sectionName: string): number {
    if (!(key in entries)) {
      throw new HrfFieldMissingError(
        `HRF file is missing required field "${key}" in section "[${sectionName}]"`,
      );
    }

    const value = Number(entries[key]);
    if (Number.isNaN(value)) {
      throw new HrfFieldMissingError(
        `HRF file field "${key}" in section "[${sectionName}]" is not a valid number`,
      );
    }

    return value;
  }

  /**
   * Counts player sections (`[player<ID>]`), excluding the club's coach —
   * Sprint 0 found the coach is also represented as a `[player<ID>]`
   * block. The exclusion relies on `[xtra].TrainerID` (✅-confirmed in
   * Sprint 0); if that reference is unavailable, falls back to counting
   * every `[player<ID>]` section, coach included.
   */
  countPlayers(sections: HrfSections): number {
    const xtra = sections.find((section) => section.name === 'xtra');
    const trainerId = xtra?.entries.TrainerID;
    const trainerSectionName = trainerId === undefined ? undefined : `player${trainerId}`;

    return sections.filter(
      (section) => /^player\d+$/.test(section.name) && section.name !== trainerSectionName,
    ).length;
  }
}
