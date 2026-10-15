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
    expect(metrics.rate).toBeGreaterThan(10);
    expect(metrics.rate).toBeLessThan(14);
    expect(metrics.depth).toBeGreaterThan(3);
    expect(metrics.depth).toBeLessThan(4.5);
    expect(metrics.regularity).toBeGreaterThan(90);
  });

  it('waits outside HOLD and ignores the inflate transient', () => {
    const idle = sine(5, 12, 2, 'IDLE');
    const { breaths, samples } = processSeries(idle);
    expect(breaths).toHaveLength(0);
    expect(liveMetrics(samples, breaths, idle[idle.length - 1].t).status).toBe('waiting');
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
