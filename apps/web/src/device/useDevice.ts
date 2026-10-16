import { create } from 'zustand';
import { toast } from '@/app/toasts';
import { db } from '@/data/db';
import { createId } from '@/data/ids';
import type { DeviceState, Marker, Sample } from '@/data/types';
import { liveMetrics, processLive, processSeries, summarize, type LiveMetrics } from '@/processing/breathing';
import { clearPoints, getPoints, pushPoint } from './buffer';
import { commands, type CommandName } from './commands';
import { deviceConfig } from './device.config';
import { matchEvent, parseLine } from './protocol';
import { closeSerial, openSerial, portLabel, writeSerial } from './serial';

export type LinkStatus = 'idle' | 'starting' | 'connected' | 'disconnected';

export interface DeviceAlert {
  id: string;
  level: 'critical' | 'warning';
  message: string;
  key: string;
}

export interface LiveMarker {
  id: string;
  t: number;
  text: string;
  kind: Marker['kind'];
}

interface DeviceStore {
  status: LinkStatus;
  state: DeviceState;
  ready: boolean;
  restarted: boolean;
  emptyConfirmed: boolean;
  error: string | null;
  port: string;
  zeroOffset: string;
  lineRateHz: number;
  log: string[];
  pausedLog: string[] | null;
  metrics: LiveMetrics;
  trace: number | null;
  pressureNow: number | null;
  alerts: DeviceAlert[];
  recording: boolean;
  recordingStartedAt: number | null;
  sessionId: string | null;
  patientRef: string | null;
  markers: LiveMarker[];
  setEmptyConfirmed: (value: boolean) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  command: (name: CommandName) => Promise<void>;
  startRecording: (patientRef: string) => Promise<void>;
  endRecording: () => Promise<string | null>;
  addMarker: (kind: Marker['kind'], text: string) => void;
  acknowledge: (id: string) => void;
  setLogPaused: (paused: boolean) => void;
  ingest: (line: string) => void;
}

const emptyMetrics: LiveMetrics = {
  status: 'waiting',
  rate: null,
  depth: null,
  regularity: null,
  pressure: null,
  breaths: 0,
  holdS: 0,
};

let readyTimer = 0;
let watchTimer = 0;
let metricTimer = 0;
let flushTimer = 0;
let seenReady = false;
let zeroArmed = false;
let batch: Sample[] = [];
let seq = 0;
let holdStartedAt = 0;
let openedAt = 0;

