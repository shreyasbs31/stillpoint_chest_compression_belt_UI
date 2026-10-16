import { useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { db } from '@/data/db';
import { formatClock } from '@/data/ids';
import type { Patient } from '@/data/types';
import { useDevice } from '@/device/useDevice';
import { StreamChart } from '@/components/charts/StreamChart';
import { Button, Modal, StatePill } from '@/components/ui';
import { useSettings } from '@/settings';

export function LivePage() {
  const { patientId = '' } = useParams();
  const navigate = useNavigate();
  const patient = usePatient(patientId);
  const status = useDevice((s) => s.status);
  const state = useDevice((s) => s.state);
  const ready = useDevice((s) => s.ready);
  const error = useDevice((s) => s.error);
  const connect = useDevice((s) => s.connect);
  const command = useDevice((s) => s.command);
  const recording = useDevice((s) => s.recording);
  const started = useDevice((s) => s.recordingStartedAt);
  const metrics = useDevice((s) => s.metrics);
  const pressureNow = useDevice((s) => s.pressureNow);
  const markers = useDevice((s) => s.markers);
  const chartWindow = useSettings((s) => s.chartWindow);
  const setChartWindow = useSettings((s) => s.setChartWindow);
  const [now, setNow] = useState(Date.now());
  const [ending, setEnding] = useState(false);
  const allowLeave = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const blocker = useBlocker(() => {
    if (allowLeave.current) return false;
    const current = useDevice.getState();
    return current.recording || (current.ready && current.state !== 'IDLE');
  });

  const finish = async (deflate: boolean) => {
    if (deflate) await command('deflate');
    const sessionId = recording ? await useDevice.getState().endRecording() : null;
    allowLeave.current = true;
    if (blocker.state === 'blocked') blocker.proceed();
    navigate(sessionId ? `/sessions/${sessionId}` : `/patients/${patientId}`);
  };

  if (patient === null) {
    return <p className="px-6 py-6 text-muted">This patient is not on this laptop.</p>;
  }

  const elapsed = recording && started ? (now - started) / 1000 : 0;
  const canInflate = ready && state !== 'INFLATE';
  const canZero = ready && state === 'IDLE';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="min-w-0">
          <h1 className="truncate text-[16px] leading-6 font-semibold">{patient?.name ?? 'Patient'}</h1>
        </div>
        <span className="mono text-[13px] text-muted">{patient?.patientId}</span>
        <StatePill state={state} />
        <div className="ml-auto flex items-center gap-3">
          {recording ? (
            <span className="inline-flex items-center gap-2 text-[14px] font-medium text-danger">
              <span className="h-2 w-2 rounded-full bg-danger-solid" />
              REC {formatClock(elapsed)}
            </span>
          ) : (
            <span className="text-[14px] text-faint tabular">00:00</span>
          )}
          {recording ? (
            <Button size="live" variant="secondary" onClick={() => (state === 'IDLE' ? void finish(false) : setEnding(true))}>End session</Button>
          ) : (
            <Button size="live" disabled={!ready} onClick={() => patient && void useDevice.getState().startRecording(patient.id)}>Start recording</Button>
          )}
        </div>
      </header>

      <div className="live-stage">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface" style={{ gridArea: 'pressure' }}>
          <PanelTitle
            title="Belt pressure"
            value={pressureNow}
            color="var(--pressure)"
            extra={
              <div className="flex rounded-lg border border-border p-0.5">
                {([30, 60] as const).map((sec) => (
                  <button key={sec} type="button" className={`h-6 rounded-md px-2 text-[12px] leading-4 font-medium ${chartWindow === sec ? 'bg-surface-raised text-text' : 'text-muted'}`} onClick={() => setChartWindow(sec)}>
                    {sec}s
                  </button>
                ))}
              </div>
            }
          />
          <div className="relative min-h-0 flex-1">
            <StreamChart windowSec={chartWindow} markers={markers} />
            {status !== 'connected' ? (
              <div className="absolute inset-0 z-10 grid place-items-center bg-surface/80 p-6">
                <div className="w-[min(360px,100%)] rounded-xl border border-border bg-surface-raised p-5">
                  {status === 'starting' ? (
                    <p className="text-[14px] text-muted">Starting</p>
                  ) : (
                    <>
                      <p className="text-[14px] leading-5 text-muted">Connect starts the controller. A saved zero is kept.</p>
                      <Button className="mt-4" onClick={() => void connect()}>Connect</Button>
                      {error ? <p className="mt-3 text-[13px] leading-5 text-danger">{error}</p> : null}
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-3 overflow-auto" style={{ gridArea: 'side' }}>
          <div className="grid grid-cols-2 gap-2">
            <Tile label="Breathing rate" value={metrics.status === 'ready' && metrics.rate != null ? metrics.rate.toFixed(0) : null} unit="br/min" accent="var(--wave)" waiting={metrics.status} numeric={metrics.rate} />
            <Tile label="Breath depth" value={metrics.status === 'ready' && metrics.depth != null ? metrics.depth.toFixed(2) : null} unit="rel." accent="var(--wave)" waiting={metrics.status} numeric={metrics.depth} />
            <Tile label="Regularity" value={metrics.status === 'ready' && metrics.regularity != null ? metrics.regularity.toFixed(0) : null} unit="%" accent="var(--wave)" waiting={metrics.status} numeric={metrics.regularity} />
            <Tile label="Belt pressure" value={metrics.pressure != null ? formatRel(metrics.pressure) : null} unit="rel." accent="var(--pressure)" waiting="ready" empty="No data" numeric={metrics.pressure} />
          </div>

          <section className="rounded-xl border border-border bg-surface px-3 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="label">Hold</p>
              <p className="text-[20px] leading-6 font-semibold tabular" style={{ color: state === 'HOLD' ? 'var(--ok)' : 'var(--text-faint)' }}>
                {state === 'HOLD' ? `Holding ${formatClock(metrics.holdS)}` : 'Not holding'}
              </p>
            </div>
          </section>

          <section className="grid gap-2">
            <div className="grid grid-cols-3 gap-2">
              <Button size="live" variant="secondary" className="px-2 text-[13px]" disabled={!canInflate} onClick={() => void command('inflate')}>{state === 'HOLD' ? 'Top up' : 'Inflate'}</Button>
              <Button size="live" variant="secondary" className="px-2 text-[13px]" disabled={!ready} onClick={() => void command('stop')}>Stop pumps</Button>
              <Button size="live" variant="secondary" className="px-1 text-[13px]" disabled={!canZero} title="Zero sensor works only in IDLE. Open the bladder to air first." onClick={() => void command('zero')}>Zero sensor</Button>
            </div>
            <Button size="live" variant="danger" block disabled={!ready} onClick={() => void command('deflate')}>Deflate</Button>
          </section>

          <MarkerPad recording={recording} markers={markers} />
        </aside>
      </div>

      <Modal
        open={ending || blocker.state === 'blocked'}
        title={recording ? 'End the session and save it?' : 'The belt is not idle.'}
        onClose={() => { setEnding(false); blocker.reset?.(); }}
      >
        <p className="text-[14px] leading-5 text-muted">
          {recording ? 'The recording stops and the review screen opens.' : 'Deflate the belt, or leave it as it is.'}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => { setEnding(false); blocker.reset?.(); }}>Stay</Button>
          {state !== 'IDLE' ? <Button variant="danger" onClick={() => void finish(true)}>{recording ? 'Deflate and end' : 'Deflate and leave'}</Button> : null}
          <Button variant={state === 'IDLE' ? 'primary' : 'secondary'} onClick={() => void finish(false)}>{recording ? 'End session' : 'Leave'}</Button>
        </div>
      </Modal>
    </div>
  );
}

function formatRel(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

function PanelTitle({ title, value, color, extra }: { title: string; value: number | null; color: string; extra?: React.ReactNode }) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-2 overflow-hidden border-b border-border px-3">
      <h2 className="min-w-0 truncate text-[16px] leading-6 font-semibold whitespace-nowrap">{title}</h2>
      <div className="shrink-0">{extra}</div>
      <p className="ml-auto shrink-0 text-[20px] leading-6 font-semibold tabular" style={{ color }}>
        {value == null ? <span className="text-faint"> </span> : (
          <>
            {formatRel(value)}
            <span className="ml-1 text-[12px] font-medium text-muted">rel.</span>
          </>
        )}
      </p>
    </header>
  );
}

function Tile({
  label,
  value,
  unit,
  accent,
  waiting,
  numeric,
  empty,
}: {
  label: string;
  value: string | null;
  unit: string;
  accent: string;
  waiting: 'waiting' | 'detecting' | 'ready';
  numeric: number | null;
  empty?: string;
}) {
  const history = useSpark(waiting === 'ready' ? numeric : null);
  return (
    <article className="min-w-0 rounded-xl border border-border bg-surface px-2.5 pt-2.5 pb-2" style={{ borderTopColor: accent, borderTopWidth: 2 }}>
      <p className="label">{label}</p>
      <div className="mt-1 flex h-[52px] items-end">
        {value == null ? (
          <p className="pb-1 text-[14px] leading-5 text-muted">{empty ?? (waiting === 'detecting' ? 'Detecting...' : 'Waiting for hold')}</p>
        ) : (
          <p className={`font-semibold tabular tracking-tight ${value.length > 7 ? 'text-[28px] leading-[32px]' : 'text-[48px] leading-[52px]'}`}>{value}</p>
        )}
      </div>
      <div className="mt-1 flex h-7 items-center gap-2">
        <span className="w-10 shrink-0 text-[12px] leading-4 text-muted">{value == null ? '' : unit}</span>
        <Spark values={history} color={accent} />
      </div>
    </article>
  );
}

function useSpark(value: number | null) {
  const ref = useRef(value);
  ref.current = value;
  const [values, setValues] = useState<number[]>([]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (ref.current == null) return;
      setValues((current) => [...current, ref.current as number].slice(-60));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return values;
}

function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-7 min-w-0 flex-1" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${(index / (values.length - 1)) * 120} ${26 - ((value - min) / span) * 22}`).join(' ');
  return (
    <svg viewBox="0 0 120 28" className="h-7 min-w-0 flex-1" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function MarkerPad({ recording, markers }: { recording: boolean; markers: { id: string; t: number; text: string }[] }) {
  const [note, setNote] = useState(false);
  const [text, setText] = useState('');
  const add = (kind: 'cough' | 'movement' | 'talking' | 'note', label: string) => useDevice.getState().addMarker(kind, label);
  const last = [...markers].reverse().slice(0, 5);
  return (
    <section>
      <p className="label">Markers</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button size="live" variant="secondary" disabled={!recording} onClick={() => add('cough', 'Cough')}>Cough</Button>
        <Button size="live" variant="secondary" disabled={!recording} onClick={() => add('movement', 'Movement')}>Movement</Button>
        <Button size="live" variant="secondary" disabled={!recording} onClick={() => add('talking', 'Talking')}>Talking</Button>
        <Button size="live" variant="secondary" disabled={!recording} onClick={() => setNote(true)}>Note</Button>
      </div>
      {note ? (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim()) add('note', text.trim());
            setText('');
            setNote(false);
          }}
        >
          <input autoFocus className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-3" placeholder="Note" value={text} onChange={(event) => setText(event.target.value)} />
          <Button size="live" type="submit">Add</Button>
        </form>
      ) : null}
      <ul className="marker-list mt-3 space-y-1">
        {last.map((marker) => (
          <li key={marker.id} className="flex items-baseline justify-between gap-3 text-[12px] leading-4">
            <span className="truncate">{marker.text}</span>
            <span className="mono text-muted">{new Date(marker.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function usePatient(id: string) {
  const [patient, setPatient] = useState<Patient | null | undefined>(undefined);
  useEffect(() => {
    void db.patients.get(id).then((row) => setPatient(row ?? null));
  }, [id]);
  return patient;
}
