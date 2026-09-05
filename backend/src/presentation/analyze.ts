import { performance } from 'node:perf_hooks';
import { basename } from 'node:path';
import { ImportHrfUseCase } from '../application/import-hrf.use-case';
import {
  ImportErrorCode,
  ImportStep,
  ImportWarningCode,
  type ImportStepOutcome,
  type ImportWarning,
} from '../application/import-result';

const SEPARATOR = '='.repeat(36);

const STEP_LABELS: Record<ImportStep, string> = {
  [ImportStep.FileLoaded]: 'Archivo leído',
  [ImportStep.SectionsParsed]: 'HRF parseado',
  [ImportStep.ContractGenerated]: 'Data Contract generado',
  [ImportStep.ClubCreated]: 'Entidad Club creada',
};

const ERROR_MESSAGES: Record<ImportErrorCode, string> = {
  [ImportErrorCode.FileLoadFailed]: 'no se pudo leer el archivo',
  [ImportErrorCode.MissingRequiredField]: 'falta un campo obligatorio en el HRF',
  [ImportErrorCode.InvalidClub]: 'los datos del club no son válidos',
  [ImportErrorCode.Unknown]: 'error desconocido',
};

// No currency symbol — no source in this project confirms which currency
// these figures are in (see docs/financial-health-design.md).
function formatAmount(amount: number): string {
  return amount.toLocaleString('es');
}

function formatSignedAmount(amount: number): string {
  const formatted = formatAmount(Math.abs(amount));
  return amount < 0 ? `-${formatted}` : `+${formatted}`;
}

const WARNING_MESSAGES: Record<ImportWarningCode, string> = {
  [ImportWarningCode.TeamStatusUnavailable]: 'no se pudo leer el estado del equipo (moral/confianza/entrenamiento)',
  [ImportWarningCode.FinancialHealthUnavailable]: 'no se pudo leer la salud financiera del club',
};

function formatWarning(warning: ImportWarning): string {
  return `⚠ ${WARNING_MESSAGES[warning.code]}`;
}

function formatStep(outcome: ImportStepOutcome): string {
  const label = STEP_LABELS[outcome.step];
  if (outcome.succeeded) {
    return `✓ ${label}`;
  }
  const reason = outcome.errorCode === undefined ? 'error desconocido' : ERROR_MESSAGES[outcome.errorCode];
  return `✗ ${label}: ${reason}`;
}

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
