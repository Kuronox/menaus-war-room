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
});
