import { describe, expect, it } from 'vitest';
import { buildCsv, sessionFileName } from './csv';
import { rowsForSession } from './exportRows';
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

  it('puts every marker on its nearest sample, even two close together', () => {
    const session = { id: 'S1', patientRef: 'p', startedAt: '2026-10-13T14:31:00.000+05:30' };
    const patient = { id: 'p', patientId: 'MRN1', name: 'Lakshmi N.', createdAt: '', updatedAt: '' };
    const samples = [0, 1, 2, 3].map((seq) => ({ sessionId: 'S1', seq, t: 1000 + seq * 100, elapsedS: seq / 10, pressureRaw: 20, pressureText: '20.00', state: 'HOLD' as const }));
    const markers = [
      { id: 'a', sessionId: 'S1', t: 1190, elapsedS: 0.19, kind: 'cough' as const, text: 'Cough' },
      { id: 'b', sessionId: 'S1', t: 1210, elapsedS: 0.21, kind: 'talking' as const, text: 'Talking' },
      { id: 'c', sessionId: 'S1', t: 5000, elapsedS: 4, kind: 'note' as const, text: 'Late note' },
    ];
    const rows = rowsForSession(session, patient, samples, markers);
    expect(rows.map((row) => row.marker ?? '')).toEqual(['', '', 'Cough; Talking', 'Late note']);
  });

  it('names a session file from the patient ID and local start', () => {
    expect(sessionFileName('MRN10234', '2026-10-13T14:31:02.105+05:30')).toMatch(/^MRN10234_20261013_\d{6}\.csv$/);
  });
});
