import { describe, expect, it } from 'vitest';
import { matchEvent, parseLine } from './protocol';

describe('parseLine', () => {
  it('reads a data line and keeps the raw text', () => {
    expect(parseLine('pressure_mmHg:12.47,state:2')).toEqual({
      type: 'data',
      pressure: 12.47,
      pressureText: '12.47',
      state: 'HOLD',
    });
  });

  it('reads events, status fields and sensor faults', () => {
    expect(parseLine('EVENT: HOLD (inflate time done, solenoids closed)')).toEqual({
      type: 'event',
      text: 'HOLD (inflate time done, solenoids closed)',
    });
    expect(parseLine('STATUS: state=HOLD time_in_state_ms=4210')).toEqual({
      type: 'status',
      fields: { state: 'HOLD', time_in_state_ms: '4210' },
    });
    expect(parseLine('sensor_fault:1')).toEqual({ type: 'fault' });
  });

  it('keeps unknown lines for the device log', () => {
    expect(parseLine('hello')).toEqual({ type: 'unknown', line: 'hello' });
  });
});

describe('matchEvent', () => {
  it('raises a restart only after the first READY', () => {
    expect(matchEvent('READY. Commands: 1=inflate+hold, 2=deflate, 0=stop, t=set zero, ?=status', false)).toBeNull();
    expect(matchEvent('READY. Commands: 1=inflate+hold', true)?.message).toContain('saved zero was kept');
  });

  it('warns when no zero is saved and when zero is refused', () => {
    expect(matchEvent('NO ZERO SAVED - open bladder to air and send t', false)?.key).toBe('no-zero');
    expect(matchEvent('REFUSED zero - only allowed in IDLE', true)?.key).toBe('zero-refused');
    expect(matchEvent('zero failed - sensor not responding', true)?.key).toBe('zero-failed');
  });

  it('matches safety and refusal keywords without the full firmware sentence', () => {
    expect(matchEvent('DEFLATE (SAFETY: over-pressure vent)', true)?.level).toBe('critical');
    expect(matchEvent('REFUSED inflate because sensor', true)?.message).toContain('Inflate refused');
    expect(matchEvent('HOLD (max pressure reached early)', true)?.level).toBe('info');
  });
});
