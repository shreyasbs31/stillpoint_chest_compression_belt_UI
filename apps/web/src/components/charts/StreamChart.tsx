import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import { getPoints } from '@/device/buffer';
import { deviceConfig } from '@/device/device.config';
import type { LiveMarker } from '@/device/useDevice';
import type { DeviceState } from '@/data/types';

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function StreamChart({
  kind,
  windowSec,
  markers,
}: {
  kind: 'breathing' | 'pressure';
  windowSec: number;
  markers: LiveMarker[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const windowRef = useRef(windowSec);
  windowRef.current = windowSec;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const color = kind === 'breathing' ? token('--wave') : token('--pressure');
    let states: DeviceState[] = [];
    let frame = 0;

    const chart = new uPlot(
      {
        width: Math.max(el.clientWidth, 32),
        height: Math.max(el.clientHeight, 32),
        pxAlign: false,
        cursor: { show: false },
        legend: { show: false },
        padding: [8, 12, 0, 0],
        scales: {
          x: { time: false },
          y: {
            range: (_u, min, max) => {
              if (!Number.isFinite(min) || !Number.isFinite(max)) return [-1, 1];
              if (min === max) {
                const pad = Math.max(1, Math.abs(min) * 0.08);
                return [min - pad, max + pad];
              }
              const span = max - min;
              return [min - span * 0.12, max + span * 0.12];
            },
          },
        },
        axes: [
          {
            stroke: token('--text-muted'),
            grid: { stroke: token('--border'), width: 1 },
            ticks: { stroke: token('--border'), width: 1, size: 4 },
            font: '500 11px Inter',
            size: 24,
            values: (_u, vals) => vals.map((value) => (value >= -0.05 ? 'now' : `${Math.round(-value)}s`)),
          },
          {
            stroke: token('--text-muted'),
            grid: { stroke: token('--border'), width: 1 },
            ticks: { stroke: token('--border'), width: 1, size: 4 },
            font: '500 11px Inter',
            size: 56,
            values: (_u, vals) => vals.map((value) => formatTick(value)),
          },
        ],
        series: [{}, { stroke: color, width: kind === 'breathing' ? 2 : 1.5 }],
        hooks: {
          drawClear: [
            (u) => {
              if (kind === 'pressure') drawBands(u, states);
            },
          ],
          draw: [
            (u) => {
              drawMarkers(u, markersRef.current);
            },
          ],
        },
      },
      [
        [-windowSec, 0],
        [null, null],
      ],
      el,
    );

    const draw = () => {
      const now = Date.now();
      const span = windowRef.current * 1000;
      const from = now - span;
      const xs: number[] = [];
      const ys: (number | null)[] = [];
      states = [];
      let prevT = -1;
      for (const point of getPoints()) {
        if (point.t < from) continue;
        if (prevT >= 0 && point.t - prevT > deviceConfig.gapMs) {
          xs.push((point.t - now) / 1000);
          ys.push(null);
          states.push(point.state);
        }
        prevT = point.t;
        xs.push((point.t - now) / 1000);
        ys.push(Number.isFinite(point.pressureRaw) ? point.pressureRaw : null);
        states.push(point.state);
      }
      if (!xs.length) {
        xs.push(-windowRef.current, 0);
        ys.push(null, null);
      }
      chart.setData([xs, ys]);
      chart.setScale('x', { min: -windowRef.current, max: 0 });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    const observer = new ResizeObserver(() => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width < 16 || height < 16) return;
      chart.setSize({ width, height });
    });
    observer.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      chart.destroy();
    };
  }, [kind, windowSec]);

  return <div ref={host} className="absolute inset-0" />;
}

function formatTick(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function drawBands(chart: uPlot, states: DeviceState[]) {
  const data = chart.data[0] as number[];
  if (!data?.length || data.length !== states.length || chart.bbox?.left == null) return;
  const ctx = chart.ctx;
  const top = chart.bbox.top;
  const height = chart.bbox.height;
  let run = 0;
  for (let i = 1; i <= states.length; i++) {
    if (i === states.length || states[i] !== states[run]) {
      const color = bandColor(states[run]);
      if (color) {
        const x0 = chart.valToPos(data[run], 'x', true);
        const x1 = chart.valToPos(data[i - 1], 'x', true);
        ctx.fillStyle = color;
        ctx.fillRect(x0, top, Math.max(1, x1 - x0), height);
      }
      run = i;
    }
  }
}

function drawMarkers(chart: uPlot, markers: LiveMarker[]) {
  if (!markers.length || chart.bbox?.left == null) return;
  const now = Date.now();
  const ctx = chart.ctx;
  ctx.save();
  ctx.strokeStyle = token('--text-muted');
  ctx.fillStyle = token('--text-muted');
  ctx.font = '500 11px Inter';
  ctx.setLineDash([3, 3]);
  const min = chart.scales.x.min ?? -30;
  const max = chart.scales.x.max ?? 0;
  const yTop = chart.bbox.top + 2;
  const yBottom = chart.bbox.top + chart.bbox.height;
  for (const marker of markers) {
    const xVal = (marker.t - now) / 1000;
    if (xVal < min || xVal > max) continue;
    const x = chart.valToPos(xVal, 'x', true);
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.lineTo(x, yBottom);
    ctx.stroke();
    ctx.fillText(marker.text, x + 4, yTop + 12);
  }
  ctx.restore();
}

function bandColor(state: DeviceState) {
  if (state === 'INFLATE') return token('--inflate-band');
  if (state === 'HOLD') return token('--hold-band');
  if (state === 'DEFLATE') return token('--deflate-band');
  return '';
}
