import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import type { Marker } from '@/data/types';
import type { ProcessedSample } from '@/processing/breathing';

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function ReviewDetail({
  samples,
  markers,
  start,
  windowS,
}: {
  samples: ProcessedSample[];
  markers: Marker[];
  start: number;
  windowS: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const chart = new uPlot(options(el, 'Breathing (rel.)', true), [[], [], []], el);
    plot.current = chart;
    const observer = new ResizeObserver(() => chart.setSize({ width: el.clientWidth, height: el.clientHeight }));
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.destroy();
    };
  }, []);

  useEffect(() => {
    const chart = plot.current;
    if (!chart) return;
    const end = start + windowS;
    const view = samples.filter((sample) => sample.t / 1000 >= start && sample.t / 1000 <= end);
    const xs = view.map((sample) => sample.t / 1000);
    const breath = view.map((sample) => (sample.gap || sample.breathing == null ? null : sample.breathing));
    const pressure = view.map((sample) => (sample.gap ? null : sample.pressureSmooth));
    if (!xs.length) {
      chart.setData([[start, end], [null, null], [null, null]]);
      return;
    }
    chart.setData([xs, breath, pressure]);
    drawMarkerHook.current = markers;
    chart.redraw();
  }, [samples, markers, start, windowS]);

  return <div ref={host} className="h-full min-h-[280px] w-full" />;
}

const drawMarkerHook = { current: [] as Marker[] };

function options(el: HTMLDivElement, label: string, _dual: boolean): uPlot.Options {
  return {
    width: el.clientWidth || 640,
    height: el.clientHeight || 280,
    pxAlign: false,
    cursor: { show: false },
    legend: { show: false },
    padding: [16, 8, 0, 0],
    scales: { x: { time: false } },
    axes: [
      {
        stroke: token('--text-muted'),
        grid: { stroke: token('--border'), width: 1 },
        ticks: { stroke: token('--border'), size: 4 },
        font: '500 11px Inter',
        size: 26,
      },
      {
        stroke: token('--text-muted'),
        grid: { stroke: token('--border'), width: 1 },
        ticks: { stroke: token('--border'), size: 4 },
        font: '500 11px Inter',
        size: 48,
        label,
        labelFont: '500 11px Inter',
        labelSize: 16,
        values: (_u, vals) => vals.map((value) => value.toFixed(1)),
      },
    ],
    series: [
      {},
      { stroke: token('--wave'), width: 2, fill: token('--wave-fill'), scale: 'y' },
      { stroke: token('--pressure'), width: 1.5, scale: 'y' },
    ],
    hooks: {
      draw: [
        (chart) => {
          const ctx = chart.ctx;
          ctx.save();
          ctx.strokeStyle = token('--text-muted');
          ctx.setLineDash([3, 3]);
          ctx.font = '500 11px Inter';
          ctx.fillStyle = token('--text-muted');
          const yTop = chart.valToPos(chart.scales.y.max ?? 0, 'y', true);
          const yBottom = chart.valToPos(chart.scales.y.min ?? 0, 'y', true);
          for (const marker of drawMarkerHook.current) {
            const xVal = marker.t / 1000;
            const min = chart.scales.x.min ?? 0;
            const max = chart.scales.x.max ?? 0;
            if (xVal < min || xVal > max) continue;
            const x = chart.valToPos(xVal, 'x', true);
            ctx.beginPath();
            ctx.moveTo(x, yTop);
            ctx.lineTo(x, yBottom);
            ctx.stroke();
            ctx.fillText(marker.text, x + 4, yTop + 12);
          }
          ctx.restore();
        },
      ],
    },
  };
}

export function ReviewOverview({
  samples,
  start,
  windowS,
  onStart,
}: {
  samples: ProcessedSample[];
  start: number;
  windowS: number;
  onStart: (start: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const duration = samples.length ? (samples[samples.length - 1].t - samples[0].t) / 1000 : 0;
  const origin = samples[0] ? samples[0].t / 1000 : 0;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const xs = samples.map((sample) => sample.t / 1000);
    const ys = samples.map((sample) => (sample.breathing == null ? null : sample.breathing));
    const chart = new uPlot(
      {
        width: el.clientWidth || 640,
        height: 64,
        pxAlign: false,
        cursor: { show: false },
        legend: { show: false },
        padding: [4, 0, 0, 0],
        scales: { x: { time: false } },
        axes: [{ show: false }, { show: false }],
        series: [{}, { stroke: token('--wave'), width: 1 }],
      },
      xs.length ? [xs, ys] : [[0, 1], [null, null]],
      el,
    );
    const observer = new ResizeObserver(() => chart.setSize({ width: el.clientWidth, height: 64 }));
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.destroy();
    };
  }, [samples]);

  const left = duration ? ((start - origin) / duration) * 100 : 0;
  const width = duration ? (Math.min(windowS, duration) / duration) * 100 : 100;

  return (
    <div
      className="relative h-16 cursor-ew-resize"
      onPointerDown={(event) => move(event, origin, duration, windowS, onStart)}
    >
      <div ref={host} className="h-16 w-full" />
      <div className="pointer-events-none absolute top-0 bottom-0 border border-primary bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]" style={{ left: `${left}%`, width: `${width}%` }} />
    </div>
  );
}

function move(event: React.PointerEvent, origin: number, duration: number, windowS: number, onStart: (start: number) => void) {
  const target = event.currentTarget;
  const place = (clientX: number) => {
    const rect = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const center = origin + ratio * duration;
    const next = Math.min(Math.max(origin, center - windowS / 2), origin + Math.max(0, duration - windowS));
    onStart(next);
  };
  place(event.clientX);
  const drag = (next: PointerEvent) => place(next.clientX);
  const up = () => {
    window.removeEventListener('pointermove', drag);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', drag);
  window.addEventListener('pointerup', up);
}
