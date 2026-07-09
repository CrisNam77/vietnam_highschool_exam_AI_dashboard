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
import type { DistributionBin, DistributionKind, DistributionRecord, DistributionStats } from '@/types/dashboard';
import { ChartCard, SimpleBarChart } from './charts';
import { DashboardShell } from './DashboardShell';
import { FilterBar } from './FilterBar';
import { InsightChip } from './InsightChip';

type CompareMode = 'off' | 'on';

const primaryColor = '#594DA3';
const compareColor = '#CBD5E1';

function getRecords(type: DistributionKind) {
  return type === 'subject' ? subjectDistributions : combinationDistributions;
}

function getOptions(type: DistributionKind) {
  return type === 'subject'
    ? [{ label: 'Tất cả môn', value: 'all' }, ...SUBJECTS.map(subject => ({ label: subject.name, value: subject.id }))]
    : [{ label: 'Tất cả tổ hợp', value: 'all' }, ...COMBINATIONS.map(combination => ({ label: combination.name, value: combination.id }))];
}

function findRecord(type: DistributionKind, year: number, key: string) {
  return getRecords(type).find(item => item.year === year && item.key === key);
}

function findStats(type: DistributionKind, year: number, key: string) {
  return distributionStats.find(item => item.type === type && item.year === year && item.key === key);
}

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN');
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">{label}</p>
      <p className="mt-2 text-xl font-extrabold text-[#00195A]">{value}</p>
    </div>
  );
}

