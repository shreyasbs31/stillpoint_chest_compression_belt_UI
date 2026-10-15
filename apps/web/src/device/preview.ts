import { clearPoints, pushPoint } from './buffer';
import { useDevice } from './useDevice';

let timer = 0;

/** Development only. Feeds a hold so the monitor can be reviewed without the belt. */
export function seedPreview() {
  window.clearInterval(timer);
  clearPoints();
  const start = Date.now() - 28_000;
  for (let i = 0; i <= 280; i++) {
    const t = start + i * 100;
    const wave = Math.sin((2 * Math.PI * (t / 1000)) / (60 / 13));
    const pressure = i < 40 ? 4 + i * 0.45 : 22 + 1.7 * wave;
    const state = i < 40 ? 'INFLATE' : 'HOLD';
    pushPoint({
      t,
      pressureRaw: pressure,
      pressureText: pressure.toFixed(2),
      state,
    });
  }
  useDevice.setState({ status: 'connected', ready: true, state: 'HOLD', emptyConfirmed: true, error: null, alerts: [] });
  timer = window.setInterval(() => {
    const t = Date.now();
    const wave = Math.sin((2 * Math.PI * (t / 1000)) / (60 / 13));
    const pressure = 22 + 1.7 * wave;
    pushPoint({ t, pressureRaw: pressure, pressureText: pressure.toFixed(2), state: 'HOLD' });
  }, 100);
}
