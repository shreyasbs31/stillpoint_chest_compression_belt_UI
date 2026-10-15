import { buildCsv, allDataFileName, patientFileName, sessionFileName } from './csv';
import { db } from './db';
import { rowsForSession } from './exportRows';
import { processSeries } from '@/processing/breathing';
import type { Sample, Session } from './types';

export async function sessionCsv(session: Session) {
  const patient = await db.patients.get(session.patientRef);
  if (!patient) return null;
  const samples = await enrich(session.id);
  const markers = await db.markers.where('sessionId').equals(session.id).toArray();
  return {
    name: sessionFileName(patient.patientId, session.startedAt),
    body: buildCsv(rowsForSession(session, patient, samples, markers)),
  };
}

export async function patientCsv(patientRef: string) {
  const patient = await db.patients.get(patientRef);
  if (!patient) return null;
  const sessions = (await db.sessions.where('patientRef').equals(patientRef).toArray()).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const rows = [];
  for (const session of sessions) {
    const samples = await enrich(session.id);
    const markers = await db.markers.where('sessionId').equals(session.id).toArray();
    rows.push(...rowsForSession(session, patient, samples, markers));
  }
  return { name: patientFileName(patient.patientId), body: buildCsv(rows) };
}

export async function allCsv() {
  const sessions = (await db.sessions.toArray()).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const rows = [];
  for (const session of sessions) {
    const patient = await db.patients.get(session.patientRef);
    if (!patient) continue;
    const samples = await enrich(session.id);
    const markers = await db.markers.where('sessionId').equals(session.id).toArray();
    rows.push(...rowsForSession(session, patient, samples, markers));
  }
  return { name: allDataFileName(), body: buildCsv(rows) };
}

export function saveFile(name: string, body: string) {
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

async function enrich(sessionId: string): Promise<Sample[]> {
  const samples = await db.samples.where('sessionId').equals(sessionId).sortBy('seq');
  const processed = processSeries(samples.map((sample) => ({ t: sample.t, pressureRaw: sample.pressureRaw, state: sample.state })));
  return samples.map((sample, index) => ({
    ...sample,
    breathing: processed.samples[index]?.breathing,
    breathPoint: processed.samples[index]?.breathPoint,
  }));
}
