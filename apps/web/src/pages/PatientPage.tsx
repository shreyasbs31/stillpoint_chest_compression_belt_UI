import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PatientDialog } from '@/components/PatientDialog';
import { Button, EmptyState, Modal, buttonClass } from '@/components/ui';
import { db, deletePatientCascade } from '@/data/db';
import { patientCsv, saveFile, sessionCsv } from '@/data/download';
import { formatClock, formatWhen } from '@/data/ids';
import type { Patient, Session } from '@/data/types';
import { Activity } from 'lucide-react';

export function PatientPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null | undefined>(undefined);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [askDelete, setAskDelete] = useState(false);

  const load = async () => {
    const next = await db.patients.get(id);
    setPatient(next ?? null);
    if (!next) return;
    const rows = await db.sessions.where('patientRef').equals(next.id).toArray();
    setSessions(rows.filter((session) => session.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
  };

  useEffect(() => { void load(); }, [id]);

  if (patient === undefined) return null;
  if (!patient) {
    return (
      <div className="mx-auto max-w-[1440px] px-6 py-6">
        <EmptyState icon={Activity} title="This patient is not on this laptop." action={<Link to="/" className={buttonClass('primary')}>Patients</Link>} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-[24px] leading-8 font-semibold">{patient.name}</h1>
            <p className="mono mt-1 text-[13px] text-muted">{patient.patientId}</p>
            <p className="mt-3 text-[14px] leading-5 text-muted">
              {[patient.age != null ? `${patient.age} years` : null, patient.sex].filter(Boolean).join(', ') || 'No age or sex recorded'}
            </p>
            {patient.notes ? <p className="mt-2 max-w-2xl text-[14px] leading-5">{patient.notes}</p> : null}
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
            <Button onClick={() => navigate(`/live/${patient.id}`)}>Start session</Button>
          </div>
        </div>
      </section>

      <div className="mt-8 flex items-center gap-3">
        <h2 className="text-[16px] leading-6 font-semibold">Sessions</h2>
        <div className="ml-auto">
          <Button
            variant="secondary"
            disabled={!sessions.length}
            onClick={() => void patientCsv(patient.id).then((file) => file && saveFile(file.name, file.body))}
          >
            Download all sessions (CSV)
          </Button>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
        {sessions.length === 0 ? (
          <EmptyState icon={Activity} title="No sessions yet" action={<Button onClick={() => navigate(`/live/${patient.id}`)}>Start session</Button>} />
        ) : (
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="bg-surface-raised text-[12px] leading-4 font-medium tracking-[0.06em] text-muted uppercase">
              <tr>
                {['Date and time', 'Duration', 'Avg breathing rate', 'Avg breath depth', 'Regularity', 'Markers', ''].map((heading) => (
                  <th key={heading} className="h-12 px-4 font-medium whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-12 border-t border-border pt-6">
        <Button variant="danger" onClick={() => { setConfirm(''); setAskDelete(true); }}>Delete patient</Button>
      </div>

      <PatientDialog open={editing} patient={patient} onClose={() => setEditing(false)} onSaved={() => void load()} />
      <Modal open={askDelete} title="Delete patient" onClose={() => setAskDelete(false)}>
        <p className="text-[14px] leading-5">Type <span className="mono">{patient.patientId}</span> to delete this patient and every session stored for them.</p>
        <input className="mt-4 h-10 w-full rounded-lg border border-border bg-surface-raised px-3 mono" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAskDelete(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={confirm !== patient.patientId}
            onClick={() => void deletePatientCascade(patient.id).then(() => navigate('/'))}
          >
            Delete patient
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
  const [markers, setMarkers] = useState(0);
  useEffect(() => {
    void db.markers.where('sessionId').equals(session.id).count().then(setMarkers);
  }, [session.id]);
  const summary = session.summary;
  return (
    <tr className="border-t border-border">
      <td className="h-12 px-4">{formatWhen(session.startedAt)}</td>
      <td className="px-4 tabular">{formatClock(session.durationS ?? 0)}</td>
      <td className="px-4 tabular">{summary ? `${summary.rateAvg.toFixed(0)} br/min` : ''}</td>
      <td className="px-4 tabular">{summary ? `${summary.depthAvg.toFixed(2)} rel.` : ''}</td>
      <td className="px-4 tabular">{summary ? `${summary.regularityAvg.toFixed(0)}%` : ''}</td>
      <td className="px-4 tabular">{markers}</td>
      <td className="px-4">
        <div className="flex justify-end gap-2">
          <Link to={`/sessions/${session.id}`} className={buttonClass('secondary')}>View</Link>
          <button type="button" className={buttonClass('secondary')} onClick={() => void sessionCsv(session).then((file) => file && saveFile(file.name, file.body))}>
            Download CSV
          </button>
        </div>
      </td>
    </tr>
  );
}
