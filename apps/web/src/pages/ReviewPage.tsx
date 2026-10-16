import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db, deleteSessionCascade } from '@/data/db';
import { saveFile, sessionCsv } from '@/data/download';
import { formatClock, formatWhen } from '@/data/ids';
import type { Marker, Patient, Sample, Session } from '@/data/types';
import { processSeries, summarize } from '@/processing/breathing';
import { ReviewDetail, ReviewOverview } from '@/components/charts/ReviewChart';
import { Button, Modal, buttonClass } from '@/components/ui';

export function ReviewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [notes, setNotes] = useState('');
  const [start, setStart] = useState(0);
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    void (async () => {
      const next = await db.sessions.get(id);
      setSession(next ?? null);
      if (!next) return;
      setNotes(next.notes ?? '');
      const owner = await db.patients.get(next.patientRef);
      setPatient(owner ?? null);
      const rows = await db.samples.where('sessionId').equals(next.id).sortBy('seq');
      setSamples(rows);
      if (rows.length) {
        const fresh = processSeries(rows.map((sample) => ({ t: sample.t, pressureRaw: sample.pressureRaw, state: sample.state })));
        void db.sessions.update(next.id, { summary: summarize(fresh.samples, fresh.breaths) });
      }
      setMarkers(await db.markers.where('sessionId').equals(next.id).toArray());
      setStart(rows[0] ? rows[0].t / 1000 : 0);
    })();
  }, [id]);

  useEffect(() => {
    if (!session || notes === (session.notes ?? '')) return;
    const timer = window.setTimeout(() => {
      void db.sessions.update(session.id, { notes });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [notes, session]);

  const series = useMemo(
    () => processSeries(samples.map((sample) => ({ t: sample.t, pressureRaw: sample.pressureRaw, state: sample.state }))),
    [samples],
  );
  const processed = series.samples;
  const origin = processed[0]?.t ? processed[0].t / 1000 : 0;
  const duration = session?.durationS ?? (processed.length > 1 ? (processed[processed.length - 1].t - processed[0].t) / 1000 : 0);
  const windowS = Math.min(60, Math.max(duration, 1));

  if (session === undefined) return null;
  if (!session || !patient) return <p className="px-6 py-6 text-muted">This session is not on this laptop.</p>;

  const summary = samples.length ? summarize(series.samples, series.breaths) : session.summary;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
      <header className="flex flex-wrap items-start gap-4">
        <div>
          <h1 className="text-[24px] leading-8 font-semibold">{patient.name}</h1>
          <p className="mt-1 text-[14px] text-muted">
            <span className="mono">{patient.patientId}</span>
            <span className="mx-2 text-faint">/</span>
            {formatWhen(session.startedAt)}
            <span className="mx-2 text-faint">/</span>
            {formatClock(duration)}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button onClick={() => void sessionCsv(session).then((file) => file && saveFile(file.name, file.body))}>Download CSV</Button>
          <Link to={`/patients/${patient.id}`} className={buttonClass('secondary')}>Back to patient</Link>
          <Button variant="danger" onClick={() => setAsk(true)}>Delete session</Button>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Duration" value={formatClock(duration)} />
        <Stat label="Average breathing rate" value={summary ? `${summary.rateAvg.toFixed(0)} br/min` : '0 br/min'} />
        <Stat label="Average breath depth" value={summary ? `${summary.depthAvg.toFixed(2)} rel.` : '0 rel.'} />
        <Stat label="Regularity" value={summary ? `${summary.regularityAvg.toFixed(0)}%` : '0%'} />
        <Stat label="Breaths counted" value={String(summary?.breaths ?? 0)} />
        <Stat label="Markers" value={String(markers.length)} />
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="h-[380px]">
          <ReviewDetail samples={processed} markers={markers} start={start} windowS={windowS} />
        </div>
        <div className="border-t border-border px-3 py-2">
          <ReviewOverview samples={processed} start={start} windowS={windowS} onStart={setStart} />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-[16px] leading-6 font-semibold">Markers</h2>
          {markers.length === 0 ? <p className="mt-3 text-[14px] text-muted">No markers in this session.</p> : (
            <ul className="mt-3">
              {[...markers].sort((a, b) => a.elapsedS - b.elapsedS).map((marker) => (
                <li key={marker.id}>
                  <button type="button" className="flex h-12 w-full items-center justify-between gap-3 border-t border-border text-left first:border-t-0 hover:bg-surface-raised" onClick={() => setStart(Math.max(origin, marker.t / 1000 - windowS * 0.25))}>
                    <span>{marker.text}</span>
                    <span className="mono text-[12px] text-muted">{formatClock(marker.elapsedS)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-[16px] leading-6 font-semibold">Session notes</h2>
          <textarea className="mt-3 h-36 w-full resize-none rounded-lg border border-border bg-surface-raised p-3 text-[14px] leading-5" value={notes} onChange={(event) => setNotes(event.target.value)} />
          <p className="mt-2 text-[11px] leading-[14px] text-faint">Saved on this laptop.</p>
        </section>
      </div>

      <Modal open={ask} title="Delete session" onClose={() => setAsk(false)}>
        <p className="text-[14px] leading-5">This removes the recording from this laptop.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAsk(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => void deleteSessionCascade(session.id).then(() => navigate(`/patients/${patient.id}`))}>Delete session</Button>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-3">
      <p className="label">{label}</p>
      <p className="mt-2 text-[24px] leading-8 font-semibold tabular">{value}</p>
    </div>
  );
}
