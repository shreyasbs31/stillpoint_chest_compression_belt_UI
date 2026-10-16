/** Controller limits and timings. Change them here, never inside a component. */

export const deviceConfig = {
  baudRate: 115200,
  readyTimeoutMs: 8_000,
  /** Opening the port resets the Mega. Data after this long with no READY means it did not reset. */
  startupQuietMs: 2_500,
  noDataMs: 2_000,
  /** Missing data, not one late sample. The sensor reports about every 100 ms. */
  gapMs: 400,
  holdSkipMs: 300,
  smoothSamples: 5,
  baselineWindowMs: 10_000,
  /** Breaths that start this soon after a hold begins are not counted while the baseline settles. */
  baselineWarmupMs: 3_000,
  minBreathSeparationS: 1.5,
  /** A turn counts once the signal moves back by this share of its recent range. */
  prominenceRatio: 0.2,
  /** Smallest swing that can count, in rel. The firmware prints 2 decimals. */
  noiseFloor: 0.03,
  noBreathAlertS: 15,
  /** Firmware inflates for this long, then seals and holds. It does not stop on pressure. */
  inflateTimeMs: 4_500,
  /** Firmware deflates for this long, then returns to idle. */
  deflateTimeMs: 25_000,
  alertRepeatMs: 10_000,
  batchMs: 1_000,
  liveWindowMs: 120_000,
} as const;
