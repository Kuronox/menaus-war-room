import { Injectable } from '@nestjs/common';
import { HrfAdapter, type ClubContract } from '../infrastructure/hrf/hrf-adapter';
import { HrfFileReader } from '../infrastructure/hrf/hrf-file-reader';
import { HrfSectionParser } from '../infrastructure/hrf/hrf-section-parser';

/**
 * Composes the HRF import pipeline end to end: read the raw file, parse
 * its syntax, and adapt it into a Domain Data Contract.
 *
 * Design note: this depends directly on the concrete
 * HrfFileReader/HrfSectionParser/HrfAdapter, not on an abstract Import
 * Port (as source-adapters.md / D-008 describe for the target
 * architecture). That's a deliberate, temporary simplification — with a
 * single real source, an abstract port would be guessing its own shape.
 * Revisit when a second real source (e.g. CHPP) exists to inform it.
 */
@Injectable()
export class ImportHrfUseCase {
  constructor(
    private readonly fileReader: HrfFileReader,
    private readonly sectionParser: HrfSectionParser,
    private readonly hrfAdapter: HrfAdapter,
  ) {}

  async execute(filePath: string): Promise<ClubContract> {
    const rawText = await this.fileReader.readFile(filePath);
    const sections = this.sectionParser.parse(rawText);
    return this.hrfAdapter.toClubContract(sections);
  }
}
