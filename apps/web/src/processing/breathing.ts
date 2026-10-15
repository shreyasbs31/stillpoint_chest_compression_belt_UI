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
    gap: index > 0 && sample.t - input[index - 1].t > deviceConfig.gapMs,
  }));

  const window = deviceConfig.smoothSamples;
  for (let i = 0; i < samples.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i; j >= 0 && count < window; j--) {
      if (j < i && samples[j + 1].gap) break;
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

  for (const index of eligible) {
    const sample = samples[index];
    const from = sample.t - deviceConfig.baselineWindowMs;
    const windowValues: number[] = [];
    for (let k = eligible.length - 1; k >= 0; k--) {
      const other = samples[eligible[k]];
      if (other.t > sample.t) continue;
      if (other.t < from) break;
      windowValues.push(other.pressureSmooth);
    }
    const baseline = windowValues.length ? median(windowValues) : sample.pressureSmooth;
    sample.breathing = sample.pressureSmooth - baseline;
  }

  const breaths = detectBreaths(samples, eligible);
  return { samples, breaths };
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
  const recent = breaths.slice(-6);
  if (!holding) {
    return { status: 'waiting', rate: null, depth: null, regularity: null, pressure: null, breaths: breaths.length, holdS: 0 };
  }
  const pressure = latest?.pressureSmooth ?? null;
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
    if (samples[i - 1].state === 'HOLD' && !samples[i].gap) holdMs += samples[i].t - samples[i - 1].t;
  }
  return {
    breaths: breaths.length,
    rateAvg: meanDuration > 0 ? 60 / meanDuration : 0,
    depthAvg: breaths.length ? mean(breaths.map((breath) => breath.depth)) : 0,
    regularityAvg: durations.length >= 2 ? regularity(durations) : 0,
    holdS: holdMs / 1000,
  };
}

function detectBreaths(samples: ProcessedSample[], eligible: number[]): Breath[] {
  const extrema: { index: number; kind: 'peak' | 'trough' }[] = [];
  for (let k = 1; k < eligible.length - 1; k++) {
    const prev = samples[eligible[k - 1]];
    const curr = samples[eligible[k]];
    const next = samples[eligible[k + 1]];
    if (curr.breathing == null || prev.breathing == null || next.breathing == null) continue;
    if (curr.gap || next.gap) continue;
    if (curr.breathing > prev.breathing && curr.breathing >= next.breathing) extrema.push({ index: eligible[k], kind: 'peak' });
    if (curr.breathing < prev.breathing && curr.breathing <= next.breathing) extrema.push({ index: eligible[k], kind: 'trough' });
  }

  const breaths: Breath[] = [];
  let start: ProcessedSample | null = null;
  let peak: ProcessedSample | null = null;

  const separated = (a: ProcessedSample, b: ProcessedSample) => (b.t - a.t) / 1000 >= deviceConfig.minBreathSeparationS;

  for (const ext of extrema) {
    const sample = samples[ext.index];
    if (ext.kind === 'trough' && !peak) {
      start = sample;
      continue;
    }
    if (ext.kind === 'peak' && start && !peak && separated(start, sample)) {
      if (hasGapBetween(samples, start.t, sample.t)) {
        start = null;
        continue;
      }
      const depth = (sample.breathing ?? 0) - (start.breathing ?? 0);
      if (depth >= threshold(breaths)) peak = sample;
      continue;
    }
    if (ext.kind === 'trough' && start && peak && separated(peak, sample)) {
      if (hasGapBetween(samples, start.t, sample.t)) {
        start = sample;
        peak = null;
        continue;
      }
      const depth = (peak.breathing ?? 0) - (sample.breathing ?? 0);
      const rise = (peak.breathing ?? 0) - (start.breathing ?? 0);
      if (depth < threshold(breaths) || rise < threshold(breaths)) {
        start = sample;
        peak = null;
        continue;
      }
      const breath: Breath = {
        startT: start.t,
        peakT: peak.t,
        endT: sample.t,
        durationS: (sample.t - start.t) / 1000,
        depth: ((peak.breathing ?? 0) - (start.breathing ?? 0) + (peak.breathing ?? 0) - (sample.breathing ?? 0)) / 2,
      };
      breaths.push(breath);
      start.breathPoint = 'trough';
      peak.breathPoint = 'peak';
      sample.breathPoint = 'trough';
      start = sample;
      peak = null;
    }
  }
  return breaths;
}

function hasGapBetween(samples: ProcessedSample[], from: number, to: number) {
  return samples.some((sample) => sample.gap && sample.t > from && sample.t <= to);
}

function threshold(breaths: Breath[]) {
  const recent = breaths.slice(-6).map((breath) => breath.depth);
  const floor = recent.length ? deviceConfig.prominenceRatio * median(recent) : 0;
  return Math.max(deviceConfig.noiseFloor, floor);
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