function Histogram({
  title,
  bins,
  compareBins,
}: {
  title: string;
  bins: DistributionBin[];
  compareBins?: DistributionBin[];
}) {
  const max = Math.max(...bins.map(bin => bin.percentage), ...(compareBins?.map(bin => bin.percentage) ?? []), 1);

  return (
    <ChartCard title={title}>
      <div className="flex h-72 items-end gap-2 border-b border-slate-200 px-1 pb-2">
        {bins.map((bin, index) => {
          const compare = compareBins?.[index];
          return (
            <div key={bin.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-56 w-full items-end justify-center gap-1 rounded-xl bg-[#F5F7FB] px-1 pb-1">
                {compare && (
                  <div
                    title={`${bin.label}: ${compare.percentage}%`}
                    className="w-3 rounded-t-md"
                    style={{ height: `${Math.max(4, (compare.percentage / max) * 100)}%`, background: compareColor }}
                  />
                )}
                <div
                  title={`${bin.label}: ${bin.percentage}%`}
                  className="w-4 rounded-t-md"
                  style={{ height: `${Math.max(4, (bin.percentage / max) * 100)}%`, background: primaryColor }}
                />
              </div>
              <span className="text-[10px] font-bold text-[#64748B]">{bin.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[#64748B]">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#594DA3]" />Năm chính</span>
        {compareBins && <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />Năm so sánh</span>}
      </div>
    </ChartCard>
  );
}

function StatsPanel({ stats }: { stats: DistributionStats }) {
  const common = [
    { label: stats.type === 'subject' ? 'Số thí sinh' : 'Đủ điểm tổ hợp', value: formatNumber(stats.candidateCount) },
    { label: stats.type === 'subject' ? 'Điểm TB' : 'Điểm TB tổ hợp', value: stats.mean.toFixed(2) },
    { label: 'Trung vị', value: stats.median.toFixed(2) },
    { label: 'Độ lệch chuẩn', value: stats.std.toFixed(2) },
    { label: 'Mode', value: stats.mode.toFixed(1) },
  ];
  const specific = stats.type === 'subject'
    ? [
        { label: 'Tỷ lệ <5', value: `${stats.underFiveRate?.toFixed(1)}%` },
        { label: 'Tỷ lệ >=8', value: `${stats.eightPlusRate?.toFixed(1)}%` },
        { label: 'Số điểm 10', value: formatNumber(stats.perfectCount ?? 0) },
      ]
    : [
        { label: 'Tỷ lệ <15', value: `${stats.under15Rate?.toFixed(1)}%` },
        { label: 'Tỷ lệ >=24', value: `${stats.above24Rate?.toFixed(1)}%` },
        { label: 'Từ 27 trở lên', value: formatNumber(stats.highScoreCount ?? 0) },
      ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      {[...common, ...specific].map(item => <StatTile key={item.label} label={item.label} value={item.value} />)}
    </section>
  );
}

function MiniDistributionCard({ record, stats }: { record: DistributionRecord; stats?: DistributionStats }) {
  const max = Math.max(...record.bins.map(bin => bin.percentage), 1);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-extrabold text-[#0F172A]">{record.name}</h3>
        {stats && <span className="rounded-full bg-[#F5F7FB] px-2 py-1 text-xs font-bold text-[#594DA3]">{stats.mean.toFixed(2)}</span>}
      </div>
      <div className="flex h-20 items-end gap-1">
        {record.bins.map(bin => (
          <div key={bin.label} className="min-w-0 flex-1 rounded-t-md bg-[#826ACA]" style={{ height: `${Math.max(8, (bin.percentage / max) * 100)}%` }} />
        ))}
      </div>
      {stats && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#64748B]">
          <span>{stats.type === 'subject' ? '<5' : '<15'}: {(stats.underFiveRate ?? stats.under15Rate ?? 0).toFixed(1)}%</span>
          <span>{stats.type === 'subject' ? '>=8' : '>=24'}: {(stats.eightPlusRate ?? stats.above24Rate ?? 0).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

function ComparisonPanel({ current, compare }: { current: DistributionStats; compare?: DistributionStats }) {
  if (!compare) return null;
  const meanDiff = current.mean - compare.mean;
  const lowDiff = (current.underFiveRate ?? current.under15Rate ?? 0) - (compare.underFiveRate ?? compare.under15Rate ?? 0);
  const highDiff = (current.eightPlusRate ?? current.above24Rate ?? 0) - (compare.eightPlusRate ?? compare.above24Rate ?? 0);
  return (
    <div className="flex flex-wrap gap-2">
      <InsightChip label="TB" value={`${meanDiff >= 0 ? '+' : ''}${meanDiff.toFixed(2)}`} />
      <InsightChip label={current.type === 'subject' ? '<5' : '<15'} value={`${lowDiff >= 0 ? '+' : ''}${lowDiff.toFixed(1)}đ%`} />
      <InsightChip label={current.type === 'subject' ? '>=8' : '>=24'} value={`${highDiff >= 0 ? '+' : ''}${highDiff.toFixed(1)}đ%`} />
    </div>
  );
}

export function DistributionTab() {
  const [year, setYear] = useState(2026);
  const [type, setType] = useState<DistributionKind>('subject');
  const [selectedKey, setSelectedKey] = useState('all');
  const [compareMode, setCompareMode] = useState<CompareMode>('off');
  const [compareYear, setCompareYear] = useState(2025);

  const options = getOptions(type);
  const concreteKeys = options.filter(option => option.value !== 'all');
  const activeKey = selectedKey === 'all' ? concreteKeys[0]?.value ?? '' : selectedKey;
  const currentRecord = findRecord(type, year, activeKey);
  const compareRecord = compareMode === 'on' ? findRecord(type, compareYear, activeKey) : undefined;
  const currentStats = findStats(type, year, activeKey);
  const compareStats = compareMode === 'on' ? findStats(type, compareYear, activeKey) : undefined;

  const summaryRecords = getRecords(type).filter(record => record.year === year && (selectedKey === 'all' || record.key === selectedKey));
  const summaryStats = distributionStats.filter(stat => stat.type === type && stat.year === year && (selectedKey === 'all' || stat.key === selectedKey));
  const highestLow = [...summaryStats].sort((a, b) => (b.underFiveRate ?? b.under15Rate ?? 0) - (a.underFiveRate ?? a.under15Rate ?? 0))[0];
  const highestHigh = [...summaryStats].sort((a, b) => (b.eightPlusRate ?? b.above24Rate ?? 0) - (a.eightPlusRate ?? a.above24Rate ?? 0))[0];

  return (
    <DashboardShell
      title="Phổ điểm & Tổ hợp"
      question="Phổ điểm các môn và các tổ hợp xét tuyển thay đổi như thế nào giữa các năm?"
    >
      <FilterBar
        controls={[
          {
            label: 'Năm',
            value: String(year),
            options: YEARS.map(item => ({ label: String(item), value: String(item) })),
            onChange: value => {
              const nextYear = Number(value);
              setYear(nextYear);
              if (nextYear === compareYear) setCompareYear(nextYear === 2026 ? 2025 : 2026);
            },
          },
          {
            label: 'Loại phân phối',
            value: type,
            options: [
              { label: 'Môn học', value: 'subject' },
              { label: 'Tổ hợp', value: 'combination' },
            ],
            onChange: value => {
              setType(value as DistributionKind);
              setSelectedKey('all');
            },
          },
          {
            label: type === 'subject' ? 'Môn học' : 'Tổ hợp',
            value: selectedKey,
            options,
            onChange: setSelectedKey,
          },
          {
            label: 'So sánh năm',
            value: compareMode,
            options: [
              { label: 'Tắt', value: 'off' },
              { label: 'Bật', value: 'on' },
            ],
            onChange: value => setCompareMode(value as CompareMode),
          },
          ...(compareMode === 'on' ? [{
            label: 'So với năm',
            value: String(compareYear),
            options: YEARS.filter(item => item !== year).map(item => ({ label: String(item), value: String(item) })),
            onChange: (value: string) => setCompareYear(Number(value)),
          }] : []),
        ]}
        onReset={() => {
          setYear(2026);
          setType('subject');
          setSelectedKey('all');
          setCompareMode('off');
          setCompareYear(2025);
        }}
      />

      <div className="flex flex-wrap gap-2">
        {highestLow && <InsightChip label={type === 'subject' ? '<5 cao nhất' : '<15 cao nhất'} value={highestLow.name} />}
        {highestHigh && <InsightChip label={type === 'subject' ? '>=8 cao nhất' : '>=24 cao nhất'} value={highestHigh.name} />}
        <InsightChip label="Chế độ" value={compareMode === 'on' ? `${year} vs ${compareYear}` : String(year)} />
      </div>

      {selectedKey === 'all' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaryRecords.map(record => (
              <MiniDistributionCard
                key={record.key}
                record={record}
                stats={summaryStats.find(stat => stat.key === record.key)}
              />
            ))}
          </div>
          {type === 'combination' && (
            <div className="grid gap-5 xl:grid-cols-2">
              <ChartCard title="Điểm TB tổ hợp">
                <SimpleBarChart points={summaryStats.map(stat => ({ label: stat.name, value: stat.mean }))} color="#594DA3" />
              </ChartCard>
              <ChartCard title="Tỷ lệ từ 24 điểm trở lên">
                <SimpleBarChart points={summaryStats.map(stat => ({ label: stat.name, value: stat.above24Rate ?? 0 }))} color="#826ACA" />
              </ChartCard>
            </div>
          )}
        </>
      ) : (
        currentRecord && currentStats && (
          <>
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <Histogram
                title={`${currentRecord.name} · ${year}${compareRecord ? ` so với ${compareYear}` : ''}`}
                bins={currentRecord.bins}
                compareBins={compareRecord?.bins}
              />
              <StatsPanel stats={currentStats} />
            </div>
            <ComparisonPanel current={currentStats} compare={compareStats} />
          </>
        )
      )}
    </DashboardShell>
  );
}
