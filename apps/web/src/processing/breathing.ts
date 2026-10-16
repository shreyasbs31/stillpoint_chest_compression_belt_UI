import { deviceConfig } from '@/device/device.config';
import type { DeviceState } from '@/data/types';

export interface InputSample {
  t: number;
  pressureRaw: number;
  state: DeviceState;
}

export interface ProcessedSample {
  t: number;
  pressureRaw: number;
  state: DeviceState;
  pressureSmooth: number;
  /** Centred trace for the live breathing chart. Present whenever a sample exists. */
  wave: number;
  /** Baseline-removed signal used for breaths and CSV. Only set in HOLD. */
  breathing?: number;
  breathPoint?: 'peak' | 'trough';
  gap: boolean;
}

export interface Breath {
  startT: number;
  peakT: number;
  endT: number;
  durationS: number;
  depth: number;
}

export interface LiveMetrics {
  status: 'waiting' | 'detecting' | 'ready';
  rate: number | null;
  depth: number | null;
  regularity: number | null;
  pressure: number | null;
  breaths: number;
  holdS: number;
}

export function processSeries(input: InputSample[]): { samples: ProcessedSample[]; breaths: Breath[] } {
  const samples: ProcessedSample[] = input.map((sample, index) => ({
    t: sample.t,
    pressureRaw: sample.pressureRaw,
    state: sample.state,
    pressureSmooth: sample.pressureRaw,
    wave: 0,
    gap: index > 0 && sample.t - input[index - 1].t > deviceConfig.gapMs,
  }));

  const window = deviceConfig.smoothSamples;
  for (let i = 0; i < samples.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i; j >= 0 && count < window; j--) {
      if (j < i && samples[j + 1].gap) break;
      if (samples[j].state !== samples[i].state) break;
      sum += samples[j].pressureRaw;
      count += 1;
    }
    samples[i].pressureSmooth = sum / count;
  }

  let holdStart = -1;
  const eligible: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].state !== 'HOLD') {
      holdStart = -1;
      continue;
    }
    if (holdStart < 0) holdStart = samples[i].t;
    if (samples[i].t - holdStart >= deviceConfig.holdSkipMs) eligible.push(i);
  }

  let windowStart = 0;
  for (let e = 0; e < eligible.length; e++) {
    if (e > 0 && eligible[e] !== eligible[e - 1] + 1) windowStart = e;
    const sample = samples[eligible[e]];
    const from = sample.t - deviceConfig.baselineWindowMs;
    while (windowStart < e && samples[eligible[windowStart]].t < from) windowStart += 1;
    const windowValues: number[] = [];
    for (let k = windowStart; k <= e; k++) windowValues.push(samples[eligible[k]].pressureSmooth);
    sample.breathing = sample.pressureSmooth - median(windowValues);
  }

  assignWave(samples);
  const breaths = detectBreaths(samples, eligible);
  return { samples, breaths };
}

/** The live buffer is reprocessed only when a new sample arrives, and only the part the screen needs. */
const LIVE_SPAN_MS = 75_000;
let liveKey = '';
let liveResult: { samples: ProcessedSample[]; breaths: Breath[] } = { samples: [], breaths: [] };

export function processLive(input: InputSample[]) {
  const last = input[input.length - 1];
  const key = `${input.length}:${last?.t ?? 0}:${last?.state ?? ''}:${input[0]?.t ?? 0}`;
  if (key === liveKey) return liveResult;
  let first = 0;
  if (last) {
    const cutoff = last.t - LIVE_SPAN_MS;
    while (first < input.length && input[first].t < cutoff) first += 1;
  }
  liveResult = processSeries(first ? input.slice(first) : input);
  liveKey = key;
  return liveResult;
}

function assignWave(samples: ProcessedSample[]) {
  let start = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (sample.breathing != null) {
      sample.wave = sample.breathing;
      continue;
    }
    const from = sample.t - deviceConfig.baselineWindowMs;
    while (start < i && samples[start].t < from) start += 1;
    const windowValues: number[] = [];
    for (let k = i; k >= start && windowValues.length < 100; k--) windowValues.push(samples[k].pressureSmooth);
    sample.wave = sample.pressureSmooth - median(windowValues);
  }
}

export function liveMetrics(samples: ProcessedSample[], breaths: Breath[], now: number): LiveMetrics {
  const latest = samples[samples.length - 1];
  const holding = latest?.state === 'HOLD';
  let holdStart = now;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].state !== 'HOLD') break;
    holdStart = samples[i].t;
  }
  const holdS = holding ? Math.max(0, (now - holdStart) / 1000) : 0;
  const pressure = latest?.pressureSmooth ?? null;
  if (!holding) {
    return { status: 'waiting', rate: null, depth: null, regularity: null, pressure, breaths: breaths.length, holdS: 0 };
  }
  const recent = breaths.filter((breath) => breath.startT >= holdStart).slice(-6);
  if (recent.length < 3) {
    return { status: 'detecting', rate: null, depth: null, regularity: null, pressure, breaths: breaths.length, holdS };
  }
  const durations = recent.map((breath) => breath.durationS);
  const depths = recent.map((breath) => breath.depth);
  const meanDuration = mean(durations);
  return {
    status: 'ready',
    rate: meanDuration > 0 ? 60 / meanDuration : null,
    depth: median(depths),
    regularity: regularity(durations),
    pressure,
    breaths: breaths.length,
    holdS,
  };
}

