import type { CsvRow, Marker, Patient, Sample, Session } from './types';
import { localTimestamp } from './ids';

export function rowsForSession(session: Session, patient: Patient, samples: Sample[], markers: Marker[]): CsvRow[] {
  const ordered = [...samples].sort((a, b) => a.seq - b.seq);
  const used = new Set<number>();
  return ordered.map((sample) => {
    const marker = markers
      .filter((item) => !used.has(item.t) && Math.abs(item.t - sample.t) <= 100)
      .sort((a, b) => Math.abs(a.t - sample.t) - Math.abs(b.t - sample.t))[0];
    if (marker) used.add(marker.t);
    return {
      sessionId: session.id,
      patientId: patient.patientId,
      timestamp: localTimestamp(new Date(sample.t)),
      elapsedS: sample.elapsedS,
      pressureText: sample.pressureText,
      breathing: sample.breathing,
      state: sample.state,
      breathPoint: sample.breathPoint,
      marker: marker?.text,
    };
  });
}
