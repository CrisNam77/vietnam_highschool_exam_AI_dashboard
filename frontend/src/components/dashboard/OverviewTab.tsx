'use client';

import { useState } from 'react';
import { candidatesByYear, nationalAverageByYear, overviewKpis, PROGRAMS, subjectAverages, subjectYearMatrix } from '@/data/dashboardData';
import { subjectsForProgram } from '@/data/dashboardSchema';
import type { Program, YearOption } from '@/types/dashboard';
import { ChartCard, SimpleBarChart, SimpleLineChart } from './charts';
import { DashboardShell } from './DashboardShell';
import { FilterBar } from './FilterBar';
import { KpiCard } from './KpiCard';

const COLORS = ['#00195A', '#594DA3', '#826ACA', '#AD88F1'];

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasFiniteValue<T extends { value: number | null }>(item: T): item is T & { value: number } {
  return isFiniteNumber(item.value);
}

interface OverviewTabProps {
  initialYear?: YearOption;
  initialProgram?: Program;
}

export function OverviewTab({ initialYear = 'all', initialProgram = 'all' }: OverviewTabProps) {
  const [year, setYear] = useState<YearOption>(initialYear);
  const [program, setProgram] = useState<Program>(initialProgram);

  // Derive which years actually have data for the selected program
  const availableYears = candidatesByYear
    .filter(item => item.program === program)
    .map(item => item.year)
    .sort((a, b) => a - b);

  // When program changes: keep year if still valid, else reset to 'all'
  const handleProgramChange = (nextProgram: string) => {
    const p = nextProgram as Program;
    setProgram(p);
    if (year !== 'all') {
      const yearsForP = candidatesByYear
        .filter(item => item.program === p)
        .map(item => item.year);
      if (!yearsForP.includes(year as number)) setYear('all');
    }
  };

  const availableSubjectIds = new Set(subjectsForProgram(program).map(subject => subject.id));

  const scopedSubjectAverages = (year === 'all'
    ? subjectAverages.filter(item => item.program === program)
    : subjectYearMatrix
        .filter(item => item.year === year && item.program === program)
        .map(item => ({ subjectId: item.subjectId, subjectName: item.subjectName, value: item.average })))
    .filter((item): item is typeof item & { value: number } => availableSubjectIds.has(item.subjectId) && hasFiniteValue(item));

  const scopedCandidates = candidatesByYear
    .filter(item => (year === 'all' || item.year === year) && item.program === program)
    .map(item => ({ label: String(item.year), value: item.value }));

  const average = scopedSubjectAverages.length > 0
    ? scopedSubjectAverages.reduce((sum, item) => sum + item.value, 0) / scopedSubjectAverages.length
    : null;
  const totalCandidates = scopedCandidates.reduce((sum, item) => sum + item.value, 0);

  const kpis = overviewKpis.map(item => {
    if (item.label === 'Điểm TB toàn quốc') {
      return { ...item, value: average === null ? '—' : average.toFixed(2) };
    }
    if (item.label === 'Tổng số thí sinh') {
      const valStr = totalCandidates >= 1000000 
        ? `${(totalCandidates / 1000000).toFixed(2)} triệu` 
        : totalCandidates.toLocaleString('vi-VN');
      return { ...item, value: valStr };
    }
    if (item.label === 'Giai đoạn') {
      return { ...item, value: year === 'all' ? '2022-2026' : String(year) };
    }
    return item;
  });

  return (
    <DashboardShell title="Tổng quan" question="Tóm tắt nhanh quy mô dữ liệu, điểm trung bình và xu hướng chung toàn quốc.">
      <FilterBar
        controls={[
          {
            label: 'Năm',
            value: String(year),
            options: [
              { label: 'Tất cả', value: 'all' },
              ...availableYears.map(y => ({ label: String(y), value: String(y) })),
            ],
            onChange: value => setYear(value === 'all' ? 'all' : Number(value) as YearOption),
          },
          {
            label: 'Chương trình',
            value: program,
            options: [{ label: 'Tất cả', value: 'all' }, ...PROGRAMS.map(item => ({ label: item, value: item }))],
            onChange: handleProgramChange,
          },
        ]}
        onReset={() => {
          setYear('all');
          setProgram('all');
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(item => <KpiCard key={item.label} item={item} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <ChartCard title="Điểm trung bình toàn quốc theo năm">
          <SimpleLineChart
            valueMode="score"
            series={[
              {
                name: 'Điểm TB',
                color: COLORS[1],
                points: nationalAverageByYear
                  .filter(item => (year === 'all' || item.year === year) && item.program === program)
                  .map(item => ({ label: String(item.year), value: item.value })),
              },
            ]}
          />
        </ChartCard>
        <ChartCard title="Số thí sinh theo năm">
          <SimpleBarChart points={scopedCandidates} color="#00195A" />
        </ChartCard>
      </div>

      <ChartCard title="Điểm trung bình theo môn">
        <SimpleBarChart points={scopedSubjectAverages.map(item => ({ label: item.subjectName, value: item.value }))} color="#826ACA" />
      </ChartCard>
    </DashboardShell>
  );
}
