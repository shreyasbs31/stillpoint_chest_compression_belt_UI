import type { DeviceState } from '@/data/types';

const STATES: DeviceState[] = ['IDLE', 'INFLATE', 'HOLD', 'DEFLATE'];

const DATA = /^pressure_mmHg:(-?[\d.]+),state:(\d)$/;
const EVENT = /^EVENT: (.*)$/;
const STATUS = /^STATUS: (.*)$/;
const FAULT = /^sensor_fault:1$/;

export type ParsedLine =
  | { type: 'data'; pressure: number; pressureText: string; state: DeviceState }
  | { type: 'event'; text: string }
  | { type: 'status'; fields: Record<string, string> }
  | { type: 'fault' }
  | { type: 'unknown'; line: string };

export function parseLine(line: string): ParsedLine {
  const trimmed = line.trim();
  const data = DATA.exec(trimmed);
  if (data) {
    const code = Number(data[2]);
    return {
      type: 'data',
      pressure: Number(data[1]),
      pressureText: data[1],
      state: STATES[code] ?? 'IDLE',
    };
  }
  const event = EVENT.exec(trimmed);
  if (event) return { type: 'event', text: event[1] };
  const status = STATUS.exec(trimmed);
  if (status) {
    const fields: Record<string, string> = {};
    for (const part of status[1].split(/\s+/)) {
      const eq = part.indexOf('=');
      if (eq > 0) fields[part.slice(0, eq)] = part.slice(eq + 1);
    }
    return { type: 'status', fields };
  }
  if (FAULT.test(trimmed)) return { type: 'fault' };
  return { type: 'unknown', line: trimmed };
}

export type AlertMatch =
  | { level: 'critical'; message: string; key: string }
  | { level: 'warning'; message: string; key: string }
  | { level: 'info'; message: string; key: string }
  | null;

/** Match on keywords. Firmware wording can change without breaking these. */
export function matchEvent(text: string, alreadyReady: boolean): AlertMatch {
  const lower = text.toLowerCase();
  if (/^ready\b/.test(lower)) {
    if (alreadyReady) {
      return {
        level: 'critical',
        key: 'restarted',
        message: 'The controller restarted. The saved zero was kept. The belt may still be inflated. Press Deflate, or release the belt by hand.',
      };
    }
    return null;
  }
  if (lower.includes('no zero saved')) {
    return {
      level: 'warning',
      key: 'no-zero',
      message: 'No zero is saved. Open the bladder to air, then press Zero sensor.',
    };
  }
  if (lower.includes('zero failed')) {
    return {
      level: 'warning',
      key: 'zero-failed',
      message: 'Zero sensor failed. The sensor is not responding.',
    };
  }
  if (lower.includes('safety') && lower.includes('sensor')) {
    return {
      level: 'critical',
      key: 'sensor',
      message: 'Pressure sensor not responding. The belt stays as it is.',
    };
  }
  if (lower.includes('safety') && lower.includes('over-pressure')) {
    return {
      level: 'critical',
      key: 'overpressure',
      message: 'Over-pressure detected. The controller vented the belt.',
    };
  }
  if (lower.includes('safety') && lower.includes('max hold')) {
    return {
      level: 'warning',
      key: 'hold-limit',
      message: 'The belt deflated automatically after 10 minutes of hold.',
    };
  }
  if (lower.includes('refused') && lower.includes('inflate')) {
    return {
      level: 'warning',
      key: 'inflate-refused',
      message: 'Inflate refused: the sensor is not responding.',
    };
  }
  if (lower.includes('max pressure')) {
    return { level: 'info', key: 'inflate-limit', message: 'Inflation stopped at the pressure limit.' };
  }
  if (lower.includes('refused') && (lower.includes('tare') || lower.includes('zero'))) {
    return { level: 'info', key: 'zero-refused', message: 'Zero sensor works only in IDLE with an empty bladder.' };
  }
  if (lower.includes('zero set and saved')) {
    return { level: 'info', key: 'zero-saved', message: 'Sensor zeroed and saved on the controller.' };
  }
  return null;
}
