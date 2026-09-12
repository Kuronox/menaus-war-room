import { ImportErrorCode, ImportStep, ImportWarningCode } from '../application/import-result';
import type { ImportStepOutcome, ImportWarning } from '../application/import-result';

/**
 * Formatting shared by every `pnpm analyze` report (single-file and
 * comparison) — kept in its own module, separate from `analyze.ts` and
 * `compare-hrf.ts`, so neither one has to import the other just to reach
 * these helpers.
 */
export const SEPARATOR = '='.repeat(36);

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

const WARNING_MESSAGES: Record<ImportWarningCode, string> = {
  [ImportWarningCode.TeamStatusUnavailable]: 'no se pudo leer el estado del equipo (moral/confianza/entrenamiento)',
  [ImportWarningCode.FinancialHealthUnavailable]: 'no se pudo leer la salud financiera del club',
  [ImportWarningCode.LeagueStatusUnavailable]: 'no se pudo leer la posición en la liga',
  [ImportWarningCode.RosterUnavailable]: 'no se pudo leer la plantilla de jugadores',
};

// Groups an unsigned digit string into thousands with ".", Spanish-style
// (e.g. "4245" -> "4.245"). Implemented by hand, deterministically —
// `(4245).toLocaleString('es')` was found to only group numbers >= 10.000
// in this runtime (e.g. `(10000).toLocaleString('es')` -> "10.000" but
// `(4245).toLocaleString('es')` -> "4245", no separator), which is a
// property of the runtime's ICU data, not of the number itself. Relying on
// it would make the report's formatting depend on where it runs.
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// No currency symbol — no source in this project confirms which currency
// these figures are in (see docs/financial-health-design.md). Every amount
// this project reads from the HRF is a whole number (Cash, points, goals,
// etc.), so fractional values are not handled here.
export function formatAmount(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${groupThousands(Math.trunc(Math.abs(amount)).toString())}`;
}

export function formatSignedAmount(amount: number): string {
  const formatted = formatAmount(Math.abs(amount));
  return amount < 0 ? `-${formatted}` : `+${formatted}`;
}

export function formatWarning(warning: ImportWarning): string {
  return `⚠ ${WARNING_MESSAGES[warning.code]}`;
}

export function formatStep(outcome: ImportStepOutcome): string {
  const label = STEP_LABELS[outcome.step];
  if (outcome.succeeded) {
    return `✓ ${label}`;
  }
  const reason = outcome.errorCode === undefined ? 'error desconocido' : ERROR_MESSAGES[outcome.errorCode];
  return `✗ ${label}: ${reason}`;
}
