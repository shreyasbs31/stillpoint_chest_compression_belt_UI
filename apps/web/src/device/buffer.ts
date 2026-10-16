import { deviceConfig } from './device.config';
import type { DeviceState } from '@/data/types';

export interface LivePoint {
  t: number;
  pressureRaw: number;
  pressureText: string;
  state: DeviceState;
}

type Shared = {
  points: LivePoint[];
  listeners: Set<() => void>;
};

const root = globalThis as typeof globalThis & { __stillpointLive?: Shared };
if (!root.__stillpointLive) {
  root.__stillpointLive = { points: [], listeners: new Set() };
}
const store = root.__stillpointLive;

export function pushPoint(point: LivePoint) {
  store.points.push(point);
  const cutoff = point.t - deviceConfig.liveWindowMs;
  while (store.points.length && store.points[0].t < cutoff) store.points.shift();
  store.listeners.forEach((listener) => listener());
}

export function getPoints() {
  return store.points;
}

export function clearPoints() {
  store.points.length = 0;
  store.listeners.forEach((listener) => listener());
}

export function subscribePoints(listener: () => void) {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}
