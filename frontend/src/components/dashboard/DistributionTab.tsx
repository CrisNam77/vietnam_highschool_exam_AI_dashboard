'use client';

import { useState } from 'react';
import {
  combinationDistributions,
  COMBINATIONS,
  distributionStats,
  subjectDistributions,
  SUBJECTS,
  YEARS,
} from '@/data/dashboardMockData';
import type {
  DistributionKind,
  DistributionRecord,
  DistributionStats,
} from '@/types/dashboard';
import { DashboardShell } from './DashboardShell';
import { FilterBar } from './FilterBar';

const primaryColor = '#594DA3';
const compareColor = '#AD88F1';

function recordsFor(type: DistributionKind) {
  return type === 'subject' ? subjectDistributions : combinationDistributions;
}

function optionsFor(type: DistributionKind) {
  return type === 'subject'
    ? SUBJECTS.map(subject => ({ label: subject.name, value: subject.id }))
    : COMBINATIONS.map(combination => ({ label: combination.name, value: combination.id, description: combination.subjects }));
}

function findRecord(type: DistributionKind, year: number, key: string) {
  return recordsFor(type).find(record => record.year === year && record.key === key);
}

function findStats(type: DistributionKind, year: number, key: string) {
  return distributionStats.find(stat => stat.type === type && stat.year === year && stat.key === key);
}

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN');
}

function formatDelta(value: number, suffix = '') {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
}

