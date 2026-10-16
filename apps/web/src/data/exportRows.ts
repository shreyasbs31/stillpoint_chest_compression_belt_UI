import type { CsvRow, Marker, Patient, Sample, Session } from './types';
import { localTimestamp } from './ids';

export function rowsForSession(session: Session, patient: Patient, samples: Sample[], markers: Marker[]): CsvRow[] {
  const ordered = [...samples].sort((a, b) => a.seq - b.seq);
  const labels = new Map<number, string[]>();
  for (const marker of [...markers].sort((a, b) => a.t - b.t)) {
    let nearest = -1;
    for (let i = 0; i < ordered.length; i++) {
      if (nearest < 0 || Math.abs(ordered[i].t - marker.t) < Math.abs(ordered[nearest].t - marker.t)) nearest = i;
    }
    if (nearest >= 0) labels.set(nearest, [...(labels.get(nearest) ?? []), marker.text]);
  }
  return ordered.map((sample, index) => {
    const marker = labels.has(index) ? { text: labels.get(index)!.join('; ') } : undefined;
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
