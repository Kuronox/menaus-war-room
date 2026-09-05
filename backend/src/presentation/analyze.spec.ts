import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyze } from './analyze';

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir !== undefined) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

const SAMPLE_HRF_PATH = join(__dirname, '../../../data/hrf/3301513-2026-08-28.hrf');

describe('analyze', () => {
  it('builds a successful report for a real HRF file, with the HRF summary and timing', async () => {
    const { lines, failed } = await analyze(SAMPLE_HRF_PATH);
    const report = lines.join('\n');

    expect(failed).toBe(false);
    expect(report).toContain('MENAUS WAR ROOM');
    expect(report).toContain('Archivo:');
    expect(report).toContain('3301513-2026-08-28.hrf');
    expect(report).toContain('Club:');
    expect(report).toContain('Menaus');
    expect(report).toContain('ID:');
    expect(report).toContain('3301513');
    expect(report).toContain('Estado del Equipo:');
    expect(report).toContain('Moral: serenos');
    expect(report).toContain('Confianza: Muy baja');
    expect(report).toContain('Entrenamiento: Jugadas');
    expect(report).toContain('Finanzas:');
    expect(report).toContain(`Efectivo actual: ${(15105114).toLocaleString('es')}`);
    expect(report).toContain(
      `Efectivo esperado tras la próxima actualización: ${(15367994).toLocaleString('es')}`,
    );
    expect(report).toContain(
      `Balance de la semana pasada (cerrada): +${(258635).toLocaleString('es')}`,
    );
    expect(report).toContain(
      `Balance proyectado de esta semana (en curso): +${(262880).toLocaleString('es')}`,
    );
    expect(report).toContain(
      'Tendencia respecto a tu última importación: no disponible (el sistema aún no conserva historial entre ejecuciones)',
    );
    expect(report).not.toMatch(/[€$]/);
    expect(report).toContain('Resumen HRF:');
    expect(report).toContain('Secciones detectadas: 31');
    expect(report).toContain('Jugadores detectados: 20');
    expect(report).toContain('✓ Archivo leído');
    expect(report).toContain('✓ HRF parseado');
    expect(report).toContain('✓ Data Contract generado');
    expect(report).toContain('✓ Entidad Club creada');
    expect(report).toMatch(/Tiempo de ejecución: \d+(\.\d+)? ms/);
    expect(report).not.toContain('Avisos:');
  });

  it('shows warnings in Spanish when team status and financial health are unavailable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'menaus-analyze-'));
    const filePath = join(tempDir, 'test.hrf');
    await writeFile(filePath, '[basics]\nteamID=1\nteamName=Test\n', 'utf-8');

    const { lines, failed } = await analyze(filePath);
    const report = lines.join('\n');

    expect(failed).toBe(false);
    expect(report).toContain('Avisos:');
    expect(report).toContain('⚠ no se pudo leer el estado del equipo (moral/confianza/entrenamiento)');
    expect(report).toContain('⚠ no se pudo leer la salud financiera del club');
  });

  it('reports a read failure in Spanish, without an HRF summary or Club/ID', async () => {
    const { lines, failed } = await analyze(join(__dirname, 'does-not-exist.hrf'));
    const report = lines.join('\n');

    expect(failed).toBe(true);
    expect(report).not.toContain('Resumen HRF:');
    expect(report).not.toContain('Club:');
    expect(report).not.toContain('ID:');
    expect(report).not.toContain('Finanzas:');
    // The raw Node error (English, e.g. "ENOENT: ...") must never reach the
    // manager — only the translated Spanish message.
    expect(report).toContain('✗ Archivo leído: no se pudo leer el archivo');
    expect(report).not.toContain('ENOENT');
  });
});
