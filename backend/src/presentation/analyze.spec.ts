import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyze } from './analyze';

const SAMPLE_HRF_PATH = join(__dirname, '../../../data/hrf/3301513-2026-08-28.hrf');

describe('analyze', () => {
  it('builds a successful report for a real HRF file', async () => {
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
    expect(report).toContain('✓ Archivo leído');
    expect(report).toContain('✓ HRF parseado');
    expect(report).toContain('✓ Data Contract generado');
    expect(report).toContain('✓ Entidad Club creada');
  });

  it('reports failure and does not show Club/ID when the file does not exist', async () => {
    const { lines, failed } = await analyze(join(__dirname, 'does-not-exist.hrf'));
    const report = lines.join('\n');

    expect(failed).toBe(true);
    expect(report).not.toContain('Club:');
    expect(report).not.toContain('ID:');
    expect(report).toContain('✗ Archivo leído o HRF parseado');
  });
});