function formatCountDelta(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatNumber(Math.abs(Math.round(value)))}`;
}

function DistributionHistogram({
  title,
  record,
  compareRecord,
}: {
  title: string;
  record: DistributionRecord;
  compareRecord?: DistributionRecord;
}) {
  const width = 760;
  const height = 320;
  const left = 52;
  const right = 18;
  const top = 22;
  const bottom = 44;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxCount = Math.max(
    ...record.bins.map(bin => bin.count),
    ...(compareRecord?.bins.map(bin => bin.count) ?? []),
    1,
  );
  const xFor = (index: number) => left + (index / record.bins.length) * chartWidth;
  const barWidth = Math.max(1, chartWidth / record.bins.length - 1);
  const yFor = (count: number) => top + chartHeight - (count / maxCount) * chartHeight;
  const tickStep = record.scoreMax === 10 ? 1 : 5;
  const ticks = Array.from({ length: record.scoreMax / tickStep + 1 }, (_, index) => index * tickStep);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#0F172A]">{title}</h3>
        <div className="flex gap-3 text-xs font-bold text-[#64748B]">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#594DA3]" />{record.year}</span>
          {compareRecord && <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#AD88F1]" />{compareRecord.year}</span>}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[22rem] w-full">
        {[0, 1, 2, 3].map(step => {
          const y = top + (step / 3) * chartHeight;
          return <line key={step} x1={left} x2={width - right} y1={y} y2={y} stroke="#E2E8F0" strokeWidth="1" />;
        })}
        {compareRecord?.bins.map((bin, index) => {
          const x = xFor(index);
          const barHeight = top + chartHeight - yFor(bin.count);
          return (
            <rect
              key={`compare-${bin.label}`}
              x={x + barWidth / 2}
              y={yFor(bin.count)}
              width={barWidth / 2}
              height={barHeight}
              rx="1.5"
              fill={compareColor}
              opacity={0.82}
            >
              <title>{`${compareRecord.year} · ${bin.label}: ${formatNumber(bin.count)} (${bin.percentage}%)`}</title>
            </rect>
          );
        })}
        {record.bins.map((bin, index) => {
          const x = xFor(index);
          const barHeight = top + chartHeight - yFor(bin.count);
          const sideBySide = Boolean(compareRecord);
          return (
            <rect
              key={bin.label}
              x={x}
              y={yFor(bin.count)}
              width={sideBySide ? barWidth / 2 : barWidth}
              height={barHeight}
              rx="1.5"
              fill={primaryColor}
              opacity={0.92}
            >
              <title>{`${record.year} · ${bin.label}: ${formatNumber(bin.count)} (${bin.percentage}%)`}</title>
            </rect>
          );
        })}
        {ticks.map(tick => {
          const x = left + (tick / record.scoreMax) * chartWidth;
          return (
            <g key={tick}>
              <line x1={x} x2={x} y1={top + chartHeight} y2={top + chartHeight + 5} stroke="#94A3B8" />
              <text x={x} y={height - 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748B">{tick}</text>
            </g>
          );
        })}
        <text x={left + chartWidth / 2} y={height - 2} textAnchor="middle" fontSize="12" fontWeight="700" fill="#64748B">Điểm</text>
        <text x="14" y={top + chartHeight / 2} textAnchor="middle" fontSize="12" fontWeight="700" fill="#64748B" transform={`rotate(-90 14 ${top + chartHeight / 2})`}>
          Số lượng thí sinh
        </text>
      </svg>
    </section>
  );
}

function StatsTable({ stats }: { stats: DistributionStats }) {
  const rows = stats.type === 'subject'
    ? [
        ['Số TS', formatNumber(stats.candidateCount)],
        ['ĐTB', stats.mean.toFixed(2)],
        ['Trung vị', stats.median.toFixed(2)],
        ['ĐLC', stats.std.toFixed(2)],
        ['MAD', stats.mad.toFixed(2)],
        ['<5', `${formatNumber(stats.underFiveCount ?? 0)} | ${stats.underFiveRate?.toFixed(2)}%`],
        ['>=8', `${formatNumber(stats.eightPlusCount ?? 0)} | ${stats.eightPlusRate?.toFixed(2)}%`],
        ['Mode', stats.mode.toFixed(1)],
        ['Điểm 10', formatNumber(stats.perfectCount ?? 0)],
        ['Điểm 0', formatNumber(stats.zeroCount ?? 0)],
        ['<=1', `${formatNumber(stats.belowOneCount ?? 0)} | ${stats.belowOneRate?.toFixed(2)}%`],
      ]
    : [
        ['Số TS đủ tổ hợp', formatNumber(stats.candidateCount)],
        ['ĐTB tổ hợp', stats.mean.toFixed(2)],
        ['Trung vị', stats.median.toFixed(2)],
        ['ĐLC', stats.std.toFixed(2)],
        ['MAD', stats.mad.toFixed(2)],
        ['<15', `${formatNumber(stats.underFifteenCount ?? 0)} | ${stats.underFifteenRate?.toFixed(2)}%`],
        ['>=24', `${formatNumber(stats.aboveTwentyFourCount ?? 0)} | ${stats.aboveTwentyFourRate?.toFixed(2)}%`],
        ['>=27', `${formatNumber(stats.aboveTwentySevenCount ?? 0)} | ${stats.aboveTwentySevenRate?.toFixed(2)}%`],
        ['Mode', stats.mode.toFixed(1)],
        ['Điểm tối đa', formatNumber(stats.maxScoreCount ?? 0)],
      ];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#F5F7FB] px-5 py-4">
        <h3 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#0F172A]">Bảng thống kê</h3>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value], index) => (
            <tr key={label} className={index > 0 ? 'border-t border-slate-100' : ''}>
              <th className="px-5 py-3 text-left font-bold text-[#64748B]">{label}</th>
              <td className="px-5 py-3 text-right font-extrabold text-[#31327E]">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CompareTable({ current, compare }: { current: DistributionStats; compare: DistributionStats }) {
  const rows = current.type === 'subject'
    ? [
        { label: 'Số TS', currentValue: current.candidateCount, compareValue: compare.candidateCount, kind: 'count' as const },
        { label: 'ĐTB', currentValue: current.mean, compareValue: compare.mean, kind: 'score' as const },
        { label: 'Trung vị', currentValue: current.median, compareValue: compare.median, kind: 'score' as const },
        { label: 'ĐLC', currentValue: current.std, compareValue: compare.std, kind: 'score' as const },
        { label: '<5', currentValue: current.underFiveRate ?? 0, compareValue: compare.underFiveRate ?? 0, kind: 'percent' as const },
        { label: '>=8', currentValue: current.eightPlusRate ?? 0, compareValue: compare.eightPlusRate ?? 0, kind: 'percent' as const },
        { label: 'Điểm 10', currentValue: current.perfectCount ?? 0, compareValue: compare.perfectCount ?? 0, kind: 'count' as const },
      ]
    : [
        { label: 'Số TS', currentValue: current.candidateCount, compareValue: compare.candidateCount, kind: 'count' as const },
        { label: 'ĐTB', currentValue: current.mean, compareValue: compare.mean, kind: 'score' as const },
        { label: 'Trung vị', currentValue: current.median, compareValue: compare.median, kind: 'score' as const },
        { label: 'ĐLC', currentValue: current.std, compareValue: compare.std, kind: 'score' as const },
        { label: '<15', currentValue: current.underFifteenRate ?? 0, compareValue: compare.underFifteenRate ?? 0, kind: 'percent' as const },
        { label: '>=24', currentValue: current.aboveTwentyFourRate ?? 0, compareValue: compare.aboveTwentyFourRate ?? 0, kind: 'percent' as const },
        { label: '>=27', currentValue: current.aboveTwentySevenRate ?? 0, compareValue: compare.aboveTwentySevenRate ?? 0, kind: 'percent' as const },
      ];

  const formatCell = (value: number, kind: 'count' | 'score' | 'percent') => {
    if (kind === 'count') return formatNumber(Math.round(value));
    if (kind === 'percent') return `${value.toFixed(2)}%`;
    return value.toFixed(2);
  };

  const formatCompareDelta = (value: number, kind: 'count' | 'score' | 'percent') => {
    if (kind === 'count') return formatCountDelta(value);
    if (kind === 'percent') return formatDelta(value, '%');
    return formatDelta(value);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#F5F7FB] px-5 py-4">
        <h3 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#0F172A]">So sánh chỉ số</h3>
      </div>
      <table className="w-full table-fixed text-[12px] sm:text-sm">
        <thead className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#64748B] sm:text-xs">
          <tr>
            <th className="w-[28%] px-3 py-3 text-left">Chỉ số</th>
            <th className="w-[22%] px-2 py-3 text-right">{current.year}</th>
            <th className="w-[22%] px-2 py-3 text-right">{compare.year}</th>
            <th className="w-[28%] px-3 py-3 text-right">Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const delta = row.currentValue - row.compareValue;
            const deltaClass = Math.abs(delta) < 0.005 ? 'text-[#64748B]' : delta > 0 ? 'text-[#059669]' : 'text-[#EF4444]';
            return (
              <tr key={row.label} className="border-t border-slate-100">
                <th className="px-3 py-3 text-left font-bold text-[#0F172A]">{row.label}</th>
                <td className="px-2 py-3 text-right font-semibold text-[#31327E]">{formatCell(row.currentValue, row.kind)}</td>
                <td className="px-2 py-3 text-right font-semibold text-[#64748B]">{formatCell(row.compareValue, row.kind)}</td>
                <td className={`px-3 py-3 text-right font-extrabold ${deltaClass}`}>{formatCompareDelta(delta, row.kind)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function combinationDescription(key: string) {
  return COMBINATIONS.find(combination => combination.id === key)?.subjects;
}

export function DistributionTab() {
  const [detailYear, setDetailYear] = useState(2026);
  const [detailType, setDetailType] = useState<DistributionKind>('subject');
  const [detailKey, setDetailKey] = useState('toan');
  const [compareType, setCompareType] = useState<DistributionKind>('subject');
  const [compareKey, setCompareKey] = useState('toan');
  const [primaryYear, setPrimaryYear] = useState(2026);
  const [secondaryYear, setSecondaryYear] = useState(2025);

  const detailRecord = findRecord(detailType, detailYear, detailKey);
  const detailStats = findStats(detailType, detailYear, detailKey);
  const primaryRecord = findRecord(compareType, primaryYear, compareKey);
  const secondaryRecord = findRecord(compareType, secondaryYear, compareKey);
  const primaryStats = findStats(compareType, primaryYear, compareKey);
  const secondaryStats = findStats(compareType, secondaryYear, compareKey);

  return (
    <DashboardShell title="Phổ điểm & Tổ hợp" question="Khám phá phân phối điểm theo môn, tổ hợp và so sánh giữa các năm.">
      <section className="space-y-5">
        <h3 className="text-lg font-extrabold text-[#00195A]">Phân phối chi tiết</h3>
        <FilterBar
          controls={[
            {
              label: 'Năm',
              value: String(detailYear),
              options: YEARS.map(year => ({ label: String(year), value: String(year) })),
              onChange: value => setDetailYear(Number(value)),
            },
            {
              label: 'Loại',
              value: detailType,
              options: [
                { label: 'Môn học', value: 'subject' },
                { label: 'Tổ hợp', value: 'combination' },
              ],
              onChange: value => {
                const nextType = value as DistributionKind;
                setDetailType(nextType);
                setDetailKey(nextType === 'subject' ? 'toan' : 'a00');
              },
            },
            {
              label: detailType === 'subject' ? 'Môn học' : 'Tổ hợp',
              value: detailKey,
              options: optionsFor(detailType),
              onChange: setDetailKey,
            },
          ]}
          onReset={() => {
            setDetailYear(2026);
            setDetailType('subject');
            setDetailKey('toan');
          }}
        />
        {detailType === 'combination' && detailKey && (
          <p className="text-xs font-bold text-[#64748B]">{detailKey.toUpperCase()} — {combinationDescription(detailKey)}</p>
        )}
        {detailRecord && detailStats && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <DistributionHistogram
              title={`${detailType === 'subject' ? 'Phổ điểm môn' : 'Phổ điểm tổ hợp'} ${detailRecord.name} năm ${detailYear}`}
              record={detailRecord}
            />
            <StatsTable stats={detailStats} />
          </div>
        )}
      </section>

      <section className="space-y-5 pt-2">
        <h3 className="text-lg font-extrabold text-[#00195A]">So sánh phân phối theo năm</h3>
        <FilterBar
          controls={[
            {
              label: 'Loại',
              value: compareType,
              options: [
                { label: 'Môn học', value: 'subject' },
                { label: 'Tổ hợp', value: 'combination' },
              ],
              onChange: value => {
                const nextType = value as DistributionKind;
                setCompareType(nextType);
                setCompareKey(nextType === 'subject' ? 'toan' : 'a00');
              },
            },
            {
              label: compareType === 'subject' ? 'Môn học' : 'Tổ hợp',
              value: compareKey,
              options: optionsFor(compareType),
              onChange: setCompareKey,
            },
            {
              label: 'Năm chính',
              value: String(primaryYear),
              options: YEARS.map(year => ({ label: String(year), value: String(year) })),
              onChange: value => {
                const nextYear = Number(value);
                setPrimaryYear(nextYear);
                if (nextYear === secondaryYear) setSecondaryYear(nextYear === 2026 ? 2025 : 2026);
              },
            },
            {
              label: 'So với năm',
              value: String(secondaryYear),
              options: YEARS.filter(year => year !== primaryYear).map(year => ({ label: String(year), value: String(year) })),
              onChange: value => setSecondaryYear(Number(value)),
            },
          ]}
          onReset={() => {
            setCompareType('subject');
            setCompareKey('toan');
            setPrimaryYear(2026);
            setSecondaryYear(2025);
          }}
        />
        {compareType === 'combination' && compareKey && (
          <p className="text-xs font-bold text-[#64748B]">{compareKey.toUpperCase()} — {combinationDescription(compareKey)}</p>
        )}
        {primaryRecord && secondaryRecord && primaryStats && secondaryStats && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_0.85fr]">
            <DistributionHistogram
              title={`${primaryRecord.name}: ${primaryYear} so với ${secondaryYear}`}
              record={primaryRecord}
              compareRecord={secondaryRecord}
            />
            <CompareTable current={primaryStats} compare={secondaryStats} />
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
