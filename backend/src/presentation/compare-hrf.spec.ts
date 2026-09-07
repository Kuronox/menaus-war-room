import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { compareHrf } from './compare-hrf';
import { formatAmount, formatSignedAmount } from './report-formatting';

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir !== undefined) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

const PREVIOUS_HRF_PATH = join(__dirname, '../../../data/hrf/3301513-2026-08-28.hrf');
const CURRENT_HRF_PATH = join(__dirname, '../../../data/hrf/3301513-2026-09-03.hrf');

describe('compareHrf', () => {
  it('builds a comparison report for two real HRF files, with every delta already computed and no interpretation added', async () => {
    const { lines, failed } = await compareHrf(PREVIOUS_HRF_PATH, CURRENT_HRF_PATH);
    const report = lines.join('\n');

    expect(failed).toBe(false);
    expect(report).toContain('MENAUS WAR ROOM — COMPARACIÓN');
    expect(report).toContain('Archivo anterior:');
    expect(report).toContain('3301513-2026-08-28.hrf');
    expect(report).toContain('Archivo actual:');
    expect(report).toContain('3301513-2026-09-03.hrf');
    expect(report).toContain('Club:');
    expect(report).toContain('Menaus');
    expect(report).toContain('ID:');
    expect(report).toContain('3301513');

    expect(report).toContain('Estado del Equipo:');
    expect(report).toContain('Moral: serenos → serenos');
    expect(report).toContain('Confianza: Muy baja → Muy baja');
    expect(report).toContain('Entrenamiento: Jugadas → Jugadas');
    expect(report).not.toContain('cambió');
    expect(report).not.toContain('sin cambios');

    expect(report).toContain('Finanzas:');
    expect(report).toContain(
      `Efectivo actual: ${formatAmount(15105114)} → ${formatAmount(15367994)} (${formatSignedAmount(262880)})`,
    );
    expect(report).toContain(
      `Efectivo esperado tras la próxima actualización: ${formatAmount(15367994)} → ${formatAmount(16921294)} (${formatSignedAmount(1553300)})`,
    );
    expect(report).toContain(
      `Balance de la semana pasada (cerrada): ${formatSignedAmount(258635)} → ${formatSignedAmount(262880)} (${formatSignedAmount(4245)})`,
    );
    expect(report).toContain(
      `Balance proyectado de esta semana (en curso): ${formatSignedAmount(262880)} → ${formatSignedAmount(1553300)} (${formatSignedAmount(1290420)})`,
    );
    // Explicit, hardcoded literal for the four-digit delta — the exact
    // regression this fix targets (see report-formatting.spec.ts).
    expect(report).toContain('(+4.245)');

    expect(report).toContain('Liga:');
    expect(report).toContain('División: V.181 → V.181');
    expect(report).toContain('Posición: 6 → 5 (-1)');
    expect(report).toContain('Puntos: 3 → 6 (+3)');
    expect(report).toContain('Partidos jugados: 5 → 6 (+1)');
    expect(report).toContain('Goles a favor: 4 → 6 (+2)');
    expect(report).toContain('Goles en contra: 12 → 12 (+0)');

    expect(report).not.toContain('Avisos:');
    expect(report).toMatch(/Tiempo de ejecución: \d+(\.\d+)? ms/);
  });

  it('produces all-zero deltas and identical values when the same file is compared against itself', async () => {
    const { lines, failed } = await compareHrf(PREVIOUS_HRF_PATH, PREVIOUS_HRF_PATH);
    const report = lines.join('\n');

    expect(failed).toBe(false);
    expect(report).toContain('Moral: serenos → serenos');
    expect(report).toContain('Posición: 6 → 6 (+0)');
    expect(report).toContain('Puntos: 3 → 3 (+0)');
  });

  it('reports the previous import failure in Spanish when the previous file does not exist, without producing a comparison', async () => {
    const { lines, failed } = await compareHrf(join(__dirname, 'does-not-exist.hrf'), CURRENT_HRF_PATH);
    const report = lines.join('\n');

    expect(failed).toBe(true);
    expect(report).toContain('No se pudo generar la comparación: la importación del HRF anterior falló.');
    expect(report).toContain('Estado (HRF anterior):');
    expect(report).toContain('✗ Archivo leído: no se pudo leer el archivo');
    expect(report).not.toContain('Club:');
    expect(report).not.toContain('Finanzas:');
    expect(report).not.toContain('Liga:');
  });

  it('reports the current import failure in Spanish when the current file does not exist, without producing a comparison', async () => {
    const { lines, failed } = await compareHrf(PREVIOUS_HRF_PATH, join(__dirname, 'does-not-exist.hrf'));
    const report = lines.join('\n');

    expect(failed).toBe(true);
    expect(report).toContain('No se pudo generar la comparación: la importación del HRF actual falló.');
    expect(report).toContain('Estado (HRF actual):');
    expect(report).toContain('✗ Archivo leído: no se pudo leer el archivo');
  });

  it('refuses to compare two different clubs, naming both in the report', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'menaus-compare-'));
    const previousPath = join(tempDir, 'previous.hrf');
    const currentPath = join(tempDir, 'current.hrf');
    await writeFile(previousPath, '[basics]\nteamID=1\nteamName=Club Uno\n', 'utf-8');
    await writeFile(currentPath, '[basics]\nteamID=2\nteamName=Club Dos\n', 'utf-8');

    const { lines, failed } = await compareHrf(previousPath, currentPath);
    const report = lines.join('\n');

    expect(failed).toBe(true);
    expect(report).toContain('No se pudo generar la comparación: los archivos pertenecen a clubes distintos.');
    expect(report).toContain('Club anterior: Club Uno (ID: 1)');
    expect(report).toContain('Club actual: Club Dos (ID: 2)');
  });
});
