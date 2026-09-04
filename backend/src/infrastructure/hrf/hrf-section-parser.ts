import { Injectable } from '@nestjs/common';

/**
 * A single `[name]` block of an HRF file, with its raw key/value entries.
 */
export interface Section {
  name: string;
  entries: Record<string, string>;
}

/**
 * A generic, format-only representation of an HRF file: the sequence of
 * sections found in it, in file order. Every value is the untouched
 * string from the file — no type coercion, no interpretation of what any
 * key means. Two sections sharing the same name are kept as two separate
 * entries, exactly as the file had them — this parser does not decide
 * that they should be merged.
 */
export type HrfSections = Section[];

/**
 * Parses the raw text of an HRF file into a generic section/key-value
 * structure.
 *
 * This parser knows only the HRF *syntax* — `[section]` headers and
 * `key=value` lines. It has no knowledge of Hattrick concepts, does not
 * interpret what any field means, and does not build any domain object.
 * That translation is a separate responsibility (see HrfAdapter, a later
 * story).
 */
@Injectable()
export class HrfSectionParser {
  parse(rawText: string): HrfSections {
    const sections: Section[] = [];
    let currentSection: Section | null = null;

    for (const rawLine of rawText.split('\n')) {
      // The sample files end with a stray trailing "\r" on an otherwise
      // empty line — stripping a trailing "\r" here is the only line
      // normalization this parser does; nothing else is trimmed.
      const line = rawLine.replace(/\r$/, '');

      if (line.length === 0) {
        continue;
      }

      const sectionMatch = /^\[(.+)\]$/.exec(line);
      if (sectionMatch) {
        currentSection = { name: sectionMatch[1], entries: {} };
        sections.push(currentSection);
        continue;
      }

      if (currentSection === null) {
        // A key/value line before any section header has no section to
        // belong to. Not observed in any real sample file — skipped
        // rather than guessing where it should go.
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        // A line that is neither a section header nor a key=value pair.
        // Not observed in any real sample file — skipped rather than
        // failing the whole parse for one unrecognized line.
        continue;
      }

      const key = line.slice(0, separatorIndex);
      const value = line.slice(separatorIndex + 1);
      currentSection.entries[key] = value;
    }

    return sections;
  }
}