export const useDevice = create<DeviceStore>((set, get) => ({
  status: 'idle',
  state: 'IDLE',
  ready: false,
  restarted: false,
  emptyConfirmed: false,
  error: null,
  port: 'No port',
  zeroOffset: 'Not reported',
  lineRateHz: 0,
  log: [],
  pausedLog: null,
  metrics: emptyMetrics,
  trace: null,
  pressureNow: null,
  alerts: [],
  recording: false,
  recordingStartedAt: null,
  sessionId: null,
  patientRef: null,
  markers: [],
  setEmptyConfirmed: (emptyConfirmed) => set({ emptyConfirmed }),
  connect: async () => {
    set({ status: 'starting', error: null, ready: false });
    window.clearTimeout(readyTimer);
    seenReady = false;
    try {
      openedAt = Date.now();
      await openSerial((line) => get().ingest(line), () => onLinkLost());
      set({ port: portLabel(), status: 'starting' });
      readyTimer = window.setTimeout(() => {
        if (get().ready) return;
        const message = 'The device did not start. Unplug it, plug it back in, and try again.';
        set({ error: message, status: 'disconnected', ready: false });
        void closeSerial();
      }, deviceConfig.readyTimeoutMs);
      startWatchers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The device did not start. Unplug it, plug it back in, and try again.';
      set({ status: 'idle', error: message, ready: false });
      toast(message);
    }
  },
  disconnect: async () => {
    window.clearTimeout(readyTimer);
    await closeSerial();
    seenReady = false;
    set({ status: 'idle', ready: false, error: null });
  },
  command: async (name) => {
    const state = get();
    if (!state.ready) return;
    if (name === 'inflate' && state.state === 'INFLATE') return;
    if (name === 'zero' && state.state !== 'IDLE') return;
    await writeSerial(commands[name]);
    if (name === 'zero') zeroArmed = true;
  },
  startRecording: async (patientRef) => {
    if (get().recording) return;
    const sessionId = createId();
    await db.sessions.add({
      id: sessionId,
      patientRef,
      startedAt: new Date().toISOString(),
      device: { lineRateHz: get().lineRateHz },
    });
    seq = 0;
    batch = [];
    set({ recording: true, recordingStartedAt: Date.now(), sessionId, patientRef, markers: [] });
    window.clearInterval(flushTimer);
    flushTimer = window.setInterval(() => void flush(), deviceConfig.batchMs);
  },
  endRecording: async () => {
    const sessionId = get().sessionId;
    const started = get().recordingStartedAt;
    if (!sessionId || started == null) return null;
    window.clearInterval(flushTimer);
    await flush();
    const samples = await db.samples.where('sessionId').equals(sessionId).toArray();
    const processed = processSeries(samples.map((sample) => ({ t: sample.t, pressureRaw: sample.pressureRaw, state: sample.state })));
    const summary = summarize(processed.samples, processed.breaths);
    await db.sessions.update(sessionId, {
      endedAt: new Date().toISOString(),
      durationS: (Date.now() - started) / 1000,
      summary,
      device: {
        lineRateHz: get().lineRateHz,
        zeroOffset: Number.isFinite(Number(get().zeroOffset)) ? Number(get().zeroOffset) : undefined,
      },
    });
    set({ recording: false, recordingStartedAt: null, sessionId: null, patientRef: null });
    return sessionId;
  },
  addMarker: (kind, text) => {
    const { sessionId, recordingStartedAt } = get();
    if (!sessionId || recordingStartedAt == null) return;
    const t = Date.now();
    const marker: Marker = {
      id: createId(),
      sessionId,
      t,
      elapsedS: (t - recordingStartedAt) / 1000,
      kind,
      text,
    };
    void db.markers.add(marker);
    set({ markers: [...get().markers, { id: marker.id, t, text, kind }].slice(-50) });
  },
  acknowledge: (id) => set({ alerts: get().alerts.filter((alert) => alert.id !== id) }),
  setLogPaused: (paused) => set({ pausedLog: paused ? get().log : null }),
  ingest: (line) => {
    set({ log: [...get().log, line].slice(-1000) });
    const parsed = parseLine(line);
    if (parsed.type === 'unknown') return;
    if (parsed.type === 'status') {
      const offset = parsed.fields.zero_offset ?? parsed.fields.zero ?? parsed.fields.offset;
      if (offset) set({ zeroOffset: offset });
      return;
    }
    if (parsed.type === 'fault') {
      raise('critical', 'sensor', 'Pressure sensor not responding. The belt stays as it is.');
      return;
    }
    if (parsed.type === 'event') {
      const savedZero = /(?:loaded saved zero|zero set and saved) = (-?\d+)/i.exec(parsed.text);
      if (savedZero) set({ zeroOffset: savedZero[1] });
      const match = matchEvent(parsed.text, seenReady);
      if (/^ready\b/i.test(parsed.text)) {
        seenReady = true;
        window.clearTimeout(readyTimer);
        set({ ready: true, status: 'connected', error: null });
      }
      if (match?.level === 'info') toast(match.message);
      else if (match) {
        raise(match.level, match.key, match.message);
        if (match.key === 'zero-refused' || match.key === 'zero-failed') zeroArmed = false;
      }
      return;
    }

    const t = Date.now();
    if (!get().ready && get().status === 'starting' && t - openedAt >= deviceConfig.startupQuietMs) {
      window.clearTimeout(readyTimer);
      set({ ready: true, status: 'connected', error: null });
    }
    const previous = get().state;
    if (parsed.state === 'HOLD' && (previous !== 'HOLD' || !holdStartedAt)) holdStartedAt = t;
    if (parsed.state !== 'HOLD') holdStartedAt = 0;
    if (zeroArmed && parsed.state === 'IDLE') {
      zeroArmed = false;
      set({ restarted: false });
    }
    pushPoint({ t, pressureRaw: parsed.pressure, pressureText: parsed.pressureText, state: parsed.state });
    set({ state: parsed.state });
    const { recording, sessionId, recordingStartedAt } = get();
    if (recording && sessionId && recordingStartedAt != null) {
      batch.push({
        sessionId,
        seq: seq++,
        t,
        elapsedS: (t - recordingStartedAt) / 1000,
        pressureRaw: parsed.pressure,
        pressureText: parsed.pressureText,
        state: parsed.state,
      });
    }
  },
}));

