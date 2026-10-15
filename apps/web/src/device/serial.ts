import { deviceConfig } from './device.config';

interface SerialPortLike {
  open: (options: { baudRate: number; dataBits: number; stopBits: number; parity: 'none' }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
  addEventListener: (type: 'disconnect', listener: () => void) => void;
  removeEventListener: (type: 'disconnect', listener: () => void) => void;
}

interface SerialLike {
  getPorts: () => Promise<SerialPortLike[]>;
  requestPort: () => Promise<SerialPortLike>;
}

let port: SerialPortLike | null = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let onDisconnect: (() => void) | null = null;

export function serialSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export function portLabel() {
  const info = port?.getInfo?.();
  if (info?.usbVendorId == null) return port ? 'USB serial' : 'No port';
  const vendor = info.usbVendorId.toString(16).padStart(4, '0');
  const product = (info.usbProductId ?? 0).toString(16).padStart(4, '0');
  return `USB ${vendor}:${product}`;
}

export async function openSerial(onLine: (line: string) => void, handleDisconnect: () => void) {
  const serial = (navigator as Navigator & { serial?: SerialLike }).serial;
  if (!serial) throw new Error('Web Serial is not available. Open Stillpoint in Chrome or Edge.');
  const existing = await serial.getPorts();
  const next = existing[0] ?? (await serial.requestPort());
  try {
    await next.open({ baudRate: deviceConfig.baudRate, dataBits: 8, stopBits: 1, parity: 'none' });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'InvalidStateError' || name === 'NetworkError') {
      throw new Error('Close the Arduino IDE Serial Monitor and Serial Plotter, then try again.');
    }
    if (name === 'NotAllowedError') throw new Error('Allow the port picker, then try again.');
    throw error;
  }
  port = next;
  onDisconnect = handleDisconnect;
  port.addEventListener('disconnect', handleDisconnect);
  if (!port.readable || !port.writable) throw new Error('The device did not start. Unplug it, plug it back in, and try again.');
  writer = port.writable.getWriter();
  reader = port.readable.getReader();
  void readLoop(onLine, handleDisconnect);
}

async function readLoop(onLine: (line: string) => void, handleDisconnect: () => void) {
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (reader) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index = buffer.indexOf('\n');
      while (index >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        if (line.length) onLine(line);
        index = buffer.indexOf('\n');
      }
    }
    handleDisconnect();
  } catch {
    handleDisconnect();
  }
}

export async function writeSerial(command: string) {
  if (!writer) return;
  await writer.write(new TextEncoder().encode(command));
}

export async function closeSerial() {
  const current = port;
  const disconnect = onDisconnect;
  try {
    await reader?.cancel();
  } catch {
    /* port already closing */
  }
  reader = null;
  try {
    writer?.releaseLock();
  } catch {
    /* writer already released */
  }
  writer = null;
  if (current && disconnect) current.removeEventListener('disconnect', disconnect);
  onDisconnect = null;
  port = null;
  try {
    await current?.close();
  } catch {
    /* already closed */
  }
}
