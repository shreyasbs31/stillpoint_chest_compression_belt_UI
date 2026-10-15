import type { CsvRow } from './types';
import { fileStamp, safeFilePart } from './ids';

const HEADER = 'session_id,patient_id,timestamp,elapsed_s,pressure_raw,breathing,device_state,breath_point,marker';

export function buildCsv(rows: CsvRow[]) {
  const lines = rows.map((row) =>
    [
      cell(row.sessionId),
      cell(row.patientId),
      cell(row.timestamp),
      row.elapsedS.toFixed(3),
      cell(row.pressureText),
      row.breathing == null ? '' : row.breathing.toFixed(2),
      row.state,
      row.breathPoint ?? '',
      cell(row.marker ?? ''),
    ].join(','),
  );
  return `\uFEFF${HEADER}\n${lines.join('\n')}${lines.length ? '\n' : ''}`;
}

export function sessionFileName(patientId: string, startedAt: string) {
  const stamp = fileStamp(new Date(startedAt));
  return `${safeFilePart(patientId)}_${stamp.day}_${stamp.time}.csv`;
}

export function patientFileName(patientId: string) {
  return `${safeFilePart(patientId)}_all_sessions.csv`;
}

export function allDataFileName(date = new Date()) {
  return `stillpoint_all_sessions_${fileStamp(date).day}.csv`;
}

function cell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
