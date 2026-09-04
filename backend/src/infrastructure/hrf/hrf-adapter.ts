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
