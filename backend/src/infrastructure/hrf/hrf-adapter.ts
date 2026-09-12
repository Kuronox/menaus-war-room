import { Injectable } from '@nestjs/common';
import type { HrfSections, Section } from './hrf-section-parser';

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
 * The club's own league standing this season — see
 * docs/data-contracts.md. Canonical names, never the HRF originals
 * (`serie`, `placering`, `poang`, `spelade`, `gjorda`, `inslappta`). Only
 * what the HRF states directly — no wins/draws/losses or any other
 * figure derived from these, since more than one combination of
 * results can produce the same points total.
 */
export interface LeagueStatusContract {
  division: string;
  position: number;
  points: number;
  matchesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * One player's roster summary — see docs/roster-design.md. Unlike the
 * other contracts, almost every field is optional: a missing per-player
 * field never excludes that player from the roster, it is reported as
 * "unavailable" for that one field (Presentation's job) instead of
 * hiding the whole row.
 *
 * `speciality` and `injuryWeeksRemaining` both distinguish three states,
 * not two: a value, `null` (a confirmed fact — no speciality / no active
 * injury), and `undefined` (the source field was missing entirely — we
 * don't know). Never invent one for the other (see docs/roster-design.md).
 */
export interface PlayerSummaryContract {
  playerId: string;
  name?: string;
  age?: number;
  speciality?: string | null;
  injuryWeeksRemaining?: number | null;
  accumulatedWarnings?: number;
  lastMatchRating?: number;
  lastMatchPlayedMinutes?: number;
  lastMatchDate?: string;
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

    return {
      teamSpirit: this.requireString(team.entries, 'stamning', 'team'),
      confidence: this.requireString(team.entries, 'sjalvfortroende', 'team'),
      trainingType: this.requireString(team.entries, 'trType', 'team'),
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

  toLeagueStatusContract(sections: HrfSections): LeagueStatusContract {
    const league = sections.find((section) => section.name === 'league');
    if (league === undefined) {
      throw new HrfFieldMissingError('HRF file is missing required section "[league]"');
    }

    return {
      division: this.requireString(league.entries, 'serie', 'league'),
      position: this.requireNumber(league.entries, 'placering', 'league'),
      points: this.requireNumber(league.entries, 'poang', 'league'),
      matchesPlayed: this.requireNumber(league.entries, 'spelade', 'league'),
      goalsFor: this.requireNumber(league.entries, 'gjorda', 'league'),
      goalsAgainst: this.requireNumber(league.entries, 'inslappta', 'league'),
    };
  }

  /**
   * One summary row per player in the squad — see docs/roster-design.md.
   * Excludes the coach, same criterion as countPlayers(). Throws only
   * when there is no player section to build a roster from at all; a
   * player missing an individual field is still included, with that
   * field left undefined.
   */
  toRosterContract(sections: HrfSections): PlayerSummaryContract[] {
    const playerSections = this.getPlayerSections(sections);
    if (playerSections.length === 0) {
      throw new HrfFieldMissingError('HRF file has no "[player<ID>]" sections to build a roster from');
    }

    return playerSections.map((section) => this.toPlayerSummary(section));
  }

  private toPlayerSummary(section: Section): PlayerSummaryContract {
    const { entries } = section;
    return {
      playerId: section.name.replace(/^player/, ''),
      name: this.optionalString(entries, 'name'),
      age: this.optionalNumber(entries, 'ald'),
      speciality: this.optionalSpeciality(entries),
      injuryWeeksRemaining: this.optionalInjuryWeeksRemaining(entries),
      accumulatedWarnings: this.optionalNumber(entries, 'warnings'),
      lastMatchRating: this.optionalNumber(entries, 'LastMatch_Rating'),
      lastMatchPlayedMinutes: this.optionalNumber(entries, 'LastMatch_PlayedMinutes'),
      lastMatchDate: this.optionalString(entries, 'LastMatch_Date'),
    };
  }

  /**
   * Every `[player<ID>]` section, excluding the coach — shared by
   * countPlayers() and toRosterContract() so both apply the exact same
   * criterion. Relies on `[xtra].TrainerID` (✅-confirmed in Sprint 0); if
   * that reference is unavailable, falls back to every `[player<ID>]`
   * section, coach included, same as before this method was extracted.
   */
  private getPlayerSections(sections: HrfSections): Section[] {
    const xtra = sections.find((section) => section.name === 'xtra');
    const trainerId = xtra?.entries.TrainerID;
    const trainerSectionName = trainerId === undefined ? undefined : `player${trainerId}`;

    return sections.filter(
      (section) => /^player\d+$/.test(section.name) && section.name !== trainerSectionName,
    );
  }

  /** Absent or blank → undefined. Never throws — for fields where a per-player gap is acceptable. */
  private optionalString(entries: Record<string, string>, key: string): string | undefined {
    if (!(key in entries) || entries[key].trim().length === 0) {
      return undefined;
    }
    return entries[key];
  }

  /** Absent, blank, or not a valid number → undefined. Never throws. */
  private optionalNumber(entries: Record<string, string>, key: string): number | undefined {
    if (!(key in entries) || entries[key].trim().length === 0) {
      return undefined;
    }
    const value = Number(entries[key]);
    return Number.isNaN(value) ? undefined : value;
  }

  /**
   * `specialityLabel` absent → undefined (unknown). Present but blank →
   * `null` (a confirmed fact: `speciality=0`, no speciality — see
   * hrf-data-dictionary.md). Present and non-blank → the label itself.
   */
  private optionalSpeciality(entries: Record<string, string>): string | null | undefined {
    if (!('specialityLabel' in entries)) {
      return undefined;
    }
    return entries.specialityLabel.trim().length === 0 ? null : entries.specialityLabel;
  }

  /**
   * `ska` absent → undefined (unknown). `ska=-1` → `null` (confirmed no
   * active injury — see docs/roster-design.md on why `-1` is treated this
   * way despite not being part of the officially documented scale).
   * Any other valid number → weeks remaining, as-is.
   */
  private optionalInjuryWeeksRemaining(entries: Record<string, string>): number | null | undefined {
    const value = this.optionalNumber(entries, 'ska');
    if (value === undefined) {
      return undefined;
    }
    return value === -1 ? null : value;
  }

  private requireString(entries: Record<string, string>, key: string, sectionName: string): string {
    if (!(key in entries) || entries[key].trim().length === 0) {
      throw new HrfFieldMissingError(
        `HRF file is missing required field "${key}" in section "[${sectionName}]"`,
      );
    }

    return entries[key];
  }

  private requireNumber(entries: Record<string, string>, key: string, sectionName: string): number {
    // An empty/blank value is treated the same as an absent key — not as
    // zero. `Number('')` is `0` in JavaScript, which would otherwise turn
    // "no data" into a fabricated real value, violating the "never
    // invent" principle already applied elsewhere in this adapter.
    if (!(key in entries) || entries[key].trim().length === 0) {
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
    return this.getPlayerSections(sections).length;
  }
}
