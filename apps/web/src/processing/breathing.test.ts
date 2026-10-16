import { describe, expect, it } from 'vitest';
import { liveMetrics, processSeries } from './breathing';
import type { DeviceState } from '@/data/types';

describe('breathing', () => {
  it('measures rate and depth on a 12 br/min hold', () => {
    const samples = sine(40, 12, 2, 'HOLD');
    const { samples: processed, breaths } = processSeries(samples);
    const metrics = liveMetrics(processed, breaths, samples[samples.length - 1].t);
    expect(breaths.length).toBeGreaterThanOrEqual(6);
    expect(metrics.status).toBe('ready');
    expect(metrics.rate).toBeGreaterThan(11.5);
    expect(metrics.rate).toBeLessThan(12.5);
    expect(metrics.depth).toBeGreaterThan(3);
    expect(metrics.depth).toBeLessThan(4.5);
    expect(metrics.regularity).toBeGreaterThan(90);
  });

  it('counts every breath in a noisy, drifting hold', () => {
    const random = lcg(7);
    const rows = sine(60, 15, 1.5, 'HOLD').map((row, index) => ({
      ...row,
      pressureRaw: Number((row.pressureRaw + index * 0.002 + (random() - 0.5) * 0.6).toFixed(2)),
    }));
    const { breaths } = processSeries(rows);
    // 15 br/min for 60 s is 15 cycles; the first and last are partial.
    expect(breaths.length).toBeGreaterThanOrEqual(13);
    expect(breaths.length).toBeLessThanOrEqual(15);
    for (const breath of breaths) {
      expect(breath.durationS).toBeGreaterThan(3);
      expect(breath.durationS).toBeLessThan(5);
    }
  });

  it('counts fast breathing at 30 br/min', () => {
    const { samples, breaths } = processSeries(sine(40, 30, 1, 'HOLD'));
    const metrics = liveMetrics(samples, breaths, samples[samples.length - 1].t);
    expect(breaths.length).toBeGreaterThanOrEqual(17);
    expect(metrics.rate).toBeGreaterThan(28);
    expect(metrics.rate).toBeLessThan(32);
  });

  it('counts a small signal at the firmware resolution', () => {
    const rows = sine(40, 12, 0.08, 'HOLD').map((row) => ({ ...row, pressureRaw: Number(row.pressureRaw.toFixed(2)) }));
    const { breaths } = processSeries(rows);
    expect(breaths.length).toBeGreaterThanOrEqual(6);
    expect(breaths.length).toBeLessThanOrEqual(8);
  });

  it('finds no breaths in a flat hold with sensor noise', () => {
    const random = lcg(3);
    const rows = sine(30, 12, 0, 'HOLD').map((row) => ({ ...row, pressureRaw: Number((20 + (random() - 0.5) * 0.02).toFixed(2)) }));
    expect(processSeries(rows).breaths).toHaveLength(0);
  });

  it('waits outside HOLD and still reports belt pressure', () => {
    const idle = sine(5, 12, 2, 'IDLE');
    const { breaths, samples } = processSeries(idle);
    const metrics = liveMetrics(samples, breaths, idle[idle.length - 1].t);
    expect(breaths).toHaveLength(0);
    expect(metrics.status).toBe('waiting');
    expect(metrics.pressure).not.toBeNull();
  });

  it('draws a wave before HOLD without counting breaths', () => {
    const idle = sine(8, 12, 2, 'IDLE');
    const { samples, breaths } = processSeries(idle);
    expect(breaths).toHaveLength(0);
    expect(samples.every((sample) => sample.breathing == null)).toBe(true);
    expect(samples.every((sample) => Number.isFinite(sample.wave))).toBe(true);
    expect(Math.max(...samples.map((sample) => sample.wave)) - Math.min(...samples.map((sample) => sample.wave))).toBeGreaterThan(1);
  });

  it('keeps a breath across one late 10 Hz sample', () => {
    const samples = sine(20, 12, 2, 'HOLD').map((sample, index) => (index >= 40 ? { ...sample, t: sample.t + 200 } : sample));
    const { breaths } = processSeries(samples);
    expect(breaths.length).toBeGreaterThanOrEqual(3);
  });

  it('does not bridge a gap into one breath', () => {
    const first = sine(8, 12, 2, 'HOLD');
    const second = sine(8, 12, 2, 'HOLD').map((sample) => ({ ...sample, t: sample.t + 20_000 }));
    const { breaths } = processSeries([...first, ...second]);
    expect(breaths.every((breath) => breath.durationS < 8)).toBe(true);
  });
});

function sine(seconds: number, breathsPerMin: number, amplitude: number, state: DeviceState) {
  const period = 60 / breathsPerMin;
  const start = 1_700_000_000_000;
  const rows = [];
  for (let i = 0; i <= seconds * 10; i++) {
    const t = start + i * 100;
    rows.push({
      t,
      pressureRaw: 20 + amplitude * Math.sin((2 * Math.PI * (i * 0.1)) / period),
      state,
    });
  }
  return rows;
}

function lcg(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}
