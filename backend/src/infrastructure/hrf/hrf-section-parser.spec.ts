import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HrfSectionParser } from './hrf-section-parser';

const SAMPLE_HRF_PATH = join(__dirname, '../../../../data/hrf/3301513-2026-09-03.hrf');

describe('HrfSectionParser', () => {
  describe('against a real HRF file', () => {
    const rawText = readFileSync(SAMPLE_HRF_PATH, 'utf-8');
    const parser = new HrfSectionParser();
    const sections = parser.parse(rawText);

    it('groups keys under their section', () => {
      const basics = sections.find((s) => s.name === 'basics');

      expect(basics).toBeDefined();
      expect(basics?.entries.teamName).toBe('Menaus');
      expect(basics?.entries.teamID).toBe('3301513');
    });

    it('keeps every value as a raw string, with no type coercion', () => {
      const economy = sections.find((s) => s.name === 'economy');
      const basics = sections.find((s) => s.name === 'basics');

      // A field that is semantically a number is still just the string "15367994".
      expect(economy?.entries.Cash).toBe('15367994');
      // A field that is semantically a boolean is still just the string "True".
      expect(basics?.entries.hasSupporter).toBe('True');
    });

    it('preserves an explicitly empty value as an empty string, not as missing', () => {
      const basics = sections.find((s) => s.name === 'basics');

      expect(basics?.entries.ownerHomepage).toBe('');
    });

    it('parses a player section named after its numeric id', () => {
      const player = sections.find((s) => s.name === 'player512205179');

      expect(player?.entries.name).toBe('Óscar Ayala');
    });
  });

  describe('syntax handling (synthetic input)', () => {
    const parser = new HrfSectionParser();

    it('returns an empty structure for empty input', () => {
      expect(parser.parse('')).toEqual([]);
    });

    it('splits only on the first "=", keeping the rest of the line as the value', () => {
      const sections = parser.parse('[basics]\nStatement=he said: x=y\n');

      expect(sections).toEqual([{ name: 'basics', entries: { Statement: 'he said: x=y' } }]);
    });

    it('ignores blank lines between and within sections', () => {
      const sections = parser.parse('[a]\nk1=v1\n\n[b]\n\nk2=v2\n');

      expect(sections).toEqual([
        { name: 'a', entries: { k1: 'v1' } },
        { name: 'b', entries: { k2: 'v2' } },
      ]);
    });

    it('strips a trailing "\\r" from CRLF line endings', () => {
      const sections = parser.parse('[a]\r\nk1=v1\r\n');

      expect(sections).toEqual([{ name: 'a', entries: { k1: 'v1' } }]);
    });

    it('ignores a key=value line that appears before any section header', () => {
      const sections = parser.parse('orphan=value\n[a]\nk1=v1\n');

      expect(sections).toEqual([{ name: 'a', entries: { k1: 'v1' } }]);
    });

    it('ignores a line that is neither a section header nor a key=value pair', () => {
      const sections = parser.parse('[a]\nk1=v1\nnot a valid line\nk2=v2\n');

      expect(sections).toEqual([{ name: 'a', entries: { k1: 'v1', k2: 'v2' } }]);
    });

    it('keeps two sections with the same name as two separate entries, in file order', () => {
      const sections = parser.parse('[a]\nk1=v1\n[a]\nk2=v2\n');

      expect(sections).toEqual([
        { name: 'a', entries: { k1: 'v1' } },
        { name: 'a', entries: { k2: 'v2' } },
      ]);
    });
  });
});
