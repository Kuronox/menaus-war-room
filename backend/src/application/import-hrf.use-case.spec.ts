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
    expect(result.leagueStatus).toEqual({
      division: 'V.181',
      position: 6,
      points: 3,
      matchesPlayed: 5,
      goalsFor: 4,
      goalsAgainst: 12,
    });
    expect(result.roster).toHaveLength(20);
    expect(result.roster?.some((player) => player.playerId === '512205179')).toBe(true);
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

  it('reports warnings (not a failure) when "[team]", "[economy]", "[league]" and the roster are unavailable, and still succeeds', async () => {
    const filePath = await writeTempHrf('[basics]\nteamID=1\nteamName=Test\n');
    const useCase = ImportHrfUseCase.create();

    const result = await useCase.execute(filePath);

    expect(result.succeeded).toBe(true);
    expect(result.club).toBeInstanceOf(Club);
    expect(result.teamStatus).toBeUndefined();
    expect(result.financialHealth).toBeUndefined();
    expect(result.leagueStatus).toBeUndefined();
    expect(result.roster).toBeUndefined();
    expect(result.warnings).toEqual([
      { code: ImportWarningCode.TeamStatusUnavailable, detail: expect.any(String) },
      { code: ImportWarningCode.FinancialHealthUnavailable, detail: expect.any(String) },
      { code: ImportWarningCode.LeagueStatusUnavailable, detail: expect.any(String) },
      { code: ImportWarningCode.RosterUnavailable, detail: expect.any(String) },
    ]);
  });

  it('reports only LeagueStatusUnavailable when "[league]" alone is missing, with team status, financial health and roster intact', async () => {
    const filePath = await writeTempHrf(
      [
        '[basics]',
        'teamID=1',
        'teamName=Test',
        '[team]',
        'stamning=serenos',
        'sjalvfortroende=Muy baja',
        'trType=Jugadas',
        '[economy]',
        'Cash=100',
        'ExpectedCash=200',
        'LastWeeksTotal=10',
        'ExpectedWeeksTotal=20',
        '[player1]',
        'name=Jugador Uno',
        'ald=25',
        '',
      ].join('\n'),
    );
    const useCase = ImportHrfUseCase.create();

    const result = await useCase.execute(filePath);

    expect(result.succeeded).toBe(true);
    expect(result.club).toBeInstanceOf(Club);
    expect(result.club?.id).toBe('1');
    expect(result.teamStatus).toEqual({
      teamSpirit: 'serenos',
      confidence: 'Muy baja',
      trainingType: 'Jugadas',
    });
    expect(result.financialHealth).toEqual({
      cash: 100,
      expectedCash: 200,
      lastWeekBalance: 10,
      currentWeekProjectedBalance: 20,
    });
    expect(result.leagueStatus).toBeUndefined();
    expect(result.roster).toEqual([{ playerId: '1', name: 'Jugador Uno', age: 25 }]);
    expect(result.warnings).toEqual([
      { code: ImportWarningCode.LeagueStatusUnavailable, detail: expect.any(String) },
    ]);
  });

  it('keeps a player with several missing optional fields in the roster, alongside a fully-populated one, without RosterUnavailable', async () => {
    const filePath = await writeTempHrf(
      [
        '[basics]',
        'teamID=1',
        'teamName=Test',
        '[player1]',
        'name=Jugador Completo',
        'ald=25',
        'specialityLabel=Rápido',
        'ska=-1',
        'warnings=0',
        'LastMatch_Rating=5',
        'LastMatch_PlayedMinutes=90',
        'LastMatch_Date=2026-09-01 00:00:00',
        '[player2]',
        'name=Jugador Incompleto',
        '',
      ].join('\n'),
    );
    const useCase = ImportHrfUseCase.create();

    const result = await useCase.execute(filePath);

    expect(result.succeeded).toBe(true);
    expect(result.roster).toHaveLength(2);
    const incomplete = result.roster?.find((player) => player.playerId === '2');
    // Missing ald/specialityLabel/ska/warnings/LastMatch_* all at once —
    // the player is still present, just without those six fields, never
    // excluded (docs/roster-design.md).
    expect(incomplete).toEqual({ playerId: '2', name: 'Jugador Incompleto' });
    expect(result.roster?.find((player) => player.playerId === '1')).toEqual({
      playerId: '1',
      name: 'Jugador Completo',
      age: 25,
      speciality: 'Rápido',
      injuryWeeksRemaining: null,
      accumulatedWarnings: 0,
      lastMatchRating: 5,
      lastMatchPlayedMinutes: 90,
      lastMatchDate: '2026-09-01 00:00:00',
    });
    expect(result.warnings.some((warning) => warning.code === ImportWarningCode.RosterUnavailable)).toBe(
      false,
    );
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
