import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HrfFileReader } from './hrf-file-reader';

// Real sample file already present in the repository (see Sprint 0).
const SAMPLE_HRF_PATH = join(__dirname, '../../../../data/hrf/3301513-2026-09-03.hrf');

describe('HrfFileReader', () => {
  it('reads the raw text content of a real HRF file', async () => {
    const reader = new HrfFileReader();

    const content = await reader.readFile(SAMPLE_HRF_PATH);

    // startsWith (not just toContain) so a stray BOM character would fail this test.
    expect(content.startsWith('[basics]')).toBe(true);
    expect(content).toContain('teamName=Menaus');
  });

  it('rejects when the file does not exist', async () => {
    const reader = new HrfFileReader();

    await expect(reader.readFile(join(__dirname, 'does-not-exist.hrf'))).rejects.toThrow();
  });
});
