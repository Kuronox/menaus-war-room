import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Club } from '../domain/club';
import { ImportErrorCode, ImportStep, ImportWarningCode } from './import-result';
import { ImportHrfUseCase } from './import-hrf.use-case';

const SAMPLE_HRF_PATH = join(__dirname, '../../../data/hrf/3301513-2026-08-28.hrf');

let tempDir: string | undefined;

async function writeTempHrf(content: string): Promise<string> {
  tempDir = await mkdtemp(join(tmpdir(), 'menaus-hrf-'));
  const filePath = join(tempDir, 'test.hrf');
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

afterEach(async () => {
  if (tempDir !== undefined) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe('ImportHrfUseCase', () => {
  it('returns a successful ImportResult for a real HRF file, with club, summary and every step succeeded', async () => {
    const useCase = ImportHrfUseCase.create();

    const result = await useCase.execute(SAMPLE_HRF_PATH);

    expect(result.succeeded).toBe(true);
    expect(result.club).toBeInstanceOf(Club);
    expect(result.club?.id).toBe('3301513');
    expect(result.club?.name).toBe('Menaus');
    expect(result.summary).toEqual({ sectionCount: 31, playerCount: 20 });
    expect(result.teamStatus).toEqual({
      teamSpirit: 'serenos',
      confidence: 'Muy baja',
      trainingType: 'Jugadas',
    });
    expect(result.financialHealth).toEqual({
      cash: 15105114,
      expectedCash: 15367994,
      lastWeekBalance: 258635,
      currentWeekProjectedBalance: 262880,
    });
    expect(result.warnings).toEqual([]);
    expect(result.steps.map((s) => [s.step, s.succeeded])).toEqual([
      [ImportStep.FileLoaded, true],
      [ImportStep.SectionsParsed, true],
      [ImportStep.ContractGenerated, true],
      [ImportStep.ClubCreated, true],
    ]);
  });

  it('stops at FileLoaded when the file does not exist, without attempting later steps', async () => {
    const useCase = ImportHrfUseCase.create();

    const result = await useCase.execute(join(__dirname, 'does-not-exist.hrf'));

    expect(result.succeeded).toBe(false);
    expect(result.club).toBeUndefined();
    expect(result.summary).toBeUndefined();
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({
      step: ImportStep.FileLoaded,
      succeeded: false,
      errorCode: ImportErrorCode.FileLoadFailed,
    });
  });

  it('stops at ContractGenerated when a required field is missing, but still reports the summary', async () => {
    const filePath = await writeTempHrf('[basics]\nteamName=Menaus\n');
    const useCase = ImportHrfUseCase.create();

    const result = await useCase.execute(filePath);

    expect(result.succeeded).toBe(false);
    expect(result.club).toBeUndefined();
    expect(result.summary).toEqual({ sectionCount: 1, playerCount: 0 });
    expect(result.steps.map((s) => s.step)).toEqual([
      ImportStep.FileLoaded,
      ImportStep.SectionsParsed,
      ImportStep.ContractGenerated,
    ]);
    expect(result.steps.at(-1)).toMatchObject({
      succeeded: false,
      errorCode: ImportErrorCode.MissingRequiredField,
    });
  });

  it('reports warnings (not a failure) when "[team]" and "[economy]" are unavailable, and still succeeds', async () => {
    const filePath = await writeTempHrf('[basics]\nteamID=1\nteamName=Test\n');
    const useCase = ImportHrfUseCase.create();

    const result = await useCase.execute(filePath);

    expect(result.succeeded).toBe(true);
    expect(result.club).toBeInstanceOf(Club);
    expect(result.teamStatus).toBeUndefined();
    expect(result.financialHealth).toBeUndefined();
    expect(result.warnings).toEqual([
      { code: ImportWarningCode.TeamStatusUnavailable, detail: expect.any(String) },
      { code: ImportWarningCode.FinancialHealthUnavailable, detail: expect.any(String) },
    ]);
  });

  it('stops at ClubCreated when the club data violates a domain invariant', async () => {
    const filePath = await writeTempHrf('[basics]\nteamID=1\nteamName=   \n');
    const useCase = ImportHrfUseCase.create();

    const result = await useCase.execute(filePath);

    expect(result.succeeded).toBe(false);
    expect(result.club).toBeUndefined();
    expect(result.steps.map((s) => s.step)).toEqual([
      ImportStep.FileLoaded,
      ImportStep.SectionsParsed,
      ImportStep.ContractGenerated,
      ImportStep.ClubCreated,
    ]);
    expect(result.steps.at(-1)).toMatchObject({
      succeeded: false,
      errorCode: ImportErrorCode.InvalidClub,
    });
  });
});
