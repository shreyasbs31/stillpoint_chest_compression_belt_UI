import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import { getPoints, subscribePoints } from '@/device/buffer';
import { processSeries } from '@/processing/breathing';
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
  const plot = useRef<uPlot | null>(null);
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const windowRef = useRef(windowSec);
  windowRef.current = windowSec;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let frame = 0;
    const color = kind === 'breathing' ? token('--wave') : token('--pressure');
    let lastStates: DeviceState[] = [];
    const chart = new uPlot(
      {
        width: el.clientWidth || 320,
        height: el.clientHeight || 180,
        pxAlign: false,
        cursor: { show: false },
        legend: { show: false },
        padding: [10, 10, 0, 0],
        scales: {
          x: { time: false },
          y: {
            range: (_u, min, max) => {
              if (!Number.isFinite(min) || !Number.isFinite(max)) return [-1, 1];
              const span = Math.max(0.8, max - min);
              const pad = span * 0.22;
              return [min - pad, max + pad];
            },
          },
        },
        axes: [
          {
            stroke: token('--text-muted'),
            grid: { stroke: token('--border'), width: 1 },
            ticks: { stroke: token('--border'), width: 1, size: 4 },
            font: '500 11px Inter',
            size: 28,
            gap: 4,
            splits: (u) => {
              const min = u.scales.x.min ?? 0;
              const max = u.scales.x.max ?? 0;
              const step = 5;
              const marks: number[] = [];
              for (let value = Math.ceil(min / step) * step; value < max - 0.5; value += step) marks.push(value);
              marks.push(max);
              return marks;
            },
            values: (_u, vals) =>
              vals.map((value) => {
                const max = _u.scales.x.max ?? value;
                const ago = Math.round(max - value);
                return ago <= 0 ? 'now' : `${ago}s`;
              }),
          },
          {
            stroke: token('--text-muted'),
            grid: { stroke: token('--border'), width: 1 },
            ticks: { stroke: token('--border'), width: 1, size: 4 },
            font: '500 11px Inter',
            size: 44,
            gap: 6,
            label: kind === 'breathing' ? 'Breathing (rel.)' : 'Belt pressure (rel.)',
            labelFont: '500 11px Inter',
            labelGap: 2,
            labelSize: 14,
            values: (_u, vals) => vals.map((value) => (Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1))),
          },
        ],
        series: [
          {},
          kind === 'breathing'
            ? { stroke: color, width: 2, fill: 'rgba(94, 234, 212, 0.12)' }
            : { stroke: color, width: 1.5 },
          { stroke: 'transparent', width: 0, points: { show: true, size: 6, fill: color, stroke: color } },
        ],
        hooks: {
          drawClear: [
            (u) => {
              if (kind === 'pressure') drawBands(u, lastStates);
              else drawZero(u);
            },
          ],
          draw: [
            (u) => {
              if (kind === 'breathing') drawTrace(u, token('--wave'), 2, 12);
              drawMarkers(u, markersRef.current);
            },
          ],
        },
      },
      [[], [], []],
      el,
    );
    plot.current = chart;

    const draw = () => {
      try {
        const now = Date.now();
        const span = windowRef.current * 1000;
        const from = now - span;
        const raw = getPoints().filter((point) => point.t >= from - 1000);
        const processed = processSeries(raw.map((point) => ({ t: point.t, pressureRaw: point.pressureRaw, state: point.state })));
        const xs: number[] = [];
        const ys: (number | null)[] = [];
        const peaks: (number | null)[] = [];
        lastStates = [];
        for (const sample of processed.samples) {
          if (sample.t < from) continue;
          xs.push(sample.t / 1000);
          const value = kind === 'breathing' ? sample.breathing : sample.pressureSmooth;
          ys.push(sample.gap || value == null ? null : value);
          peaks.push(sample.breathPoint === 'peak' && sample.breathing != null ? sample.breathing : null);
          lastStates.push(sample.state);
        }
        if (!xs.length) {
          xs.push(from / 1000, now / 1000);
          ys.push(null, null);
          peaks.push(null, null);
        }
        chart.setData([xs, ys, kind === 'breathing' ? peaks : xs.map(() => null)]);
        chart.setScale('x', { min: from / 1000, max: now / 1000 });
      } catch {
        // Keep the frame loop alive if one draw fails.
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const observer = new ResizeObserver(() => {
      chart.setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    const unsub = subscribePoints(() => undefined);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsub();
      chart.destroy();
      plot.current = null;
    };
  }, [kind]);

  return <div ref={host} className="h-full min-h-0 w-full" />;
}

