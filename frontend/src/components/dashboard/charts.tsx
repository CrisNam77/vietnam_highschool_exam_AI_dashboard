import type { ReactNode } from 'react';
import type { ChartPoint, LineSeries } from '@/types/dashboard';

const gridColor = '#E2E8F0';

function formatValue(value: number) {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : value.toFixed(value < 10 ? 2 : 1);
}

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0F172A]">{title}</h3>
      {children}
    </section>
  );
}

export function SimpleLineChart({ series }: { series: LineSeries[] }) {
  const allValues = series.flatMap(item => item.points.map(point => point.value));
  const min = Math.min(...allValues) - 0.15;
  const max = Math.max(...allValues) + 0.15;
  const width = 640;
  const height = 260;
  const left = 44;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const labels = series[0]?.points.map(point => point.label) ?? [];
  const xFor = (index: number, total: number) => left + (total <= 1 ? 0 : (index / (total - 1)) * chartWidth);
  const yFor = (value: number) => top + ((max - value) / (max - min || 1)) * chartHeight;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        {[0, 1, 2, 3].map(step => {
          const y = top + (step / 3) * chartHeight;
          return <line key={step} x1={left} x2={width - right} y1={y} y2={y} stroke={gridColor} strokeWidth="1" />;
        })}
        {labels.map((label, index) => (
          <text key={label} x={xFor(index, labels.length)} y={height - 14} textAnchor="middle" fontSize="12" fill="#64748B">
            {label}
          </text>
        ))}
        {series.map(item => {
          const path = item.points
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index, item.points.length)} ${yFor(point.value)}`)
            .join(' ');
          return (
            <g key={item.name}>
              <path d={path} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {item.points.map((point, index) => (
                <circle key={`${item.name}-${point.label}`} cx={xFor(index, item.points.length)} cy={yFor(point.value)} r="4" fill="white" stroke={item.color} strokeWidth="2" />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3">
        {series.map(item => (
          <span key={item.name} className="inline-flex items-center gap-2 text-xs font-bold text-[#64748B]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SimpleBarChart({ points, color = '#594DA3', danger = false }: { points: ChartPoint[]; color?: string; danger?: boolean }) {
  const max = Math.max(...points.map(point => point.value), 1);
  return (
    <div className="space-y-3">
      {points.map(point => (
        <div key={point.label} className="grid grid-cols-[112px_minmax(0,1fr)_56px] items-center gap-3 text-sm">
          <span className="truncate font-semibold text-[#0F172A]">{point.label}</span>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(4, (point.value / max) * 100)}%`, background: danger ? '#F87171' : color }}
            />
          </div>
          <span className="text-right text-xs font-bold text-[#64748B]">{formatValue(point.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function SimpleHorizontalBarChart({ points, direction }: { points: ChartPoint[]; direction: 'highest' | 'lowest' }) {
  const max = Math.max(...points.map(point => point.value), 1);
  const palette = direction === 'lowest' ? '#F87171' : '#826ACA';
  return (
    <div className="space-y-3">
      {points.map((point, index) => (
        <div key={point.label} className="grid grid-cols-[32px_132px_minmax(0,1fr)_52px] items-center gap-3 text-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F7FB] text-xs font-extrabold text-[#31327E]">{index + 1}</span>
          <span className="truncate font-semibold text-[#0F172A]">{point.label}</span>
          <div className="h-4 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${Math.max(6, (point.value / max) * 100)}%`, background: palette }} />
          </div>
          <span className="text-right text-xs font-bold text-[#64748B]">{point.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
