import { performance } from 'node:perf_hooks';
import { basename } from 'node:path';
import {
  compareImportResults,
  ComparisonErrorCode,
  ComparisonWarningCode,
  type ComparisonWarning,
} from '../application/compare-import-results';
import { ImportHrfUseCase } from '../application/import-hrf.use-case';
import { formatAmount, formatSignedAmount, formatStep, SEPARATOR } from './report-formatting';

const COMPARISON_WARNING_MESSAGES: Record<ComparisonWarningCode, string> = {
  [ComparisonWarningCode.TeamStatusComparisonUnavailable]:
    'no se pudo comparar el estado del equipo (falta en alguno de los dos archivos)',
  [ComparisonWarningCode.FinancialHealthComparisonUnavailable]:
    'no se pudo comparar la salud financiera (falta en alguno de los dos archivos)',
  [ComparisonWarningCode.LeagueStatusComparisonUnavailable]:
    'no se pudo comparar la posición en la liga (falta en alguno de los dos archivos)',
};

function formatComparisonWarning(warning: ComparisonWarning): string {
  return `⚠ ${COMPARISON_WARNING_MESSAGES[warning.code]}`;
}

/**
 * Builds the comparison report as a list of lines, without printing or
 * exiting — kept separate from `main()` so it is directly testable, same
 * pattern as `analyze()`.
 *
 * Runs `ImportHrfUseCase` once per file and hands both `ImportResult` to
 * `compareImportResults` (Application) — this function never touches
 * HrfFileReader/HrfSectionParser/HrfAdapter, and never subtracts or
 * compares a value itself: every delta it prints was already computed by
 * `compareImportResults`. Its only job is formatting that result in
 * Spanish — see docs/hrf-comparison-design.md.
 */
export async function compareHrf(
  previousPath: string,
  currentPath: string,
): Promise<{ lines: string[]; failed: boolean }> {
  const startedAt = performance.now();

  const useCase = ImportHrfUseCase.create();
  const previousResult = await useCase.execute(previousPath);
  const currentResult = await useCase.execute(currentPath);

  const comparison = compareImportResults(previousResult, currentResult);

  const elapsedMs = performance.now() - startedAt;

  const header = [
    SEPARATOR,
    'MENAUS WAR ROOM — COMPARACIÓN',
    SEPARATOR,
    '',
    'Archivo anterior:',
    basename(previousPath),
    '',
    'Archivo actual:',
    basename(currentPath),
    '',
  ];

  if (!comparison.succeeded) {
    const failureDetails: string[] = [];
    if (comparison.errorCode === ComparisonErrorCode.PreviousImportFailed) {
      failureDetails.push(
        'No se pudo generar la comparación: la importación del HRF anterior falló.',
        '',
        'Estado (HRF anterior):',
        '',
        ...previousResult.steps.map(formatStep),
      );
    } else if (comparison.errorCode === ComparisonErrorCode.CurrentImportFailed) {
      failureDetails.push(
        'No se pudo generar la comparación: la importación del HRF actual falló.',
        '',
        'Estado (HRF actual):',
        '',
        ...currentResult.steps.map(formatStep),
      );
    } else {
      failureDetails.push(
        'No se pudo generar la comparación: los archivos pertenecen a clubes distintos.',
        '',
        `Club anterior: ${previousResult.club?.name ?? 'desconocido'} (ID: ${previousResult.club?.id ?? 'desconocido'})`,
        `Club actual: ${currentResult.club?.name ?? 'desconocido'} (ID: ${currentResult.club?.id ?? 'desconocido'})`,
      );
    }

    const lines = [...header, ...failureDetails, '', `Tiempo de ejecución: ${elapsedMs.toFixed(2)} ms`, '', SEPARATOR];
    return { lines, failed: true };
  }

  const clubDetails: string[] = [];
  if (comparison.club !== undefined) {
    clubDetails.push('Club:', comparison.club.name, '', 'ID:', comparison.club.id, '');
  }

  const teamStatusDetails: string[] = [];
  if (comparison.teamStatus !== undefined) {
    const { teamSpirit, confidence, trainingType } = comparison.teamStatus;
    teamStatusDetails.push(
      'Estado del Equipo:',
      `Moral: ${teamSpirit.previous} → ${teamSpirit.current}`,
      `Confianza: ${confidence.previous} → ${confidence.current}`,
      `Entrenamiento: ${trainingType.previous} → ${trainingType.current}`,
      '',
    );
  }

  const financialHealthDetails: string[] = [];
  if (comparison.financialHealth !== undefined) {
    const { cash, expectedCash, lastWeekBalance, currentWeekProjectedBalance } = comparison.financialHealth;
    financialHealthDetails.push(
      'Finanzas:',
      `Efectivo actual: ${formatAmount(cash.previous)} → ${formatAmount(cash.current)} (${formatSignedAmount(cash.delta)})`,
      `Efectivo esperado tras la próxima actualización: ${formatAmount(expectedCash.previous)} → ${formatAmount(expectedCash.current)} (${formatSignedAmount(expectedCash.delta)})`,
      `Balance de la semana pasada (cerrada): ${formatSignedAmount(lastWeekBalance.previous)} → ${formatSignedAmount(lastWeekBalance.current)} (${formatSignedAmount(lastWeekBalance.delta)})`,
      `Balance proyectado de esta semana (en curso): ${formatSignedAmount(currentWeekProjectedBalance.previous)} → ${formatSignedAmount(currentWeekProjectedBalance.current)} (${formatSignedAmount(currentWeekProjectedBalance.delta)})`,
      '',
    );
  }

  const leagueStatusDetails: string[] = [];
  if (comparison.leagueStatus !== undefined) {
    const { division, position, points, matchesPlayed, goalsFor, goalsAgainst } = comparison.leagueStatus;
    leagueStatusDetails.push(
      'Liga:',
      `División: ${division.previous} → ${division.current}`,
      `Posición: ${position.previous} → ${position.current} (${formatSignedAmount(position.delta)})`,
      `Puntos: ${points.previous} → ${points.current} (${formatSignedAmount(points.delta)})`,
      `Partidos jugados: ${matchesPlayed.previous} → ${matchesPlayed.current} (${formatSignedAmount(matchesPlayed.delta)})`,
      `Goles a favor: ${goalsFor.previous} → ${goalsFor.current} (${formatSignedAmount(goalsFor.delta)})`,
      `Goles en contra: ${goalsAgainst.previous} → ${goalsAgainst.current} (${formatSignedAmount(goalsAgainst.delta)})`,
      '',
    );
  }

  const lines = [
    ...header,
    ...clubDetails,
    ...teamStatusDetails,
    ...financialHealthDetails,
    ...leagueStatusDetails,
    ...(comparison.warnings.length > 0 ? ['Avisos:', ...comparison.warnings.map(formatComparisonWarning), ''] : []),
    `Tiempo de ejecución: ${elapsedMs.toFixed(2)} ms`,
    '',
    SEPARATOR,
  ];

  return { lines, failed: false };
}
