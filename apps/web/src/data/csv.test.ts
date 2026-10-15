import { describe, expect, it } from 'vitest';
import { buildCsv, sessionFileName } from './csv';
import type { CsvRow } from './types';

describe('csv', () => {
  it('writes a BOM, the exact header, and blanks outside HOLD', () => {
    const rows: CsvRow[] = [
      {
        sessionId: '01JAB3K9',
        patientId: 'MRN10234',
        timestamp: '2026-10-13T14:31:02.105+05:30',
        elapsedS: 12.3,
        pressureText: '24.35',
        breathing: 1.82,
        state: 'HOLD',
        breathPoint: 'peak',
      },
      {
        sessionId: '01JAB3K9',
        patientId: 'MRN10234',
        timestamp: '2026-10-13T14:31:02.205+05:30',
        elapsedS: 12.4,
        pressureText: '24.31',
        state: 'INFLATE',
        marker: 'Cough',
      },
    ];
    const csv = buildCsv(rows);
    expect(csv.startsWith('\uFEFFsession_id,patient_id,timestamp,elapsed_s,pressure_raw,breathing,device_state,breath_point,marker\n')).toBe(true);
    expect(csv).toContain('01JAB3K9,MRN10234,2026-10-13T14:31:02.105+05:30,12.300,24.35,1.82,HOLD,peak,');
    expect(csv).toContain('01JAB3K9,MRN10234,2026-10-13T14:31:02.205+05:30,12.400,24.31,,INFLATE,,Cough');
    expect(csv).not.toContain('mmHg');
    expect(csv).not.toContain('Lakshmi');
  });

  it('names a session file from the patient ID and local start', () => {
    expect(sessionFileName('MRN10234', '2026-10-13T14:31:02.105+05:30')).toMatch(/^MRN10234_20261013_\d{6}\.csv$/);
  });
});
