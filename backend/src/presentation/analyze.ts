import { basename } from 'node:path';
import { ImportHrfUseCase } from '../application/import-hrf.use-case';
import { Club } from '../domain/club';
import { HrfAdapter, HrfFieldMissingError, type ClubContract } from '../infrastructure/hrf/hrf-adapter';
import { HrfFileReader } from '../infrastructure/hrf/hrf-file-reader';
import { HrfSectionParser } from '../infrastructure/hrf/hrf-section-parser';

const SEPARATOR = '='.repeat(36);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs the full HRF import pipeline for a single file and builds the
 * console report as a list of lines, without printing or exiting — kept
 * separate from `main()` so it is directly testable.
 *
 * `ImportHrfUseCase` runs HrfFileReader, HrfSectionParser and HrfAdapter
 * as one atomic step (see its own design note on this). A failure inside
 * it cannot be attributed to one specific stage from the outside — this
 * is a known, documented limitation, not an oversight.
 */
export async function analyze(filePath: string): Promise<{ lines: string[]; failed: boolean }> {
  const status: string[] = [];
  const clubDetails: string[] = [];
  let failed = false;

  const useCase = new ImportHrfUseCase(
    new HrfFileReader(),
    new HrfSectionParser(),
    new HrfAdapter(),
  );

  let contract: ClubContract | undefined;
  try {
    contract = await useCase.execute(filePath);
    status.push('✓ Archivo leído', '✓ HRF parseado', '✓ Data Contract generado');
  } catch (error) {
    failed = true;
    if (error instanceof HrfFieldMissingError) {
      // We know the file was read and parsed (HrfSectionParser never
      // throws — see HU4), so the failure is necessarily in the adapter.
      status.push(
        '✓ Archivo leído',
        '✓ HRF parseado',
        `✗ Data Contract generado: ${error.message}`,
      );
    } else {
      // Any other error (e.g. the file does not exist) happened before
      // the adapter ran. Attributed jointly to "read/parse" because
      // ImportHrfUseCase does not expose which of the two failed.
      status.push(`✗ Archivo leído o HRF parseado: ${errorMessage(error)}`);
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

  const lines = [
    SEPARATOR,
    'MENAUS WAR ROOM',
    SEPARATOR,
    '',
    'Archivo:',
    basename(filePath),
    '',
    ...clubDetails,
    'Estado:',
    '',
    ...status,
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
