import { performance } from 'node:perf_hooks';
import { basename } from 'node:path';
import { Club } from '../domain/club';
import { HrfAdapter, type ClubContract } from '../infrastructure/hrf/hrf-adapter';
import { HrfFileReader } from '../infrastructure/hrf/hrf-file-reader';
import { HrfSectionParser, type HrfSections } from '../infrastructure/hrf/hrf-section-parser';

const SEPARATOR = '='.repeat(36);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs the full HRF import pipeline for a single file and builds the
 * console report as a list of lines, without printing or exiting — kept
 * separate from `main()` so it is directly testable.
 *
 * Composes HrfFileReader -> HrfSectionParser -> HrfAdapter -> Club.create()
 * directly, rather than going through ImportHrfUseCase: this report needs
 * the intermediate `Section[]` (to count sections/players) and per-step
 * status, neither of which ImportHrfUseCase currently exposes. That use
 * case remains covered by its own tests and is the piece the future
 * Application<->Domain integration story will extend and put back on this
 * path — see TASKS.md / DECISIONS.md.
 */
export async function analyze(filePath: string): Promise<{ lines: string[]; failed: boolean }> {
  const startedAt = performance.now();
  const status: string[] = [];
  const clubDetails: string[] = [];
  const summaryDetails: string[] = [];
  let failed = false;

  const fileReader = new HrfFileReader();
  const sectionParser = new HrfSectionParser();
  const hrfAdapter = new HrfAdapter();

  let rawText: string | undefined;
  try {
    rawText = await fileReader.readFile(filePath);
    status.push('✓ Archivo leído');
  } catch (error) {
    failed = true;
    status.push(`✗ Archivo leído: ${errorMessage(error)}`);
  }

  let sections: HrfSections | undefined;
  if (rawText !== undefined) {
    // HrfSectionParser never throws (HU4: unrecognized lines are skipped,
    // not rejected), so this step cannot fail on its own.
    sections = sectionParser.parse(rawText);
    status.push('✓ HRF parseado');

    summaryDetails.push(
      'Resumen HRF:',
      `Secciones detectadas: ${sections.length}`,
      `Jugadores detectados: ${hrfAdapter.countPlayers(sections)}`,
      '',
    );
  }

  let contract: ClubContract | undefined;
  if (sections !== undefined) {
    try {
      contract = hrfAdapter.toClubContract(sections);
      status.push('✓ Data Contract generado');
    } catch (error) {
      failed = true;
      status.push(`✗ Data Contract generado: ${errorMessage(error)}`);
    }
  }

  if (contract !== undefined) {
    try {
      const club = Club.create(contract.clubId, contract.name);
      status.push('✓ Entidad Club creada');
      clubDetails.push('Club:', club.name, '', 'ID:', club.id, '');
    } catch (error) {
      failed = true;
      status.push(`✗ Entidad Club creada: ${errorMessage(error)}`);
    }
  }

  const elapsedMs = performance.now() - startedAt;

  const lines = [
    SEPARATOR,
    'MENAUS WAR ROOM',
    SEPARATOR,
    '',
    'Archivo:',
    basename(filePath),
    '',
    ...clubDetails,
    ...summaryDetails,
    'Estado:',
    '',
    ...status,
    '',
    `Tiempo de ejecución: ${elapsedMs.toFixed(2)} ms`,
    '',
    SEPARATOR,
  ];

  return { lines, failed };
}

async function main(): Promise<void> {
  const filePath = process.argv[2];

  if (filePath === undefined) {
    console.error('Uso: pnpm analyze <ruta-al-archivo.hrf>');
    process.exitCode = 1;
    return;
  }

  const { lines, failed } = await analyze(filePath);
  console.log(lines.join('\n'));

  if (failed) {
    process.exitCode = 1;
  }
}

// Only run when executed directly (node dist/presentation/analyze.js),
// not when this module is imported by a test.
if (require.main === module) {
  void main();
}
