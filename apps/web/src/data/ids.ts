const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function createId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let time = Date.now();
  let id = '';
  for (let i = 0; i < 10; i++) {
    id = ALPHABET[time % 32] + id;
    time = Math.floor(time / 32);
  }
  for (const byte of bytes) id += ALPHABET[byte % 32];
  return id.slice(0, 26);
}

export function localTimestamp(date: Date) {
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function formatWhen(iso: string) {
  const date = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${hh}:${mm}`;
}

export function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function fileStamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    day: `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
    time: `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  };
}

export function safeFilePart(value: string) {
  return value.replace(/[^\w.-]+/g, '_');
}
