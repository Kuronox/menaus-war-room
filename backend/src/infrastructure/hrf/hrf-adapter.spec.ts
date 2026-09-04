import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HrfAdapter, HrfFieldMissingError } from './hrf-adapter';
import { HrfSectionParser, type HrfSections } from './hrf-section-parser';

const SAMPLE_HRF_PATH = join(__dirname, '../../../../data/hrf/3301513-2026-09-03.hrf');

describe('HrfAdapter', () => {
  describe('toClubContract', () => {
    it('extracts clubId and name from a real HRF file', () => {
      const rawText = readFileSync(SAMPLE_HRF_PATH, 'utf-8');
      const sections = new HrfSectionParser().parse(rawText);
      const adapter = new HrfAdapter();

      const contract = adapter.toClubContract(sections);

      expect(contract).toEqual({ clubId: '3301513', name: 'Menaus' });
    });

    it('throws when the "[basics]" section is missing entirely', () => {
      const sections: HrfSections = [];
      const adapter = new HrfAdapter();

      expect(() => adapter.toClubContract(sections)).toThrow(HrfFieldMissingError);
    });

    it('throws when "teamID" is missing from "[basics]"', () => {
      const sections: HrfSections = [{ name: 'basics', entries: { teamName: 'Menaus' } }];
      const adapter = new HrfAdapter();

      expect(() => adapter.toClubContract(sections)).toThrow(HrfFieldMissingError);
    });

    it('throws when "teamName" is missing from "[basics]"', () => {
      const sections: HrfSections = [{ name: 'basics', entries: { teamID: '3301513' } }];
      const adapter = new HrfAdapter();

      expect(() => adapter.toClubContract(sections)).toThrow(HrfFieldMissingError);
    });

    it('does not throw when "teamName" is present but an empty string', () => {
      const sections: HrfSections = [
        { name: 'basics', entries: { teamID: '3301513', teamName: '' } },
      ];
      const adapter = new HrfAdapter();

      expect(adapter.toClubContract(sections)).toEqual({ clubId: '3301513', name: '' });
    });
  });

  describe('countPlayers', () => {
    it('counts player sections in a real HRF file, excluding the coach', () => {
      const rawText = readFileSync(SAMPLE_HRF_PATH, 'utf-8');
      const sections = new HrfSectionParser().parse(rawText);
      const adapter = new HrfAdapter();

      // 21 "[player<ID>]" blocks in the sample file, one of which
      // (player512205178) is the coach per [xtra].TrainerID.
      expect(adapter.countPlayers(sections)).toBe(20);
    });

    it('excludes the section matching [xtra].TrainerID', () => {
      const sections: HrfSections = [
        { name: 'xtra', entries: { TrainerID: '999' } },
        { name: 'player999', entries: {} },
        { name: 'player111', entries: {} },
      ];
      const adapter = new HrfAdapter();

      expect(adapter.countPlayers(sections)).toBe(1);
    });

    it('falls back to counting every player section when [xtra].TrainerID is unavailable', () => {
      const sections: HrfSections = [
        { name: 'player111', entries: {} },
        { name: 'player222', entries: {} },
      ];
      const adapter = new HrfAdapter();

      expect(adapter.countPlayers(sections)).toBe(2);
    });

    it('returns 0 when there are no player sections', () => {
      const sections: HrfSections = [{ name: 'basics', entries: {} }];
      const adapter = new HrfAdapter();

      expect(adapter.countPlayers(sections)).toBe(0);
    });
  });
});