function drawTrace(chart: uPlot, color: string, width: number, blur: number) {
  const xs = chart.data[0] as number[];
  const ys = chart.data[1] as (number | null)[];
  if (!xs?.length || chart.bbox?.left == null) return;
  const ctx = chart.ctx;
  const zero = chart.valToPos(0, 'y', true);
  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  const flush = () => {
    if (run.length > 1) runs.push(run);
    run = [];
  };
  for (let i = 0; i < xs.length; i++) {
    const y = ys[i];
    if (y == null) {
      flush();
      continue;
    }
    run.push({ x: chart.valToPos(xs[i], 'x', true), y: chart.valToPos(y, 'y', true) });
  }
  flush();
  if (!runs.length) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (Number.isFinite(zero)) {
    ctx.beginPath();
    for (const points of runs) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.lineTo(points[points.length - 1].x, zero);
      ctx.lineTo(points[0].x, zero);
      ctx.closePath();
    }
    ctx.fillStyle = 'rgba(94, 234, 212, 0.12)';
    ctx.fill();
  }
  ctx.beginPath();
  for (const points of runs) {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

function drawZero(chart: uPlot) {
  const min = chart.scales.y.min;
  const max = chart.scales.y.max;
  if (min == null || max == null || !Number.isFinite(min) || !Number.isFinite(max)) return;
  if (min > 0 || max < 0 || chart.bbox?.left == null) return;
  const y = chart.valToPos(0, 'y', true);
  if (!Number.isFinite(y)) return;
  const ctx = chart.ctx;
  ctx.save();
  ctx.strokeStyle = token('--border-strong');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chart.bbox.left, y);
  ctx.lineTo(chart.bbox.left + chart.bbox.width, y);
  ctx.stroke();
  ctx.restore();
}

function drawBands(chart: uPlot, states: DeviceState[]) {
  const data = chart.data[0] as number[];
  if (!data?.length || data.length !== states.length) return;
  const ctx = chart.ctx;
  const top = chart.valToPos(chart.scales.y.max ?? 0, 'y', true);
  const bottom = chart.valToPos(chart.scales.y.min ?? 0, 'y', true);
  let run = 0;
  for (let i = 1; i <= states.length; i++) {
    if (i === states.length || states[i] !== states[run]) {
      const color = bandColor(states[run]);
      if (color) {
        const x0 = chart.valToPos(data[run], 'x', true);
        const x1 = chart.valToPos(data[i - 1], 'x', true);
        ctx.fillStyle = color;
        ctx.fillRect(x0, top, Math.max(1, x1 - x0), bottom - top);
      }
      run = i;
    }
  }
}

function drawMarkers(chart: uPlot, markers: LiveMarker[]) {
  if (!markers.length) return;
  const ctx = chart.ctx;
  ctx.save();
  ctx.strokeStyle = token('--text-muted');
  ctx.fillStyle = token('--text-muted');
  ctx.font = '500 11px Inter';
  ctx.setLineDash([3, 3]);
  const min = chart.scales.x.min ?? 0;
  const max = chart.scales.x.max ?? 0;
  const yTop = chart.valToPos(chart.scales.y.max ?? 0, 'y', true);
  const yBottom = chart.valToPos(chart.scales.y.min ?? 0, 'y', true);
  for (const marker of markers) {
    const xVal = marker.t / 1000;
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
