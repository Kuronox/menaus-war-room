import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HrfAdapter } from '../infrastructure/hrf/hrf-adapter';
import { HrfFileReader } from '../infrastructure/hrf/hrf-file-reader';
import { HrfSectionParser } from '../infrastructure/hrf/hrf-section-parser';
import { ImportHrfUseCase } from './import-hrf.use-case';

const SAMPLE_HRF_PATH = join(__dirname, '../../../data/hrf/3301513-2026-09-03.hrf');

function buildUseCase(): ImportHrfUseCase {
  return new ImportHrfUseCase(new HrfFileReader(), new HrfSectionParser(), new HrfAdapter());
}

describe('ImportHrfUseCase', () => {
  it('reads, parses and adapts a real HRF file end to end into a ClubContract', async () => {
    const useCase = buildUseCase();

    const contract = await useCase.execute(SAMPLE_HRF_PATH);

    expect(contract).toEqual({ clubId: '3301513', name: 'Menaus' });
  });

  it('propagates a file-read failure instead of swallowing it', async () => {
    const useCase = buildUseCase();

    await expect(useCase.execute(join(__dirname, 'does-not-exist.hrf'))).rejects.toThrow();
  });
});
