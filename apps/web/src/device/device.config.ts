/** Controller limits and timings. Change them here, never inside a component. */

export const deviceConfig = {
  baudRate: 115200,
  readyTimeoutMs: 8_000,
  noDataMs: 2_000,
  gapMs: 150,
  holdSkipMs: 300,
  smoothSamples: 5,
  baselineWindowMs: 10_000,
  minBreathSeparationS: 1.5,
  prominenceRatio: 0.2,
  noiseFloor: 0.15,
  holdAutoDeflateS: 10 * 60,
  noBreathAlertS: 15,
  inflateStop: 50,
  deflateTarget: 5,
  alertRepeatMs: 10_000,
  batchMs: 1_000,
  liveWindowMs: 120_000,
} as const;
