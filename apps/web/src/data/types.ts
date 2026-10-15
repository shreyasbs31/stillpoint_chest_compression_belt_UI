export type DeviceState = 'IDLE' | 'INFLATE' | 'HOLD' | 'DEFLATE';

export interface Patient {
  id: string;
  patientId: string;
  name: string;
  age?: number;
  sex?: 'Female' | 'Male' | 'Other';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummary {
  breaths: number;
  rateAvg: number;
  depthAvg: number;
  regularityAvg: number;
  holdS: number;
}

export interface Session {
  id: string;
  patientRef: string;
  startedAt: string;
  endedAt?: string;
  durationS?: number;
  summary?: SessionSummary;
  notes?: string;
  device?: { zeroOffset?: number; lineRateHz?: number };
}

export interface Sample {
  sessionId: string;
  seq: number;
  t: number;
  elapsedS: number;
  pressureRaw: number;
  pressureText: string;
  breathing?: number;
  state: DeviceState;
  breathPoint?: 'peak' | 'trough';
}

export interface Marker {
  id: string;
  sessionId: string;
  t: number;
  elapsedS: number;
  kind: 'cough' | 'movement' | 'talking' | 'note' | 'alert' | 'device_event';
  text: string;
}

export interface AppSecurity {
  id: 'app';
  salt: string;
  hash: string;
  iterations: number;
}

export interface CsvRow {
  sessionId: string;
  patientId: string;
  timestamp: string;
  elapsedS: number;
  pressureText: string;
  breathing?: number;
  state: DeviceState;
  breathPoint?: 'peak' | 'trough';
  marker?: string;
}
