import { performance } from 'node:perf_hooks';
import { basename } from 'node:path';
import { ImportHrfUseCase } from '../application/import-hrf.use-case';
import { compareHrf } from './compare-hrf';
import { formatAmount, formatSignedAmount, formatStep, formatWarning, SEPARATOR } from './report-formatting';

/**
 * Builds the console report as a list of lines, without printing or
 * exiting — kept separate from `main()` so it is directly testable.
 *
 * Depends only on `ImportHrfUseCase` and `ImportResult` — no
 * HrfFileReader/HrfSectionParser/HrfAdapter/Club here (resolves D-016).
 * Its only job is translating `ImportResult` into the Spanish report the
 * manager sees (`step`/`errorCode`/`warning.code` are English identifiers
 * by design — see docs/import-result-design.md).
 */
export async function analyze(filePath: string): Promise<{ lines: string[]; failed: boolean }> {
  const startedAt = performance.now();

  const useCase = ImportHrfUseCase.create();
  const result = await useCase.execute(filePath);

  const elapsedMs = performance.now() - startedAt;

  const clubDetails: string[] = [];
  if (result.club !== undefined) {
    clubDetails.push('Club:', result.club.name, '', 'ID:', result.club.id, '');
  }

  const summaryDetails: string[] = [];
  if (result.summary !== undefined) {
    summaryDetails.push(
      'Resumen HRF:',
      `Secciones detectadas: ${result.summary.sectionCount}`,
      `Jugadores detectados: ${result.summary.playerCount}`,
      '',
    );
  }

  const teamStatusDetails: string[] = [];
  if (result.teamStatus !== undefined) {
    teamStatusDetails.push(
      'Estado del Equipo:',
      `Moral: ${result.teamStatus.teamSpirit}`,
      `Confianza: ${result.teamStatus.confidence}`,
      `Entrenamiento: ${result.teamStatus.trainingType}`,
      '',
    );
  }

  const financialHealthDetails: string[] = [];
  if (result.financialHealth !== undefined) {
    const { cash, expectedCash, lastWeekBalance, currentWeekProjectedBalance } = result.financialHealth;
    financialHealthDetails.push(
      'Finanzas:',
      `Efectivo actual: ${formatAmount(cash)}`,
      `Efectivo esperado tras la próxima actualización: ${formatAmount(expectedCash)}`,
      `Balance de la semana pasada (cerrada): ${formatSignedAmount(lastWeekBalance)}`,
      `Balance proyectado de esta semana (en curso): ${formatSignedAmount(currentWeekProjectedBalance)}`,
      // UX: explain briefly why, not just "no disponible" — the system
      // does not persist anything between runs yet (no ImportBatch/
      // history, see D-012/TASKS.md), so a real week-over-week trend
      // cannot be computed today, by design, not due to a data gap.
      'Tendencia respecto a tu última importación: no disponible (el sistema aún no conserva historial entre ejecuciones)',
      '',
    );
  }

  const leagueStatusDetails: string[] = [];
  if (result.leagueStatus !== undefined) {
    const { division, position, points, matchesPlayed, goalsFor, goalsAgainst } = result.leagueStatus;
    leagueStatusDetails.push(
      'Liga:',
      `División: ${division}`,
      `Posición: ${position}`,
      `Puntos: ${points} (en ${matchesPlayed} partidos)`,
      `Goles: ${goalsFor} a favor, ${goalsAgainst} en contra`,
      '',
    );
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
    ...teamStatusDetails,
    ...financialHealthDetails,
    ...leagueStatusDetails,
    ...summaryDetails,
    'Estado:',
    '',
    ...result.steps.map(formatStep),
    ...(result.warnings.length > 0 ? ['', 'Avisos:', ...result.warnings.map(formatWarning)] : []),
    '',
    `Tiempo de ejecución: ${elapsedMs.toFixed(2)} ms`,
    '',
    SEPARATOR,
  ];

  return { lines, failed: !result.succeeded };
}

async function main(): Promise<void> {
  const firstPath = process.argv[2];
  const secondPath = process.argv[3];

  if (firstPath === undefined) {
    console.error('Uso: pnpm analyze <ruta-al-archivo.hrf>');
    console.error('     pnpm analyze <hrf-anterior.hrf> <hrf-actual.hrf>');
    process.exitCode = 1;
    return;
  }

  // One path → single-file report (unchanged, D-021 §1). Two paths → the
  // comparison report, built from two independent ImportResult (see
  // docs/hrf-comparison-design.md).
  const { lines, failed } =
    secondPath === undefined ? await analyze(firstPath) : await compareHrf(firstPath, secondPath);
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