export function summarize(samples: ProcessedSample[], breaths: Breath[]) {
  const durations = breaths.map((breath) => breath.durationS);
  const meanDuration = durations.length ? mean(durations) : 0;
  let holdMs = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i - 1].state === 'HOLD' && samples[i].state === 'HOLD' && !samples[i].gap) holdMs += samples[i].t - samples[i - 1].t;
  }
  return {
    breaths: breaths.length,
    rateAvg: meanDuration > 0 ? 60 / meanDuration : 0,
    depthAvg: breaths.length ? mean(breaths.map((breath) => breath.depth)) : 0,
    regularityAvg: durations.length >= 2 ? regularity(durations) : 0,
    holdS: holdMs / 1000,
  };
}

/**
 * Breaths are found per unbroken hold segment. A peak or trough is confirmed only once the
 * signal has moved back by the hysteresis amount, so small wiggles never count as breaths.
 */
function detectBreaths(samples: ProcessedSample[], eligible: number[]): Breath[] {
  const segments: number[][] = [];
  let current: number[] = [];
  for (let k = 0; k < eligible.length; k++) {
    const index = eligible[k];
    if (current.length && (index !== current[current.length - 1] + 1 || samples[index].gap)) {
      segments.push(current);
      current = [];
    }
    current.push(index);
  }
  if (current.length) segments.push(current);
  return segments.flatMap((segment) => detectInSegment(samples, segment));
}

function detectInSegment(samples: ProcessedSample[], indices: number[]): Breath[] {
  const value = (index: number) => samples[index].breathing ?? 0;
  const extrema: { index: number; kind: 'peak' | 'trough' }[] = [];
  let mode: 'any' | 'peak' | 'trough' = 'any';
  let hi = indices[0];
  let lo = indices[0];
  let h: number = deviceConfig.noiseFloor;
  for (let k = 0; k < indices.length; k++) {
    const index = indices[k];
    if (k % 5 === 0) h = hysteresis(samples, indices, k);
    const v = value(index);
    if (v > value(hi)) hi = index;
    if (v < value(lo)) lo = index;
    if (mode !== 'trough' && value(hi) - v >= h && (mode === 'peak' || hi !== index)) {
      extrema.push({ index: hi, kind: 'peak' });
      mode = 'trough';
      lo = index;
    } else if (mode !== 'peak' && v - value(lo) >= h && (mode === 'trough' || lo !== index)) {
      extrema.push({ index: lo, kind: 'trough' });
      mode = 'peak';
      hi = index;
    }
  }

  const breaths: Breath[] = [];
  for (let e = 0; e + 2 < extrema.length; e++) {
    const [a, b, c] = [extrema[e], extrema[e + 1], extrema[e + 2]];
    if (a.kind !== 'trough' || b.kind !== 'peak' || c.kind !== 'trough') continue;
    const start = samples[a.index];
    const peak = samples[b.index];
    const end = samples[c.index];
    const durationS = (end.t - start.t) / 1000;
    if (start.t - samples[indices[0]].t < deviceConfig.baselineWarmupMs) continue;
    if (durationS < deviceConfig.minBreathSeparationS) continue;
    start.breathPoint = 'trough';
    peak.breathPoint = 'peak';
    end.breathPoint = 'trough';
    breaths.push({
      startT: start.t,
      peakT: peak.t,
      endT: end.t,
      durationS,
      depth: (value(b.index) - value(a.index) + value(b.index) - value(c.index)) / 2,
    });
  }
  return breaths;
}

/** A quarter of the recent breathing range, never below the noise floor. Works in any unit. */
function hysteresis(samples: ProcessedSample[], indices: number[], k: number) {
  const now = samples[indices[k]].t;
  const values: number[] = [];
  for (let j = k; j >= 0; j--) {
    const sample = samples[indices[j]];
    if (now - sample.t > deviceConfig.baselineWindowMs) break;
    values.push(sample.breathing ?? 0);
  }
  values.sort((a, b) => a - b);
  const p = (q: number) => values[Math.min(values.length - 1, Math.max(0, Math.round(q * (values.length - 1))))];
  return Math.max(deviceConfig.noiseFloor, deviceConfig.prominenceRatio * (p(0.95) - p(0.05)));
}

function regularity(durations: number[]) {
  const avg = mean(durations);
  if (avg <= 0) return 0;
  const variance = durations.reduce((sum, value) => sum + (value - avg) ** 2, 0) / durations.length;
  const value = 100 * (1 - Math.sqrt(variance) / avg);
  return Math.max(0, Math.min(100, value));
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
