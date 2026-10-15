import Dexie, { type Table } from 'dexie';
import type { AppSecurity, Marker, Patient, Sample, Session } from './types';

export class StillpointDB extends Dexie {
  security!: Table<AppSecurity, string>;
  patients!: Table<Patient, string>;
  sessions!: Table<Session, string>;
  samples!: Table<Sample, [string, number]>;
  markers!: Table<Marker, string>;

  constructor() {
    super('stillpoint');
    this.version(1).stores({
      security: 'id',
      patients: 'id, &patientId, name',
      sessions: 'id, patientRef, startedAt',
      samples: '[sessionId+seq], sessionId',
      markers: 'id, sessionId',
    });
  }
}

export const db = new StillpointDB();

export async function deletePatientCascade(id: string) {
  await db.transaction('rw', [db.patients, db.sessions, db.samples, db.markers], async () => {
    const sessions = await db.sessions.where('patientRef').equals(id).toArray();
    for (const session of sessions) {
      await db.samples.where('sessionId').equals(session.id).delete();
      await db.markers.where('sessionId').equals(session.id).delete();
    }
    await db.sessions.where('patientRef').equals(id).delete();
    await db.patients.delete(id);
  });
}

export async function deleteSessionCascade(id: string) {
  await db.transaction('rw', [db.sessions, db.samples, db.markers], async () => {
    await db.samples.where('sessionId').equals(id).delete();
    await db.markers.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}
