import type { ReactNode } from 'react';
import type { ChartPoint, LineSeries } from '@/types/dashboard';

const gridColor = '#E2E8F0';

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatValue(value: number | null) {
  if (!isFiniteNumber(value)) return '—';
  return value >= 1000 ? `${Math.round(value / 1000)}k` : value.toFixed(value < 10 ? 2 : 1);
}

function formatAxisValue(value: number, mode: 'score' | 'percent' | 'count' = 'score') {
  if (mode === 'percent') return `${Math.round(value)}%`;
  if (mode === 'count') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1000) return `${Math.round(value / 1000)}k`;
    return String(Math.round(value));
  }
  return value.toFixed(1);
}

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0F172A]">{title}</h3>
      {children}
    </section>
  );
}

export function SimpleLineChart({ series, valueMode = 'score' }: { series: LineSeries[]; valueMode?: 'score' | 'percent' | 'count' }) {
  const allValues = series.flatMap(item => item.points.map(point => point.value)).filter(isFiniteNumber);
  const min = allValues.length > 0 ? Math.min(...allValues) - 0.15 : 0;
  const max = allValues.length > 0 ? Math.max(...allValues) + 0.15 : 1;
  const width = 640;
  const height = 260;
  const left = 56;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const labels = series[0]?.points.map(point => point.label) ?? [];
  const xFor = (index: number, total: number) => left + (total <= 1 ? 0 : (index / (total - 1)) * chartWidth);
  const yFor = (value: number) => top + ((max - value) / (max - min || 1)) * chartHeight;
  const yTicks = [0, 1, 2, 3, 4].map(step => {
    const ratio = step / 4;
    return {
      y: top + ratio * chartHeight,
      value: max - ratio * (max - min),
    };
  });

  return (
    <div>
      {allValues.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-xl bg-[#F8FAFC] text-sm font-bold text-[#64748B]">
          Không có dữ liệu phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        {yTicks.map(tick => (
          <g key={tick.y}>
            <line x1={left} x2={width - right} y1={tick.y} y2={tick.y} stroke={gridColor} strokeWidth="1" />
            <text x={left - 8} y={tick.y + 4} textAnchor="end" fontSize="11" fontWeight="700" fill="#64748B">
              {formatAxisValue(tick.value, valueMode)}
            </text>
          </g>
        ))}
        {min < 0 && max > 0 && (
          <line x1={left} x2={width - right} y1={yFor(0)} y2={yFor(0)} stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 4" />
        )}
        {labels.map((label, index) => (
          <text key={label} x={xFor(index, labels.length)} y={height - 14} textAnchor="middle" fontSize="12" fill="#64748B">
            {label}
          </text>
        ))}
        {series.map(item => {
          const validPoints = item.points
            .map((p, i) => ({ ...p, originalIndex: i }))
            .filter((p): p is ChartPoint & { originalIndex: number; value: number } => isFiniteNumber(p.value));
          const path = validPoints
            .map((point, i) => `${i === 0 ? 'M' : 'L'} ${xFor(point.originalIndex, item.points.length)} ${yFor(point.value)}`)
            .join(' ');
          return (
            <g key={item.name}>
              <path d={path} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {validPoints.map((point) => (
                <circle key={`${item.name}-${point.label}`} cx={xFor(point.originalIndex, item.points.length)} cy={yFor(point.value)} r="4" fill="white" stroke={item.color} strokeWidth="2" />
              ))}
            </g>
          );
        })}
      </svg>
      )}
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
  const validValues = points.map(point => point.value).filter(isFiniteNumber);
  const max = Math.max(...validValues, 1);
  if (validValues.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-[#F8FAFC] text-sm font-bold text-[#64748B]">
        Không có dữ liệu phù hợp với bộ lọc hiện tại.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {points.map(point => {
        const hasValue = isFiniteNumber(point.value);
        const numericValue: number = hasValue ? Number(point.value) : 0;
        return (
          <div key={point.label} className="grid grid-cols-[112px_minmax(0,1fr)_56px] items-center gap-3 text-sm">
            <span className="truncate font-semibold text-[#0F172A]">{point.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{ width: hasValue ? `${Math.max(4, (numericValue / max) * 100)}%` : '0%', background: danger ? '#F87171' : color }}
              />
            </div>
            <span className="text-right text-xs font-bold text-[#64748B]">{formatValue(point.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SimpleHorizontalBarChart({ points, direction }: { points: ChartPoint[]; direction: 'highest' | 'lowest' }) {
  const validValues = points.map(point => point.value).filter(isFiniteNumber);
  const max = Math.max(...validValues, 1);
  const palette = direction === 'lowest' ? '#F87171' : '#826ACA';
  if (validValues.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-[#F8FAFC] text-sm font-bold text-[#64748B]">
        Không có dữ liệu phù hợp với bộ lọc hiện tại.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {points.map((point, index) => {
        const hasValue = isFiniteNumber(point.value);
        const numericValue: number = hasValue ? Number(point.value) : 0;
        return (
          <div key={point.label} className="grid grid-cols-[32px_132px_minmax(0,1fr)_52px] items-center gap-3 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F7FB] text-xs font-extrabold text-[#31327E]">{index + 1}</span>
            <span className="truncate font-semibold text-[#0F172A]">{point.label}</span>
            <div className="h-4 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: hasValue ? `${Math.max(6, (numericValue / max) * 100)}%` : '0%', background: palette }} />
            </div>
            <span className="text-right text-xs font-bold text-[#64748B]">{formatValue(point.value)}</span>
          </div>
        );
      })}
    </div>
  );
}