function onLinkLost() {
  const status = useDevice.getState().status;
  if (status === 'idle') return;
  useDevice.setState({ status: 'disconnected', ready: false });
  raise('critical', 'disconnected', 'Device disconnected. The belt may still be inflated. Reconnect and press Deflate, or release the belt by hand.');
}

function clearAlert(key: string) {
  const alerts = useDevice.getState().alerts;
  if (alerts.some((alert) => alert.key === key)) useDevice.setState({ alerts: alerts.filter((alert) => alert.key !== key) });
}

function raise(level: 'critical' | 'warning', key: string, message: string) {
  const alerts = useDevice.getState().alerts;
  if (alerts.some((alert) => alert.key === key)) return;
  useDevice.setState({ alerts: [...alerts, { id: createId(), level, key, message }] });
  if (useDevice.getState().recording) useDevice.getState().addMarker('alert', message);
}

async function flush() {
  if (!batch.length) return;
  const chunk = batch;
  batch = [];
  await db.samples.bulkAdd(chunk);
}

export function startWatchers() {
  window.clearInterval(watchTimer);
  window.clearInterval(metricTimer);
  watchTimer = window.setInterval(() => {
    const state = useDevice.getState();
    if (state.status !== 'connected' && state.status !== 'starting') return;
    const points = getPoints();
    const last = points[points.length - 1];
    if (state.status === 'connected' && last && Date.now() - last.t > deviceConfig.noDataMs) {
      raise('critical', 'no-data', 'No data from the device.');
    } else if (last && Date.now() - last.t <= deviceConfig.noDataMs) {
      useDevice.setState({ alerts: useDevice.getState().alerts.filter((alert) => alert.key !== 'no-data') });
    }
    const recent = points.filter((point) => Date.now() - point.t <= 10_000);
    useDevice.setState({ lineRateHz: recent.length / 10 });
    if (state.state === 'HOLD' && holdStartedAt) {
      const processed = processLive(points.map((point) => ({ t: point.t, pressureRaw: point.pressureRaw, state: point.state })));
      const lastBreath = processed.breaths[processed.breaths.length - 1];
      const since = Math.max(holdStartedAt + deviceConfig.baselineWarmupMs, lastBreath?.endT ?? 0);
      if (Date.now() - since > deviceConfig.noBreathAlertS * 1000) {
        raise('warning', 'no-breath', 'No breaths detected for 15 s. Check the patient and the belt.');
      } else {
        clearAlert('no-breath');
      }
    } else {
      clearAlert('no-breath');
    }
  }, 500);
  metricTimer = window.setInterval(() => {
    const points = getPoints();
    if (!points.length) {
      useDevice.setState({ metrics: emptyMetrics, trace: null, pressureNow: null });
      return;
    }
    const processed = processLive(points.map((point) => ({ t: point.t, pressureRaw: point.pressureRaw, state: point.state })));
    const latest = processed.samples[processed.samples.length - 1];
    const trace = latest ? latest.wave : null;
    const metrics = liveMetrics(processed.samples, processed.breaths, Date.now());
    if (metrics.status !== 'waiting' && holdStartedAt) metrics.holdS = (Date.now() - holdStartedAt) / 1000;
    useDevice.setState({
      metrics,
      trace,
      pressureNow: latest?.pressureSmooth ?? null,
    });
  }, 250);
}

export async function closeOpenSessions() {
  const open = await db.sessions.filter((session) => !session.endedAt).toArray();
  for (const session of open) {
    const samples = await db.samples.where('sessionId').equals(session.id).toArray();
    const processed = processSeries(samples.map((sample) => ({ t: sample.t, pressureRaw: sample.pressureRaw, state: sample.state })));
    const summary = summarize(processed.samples, processed.breaths);
    const end = samples.at(-1)?.t ?? Date.parse(session.startedAt);
    await db.sessions.update(session.id, {
      endedAt: new Date(end).toISOString(),
      durationS: Math.max(0, (end - Date.parse(session.startedAt)) / 1000),
      summary,
    });
  }
}

startWatchers();

export function topAlert(alerts: DeviceAlert[]) {
  return alerts.find((alert) => alert.level === 'critical') ?? alerts[0] ?? null;
}

export async function flushRecording() {
  await flush();
}
