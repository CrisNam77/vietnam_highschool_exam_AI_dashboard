'use client';

import { useState } from 'react';
import { candidatesByYear, eightPlusRates, PROGRAMS, subjectYearMatrix, underFiveRates, YEARS } from '@/data/dashboardData';
import { subjectAppliesToYear, subjectsForProgram } from '@/data/dashboardSchema';
import type { MetricKey, Program, Subject } from '@/types/dashboard';
import { ChartCard, SimpleBarChart, SimpleLineChart } from './charts';
import { DashboardSelect } from './DashboardSelect';
import { DashboardShell } from './DashboardShell';
import { HeatmapTable } from './HeatmapTable';
import { YearRangeSlider } from './YearRangeSlider';

const metricLabels: Record<MetricKey, string> = {
  average: 'Điểm trung bình',
  underFive: 'Tỷ lệ dưới 5',
  eightPlus: 'Tỷ lệ từ 8 trở lên',
  perfect10: 'Số điểm 10',
};

const subjectPalette: Record<string, string> = {
  toan: '#00195A',
  ngu_van: '#31327E',
  tieng_anh: '#594DA3',
  vat_li: '#826ACA',
  hoa_hoc: '#AD88F1',
  sinh_hoc: '#7C3AED',
  lich_su: '#4F46E5',
  dia_li: '#2563EB',
  gdcd: '#0F766E',
  gd_ktpl: '#0E7490',
};

const metricValueMode: Record<MetricKey, 'score' | 'percent' | 'count'> = {
  average: 'score',
  underFive: 'percent',
  eightPlus: 'percent',
  perfect10: 'count',
};

function getYearsForProgram(program: Program): number[] {
  if (program === 'all') return [...YEARS];
  return candidatesByYear
    .filter(item => item.program === program)
    .map(item => item.year)
    .sort((a, b) => a - b);
}

function clampYearRange(years: number[], fromYear: number, toYear: number): [number, number] {
  const minYear = years[0] ?? YEARS[0];
  const maxYear = years[years.length - 1] ?? YEARS[YEARS.length - 1];
  const startYear = Math.min(fromYear, toYear);
  const endYear = Math.max(fromYear, toYear);

  if (endYear < minYear || startYear > maxYear) return [minYear, maxYear];

  return [
    Math.min(Math.max(startYear, minYear), maxYear),
    Math.min(Math.max(endYear, minYear), maxYear),
  ];
}

function findMetricRow(subject: Subject, year: number, program: Program) {
  if (program === 'all' && !subjectAppliesToYear(subject, year)) return undefined;
  return subjectYearMatrix.find(item => item.subjectId === subject.id && item.year === year && item.program === program);
}

export function SubjectTrendTab() {
  const [fromYear, setFromYear] = useState(2022);
  const [toYear, setToYear] = useState(2026);
  const [subjectId, setSubjectId] = useState('all');
  const [metric, setMetric] = useState<MetricKey>('average');
  const [program, setProgram] = useState<Program>('all');

  const availableYears = getYearsForProgram(program);

  const handleProgramChange = (nextProgram: string) => {
    const p = nextProgram as Program;
    const yearsForP = getYearsForProgram(p);
    const [nextFromYear, nextToYear] = clampYearRange(yearsForP, fromYear, toYear);
    setProgram(p);
    setFromYear(nextFromYear);
    setToYear(nextToYear);
    if (subjectId !== 'all' && !subjectsForProgram(p).some(subject => subject.id === subjectId)) setSubjectId('all');
  };

  const startYear = Math.min(fromYear, toYear);
  const endYear = Math.max(fromYear, toYear);
  const yearRange = availableYears.filter(year => year >= startYear && year <= endYear);
  const availableSubjects = subjectsForProgram(program);
  const availableSubjectIds = new Set(availableSubjects.map(subject => subject.id));
  const latestYear = Math.max(...YEARS);
  const latestApplicableSubjectIds = new Set(
    availableSubjects
      .filter(subject => program !== 'all' || subjectAppliesToYear(subject, latestYear))
      .map(subject => subject.id)
  );
  const lineSubjects = subjectId === 'all'
    ? availableSubjects
    : availableSubjects.filter(subject => subject.id === subjectId);

  const heatmapRows = availableSubjects.map(subject => ({
    label: subject.name,
    values: Object.fromEntries(
      yearRange.map(year => {
        const row = findMetricRow(subject, year, program);
        return [String(year), row?.[metric] ?? null];
      })
    ),
  }));

  const scopedUnderFive = underFiveRates.filter(item =>
    item.program === program
    && availableSubjectIds.has(item.subjectId)
    && latestApplicableSubjectIds.has(item.subjectId)
  );
  const scopedEightPlus = eightPlusRates.filter(item =>
    item.program === program
    && availableSubjectIds.has(item.subjectId)
    && latestApplicableSubjectIds.has(item.subjectId)
  );

  return (
    <DashboardShell
      title="Xu hướng & Môn học"
      question="Theo dõi biến động điểm thi theo năm và môn học."
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <YearRangeSlider
            years={availableYears}
            fromYear={fromYear}
            toYear={toYear}
            onFromChange={setFromYear}
            onToChange={setToYear}
          />
          <DashboardSelect
            label="Chương trình"
            value={program}
            options={[{ label: 'Tất cả', value: 'all' }, ...PROGRAMS.map(p => ({ label: p, value: p }))]}
            onChange={handleProgramChange}
          />
          <DashboardSelect
            label="Môn học"
            value={subjectId}
            options={[{ label: 'Tất cả môn', value: 'all' }, ...availableSubjects.map(s => ({ label: s.name, value: s.id }))]}
            onChange={setSubjectId}
          />
          <DashboardSelect
            label="Chỉ số"
            value={metric}
            options={Object.entries(metricLabels).map(([value, label]) => ({ label, value }))}
            onChange={value => setMetric(value as MetricKey)}
          />
          <div className="flex flex-col">
            <span className="invisible text-xs font-bold uppercase tracking-[0.12em]">x</span>
            <button
              type="button"
              onClick={() => {
                setFromYear(YEARS[0] ?? 2022);
                setToYear(YEARS[YEARS.length - 1] ?? 2026);
                setSubjectId('all');
                setMetric('average');
                setProgram('all');
              }}
              className="mt-1 rounded-2xl border border-[#AD88F1]/60 bg-white px-4 py-2.5 text-sm font-bold text-[#594DA3] transition hover:bg-[#AD88F1]/10"
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      <ChartCard title={`Xu hướng ${metricLabels[metric].toLowerCase()} theo môn`}>
        <SimpleLineChart
          valueMode={metricValueMode[metric]}
          series={lineSubjects.map(subject => ({
            name: subject.name,
            color: subjectPalette[subject.id] ?? '#594DA3',
            points: yearRange.map(year => {
              const row = findMetricRow(subject, year, program);
              return { label: String(year), value: row?.[metric] ?? null };
            }),
          }))}
        />
      </ChartCard>

      <HeatmapTable columns={yearRange.map(String)} rows={heatmapRows} danger={metric === 'underFive'} />

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Tỷ lệ dưới 5 theo môn">
          <SimpleBarChart points={scopedUnderFive.map(item => ({ label: item.subjectName, value: item.value }))} danger />
        </ChartCard>
        <ChartCard title="Tỷ lệ từ 8 trở lên theo môn">
          <SimpleBarChart points={scopedEightPlus.map(item => ({ label: item.subjectName, value: item.value }))} color="#594DA3" />
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
