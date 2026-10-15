import { deviceConfig } from './device.config';
import type { DeviceState } from '@/data/types';

export interface LivePoint {
  t: number;
  pressureRaw: number;
  pressureText: string;
  state: DeviceState;
}

const points: LivePoint[] = [];
const listeners = new Set<() => void>();

export function pushPoint(point: LivePoint) {
  points.push(point);
  const cutoff = point.t - deviceConfig.liveWindowMs;
  while (points.length && points[0].t < cutoff) points.shift();
  listeners.forEach((listener) => listener());
}

export function getPoints() {
  return points;
}

export function clearPoints() {
  points.length = 0;
  listeners.forEach((listener) => listener());
}

export function subscribePoints(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
