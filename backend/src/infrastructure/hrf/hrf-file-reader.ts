import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';

/**
 * Reads the raw text content of an HRF file from disk.
 *
 * This is the only place in the system that touches the filesystem for
 * HRF data. It has no knowledge of the HRF format itself — it only reads
 * bytes and returns text; parsing sections and mapping fields are separate
 * responsibilities (later stories).
 */
@Injectable()
export class HrfFileReader {
  async readFile(filePath: string): Promise<string> {
    return readFile(filePath, 'utf-8');
  }
}
