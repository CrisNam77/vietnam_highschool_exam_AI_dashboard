'use client';

import { useState } from 'react';
import { candidatesByYear, nationalAverageByYear, overviewKpis, PROGRAMS, subjectAverages, YEARS } from '@/data/dashboardMockData';
import type { Program, YearOption } from '@/types/dashboard';
import { ChartCard, SimpleBarChart, SimpleLineChart } from './charts';
import { DashboardShell } from './DashboardShell';
import { FilterBar } from './FilterBar';
import { InsightChip } from './InsightChip';
import { KpiCard } from './KpiCard';

const COLORS = ['#00195A', '#594DA3', '#826ACA', '#AD88F1'];

export function OverviewTab() {
  const [year, setYear] = useState<YearOption>('all');
  const [program, setProgram] = useState<Program>('all');

  const scopedSubjectAverages = subjectAverages;

  const scopedCandidates = candidatesByYear
    .filter(item => year === 'all' || item.year === year)
    .map(item => ({
      label: String(item.year),
      value: Math.round(item.value * (program === 'CT2006' ? 0.64 : program === 'CT2018' ? 0.36 : 1)),
    }));

  const highest = [...scopedSubjectAverages].sort((a, b) => b.value - a.value)[0];
  const lowest = [...scopedSubjectAverages].sort((a, b) => a.value - b.value)[0];
  const average = scopedSubjectAverages.reduce((sum, item) => sum + item.value, 0) / scopedSubjectAverages.length;

  const kpis = overviewKpis.map(item => {
    if (item.label === 'Điểm TB toàn quốc') {
      return { ...item, value: average.toFixed(2), detail: program === 'all' ? 'Toàn quốc' : program };
    }
    if (item.label === 'Môn điểm cao nhất') return { ...item, value: highest.subjectName, detail: `${highest.value.toFixed(2)} điểm` };
    if (item.label === 'Môn điểm thấp nhất') return { ...item, value: lowest.subjectName, detail: `${lowest.value.toFixed(2)} điểm` };
    return item;
  });

  return (
    <DashboardShell title="Tổng quan">
      <FilterBar
        controls={[
          {
            label: 'Năm',
            value: String(year),
            options: [{ label: 'Tất cả', value: 'all' }, ...YEARS.map(item => ({ label: String(item), value: String(item) }))],
            onChange: value => setYear(value === 'all' ? 'all' : Number(value) as YearOption),
          },
          {
            label: 'Chương trình',
            value: program,
            options: [{ label: 'Tất cả', value: 'all' }, ...PROGRAMS.map(item => ({ label: item, value: item }))],
            onChange: value => setProgram(value as Program),
          },
        ]}
        onReset={() => {
          setYear('all');
          setProgram('all');
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {kpis.map(item => <KpiCard key={item.label} item={item} />)}
      </div>

      <div className="flex flex-wrap gap-2">
        <InsightChip label="Cao nhất" value={highest.subjectName} />
        <InsightChip label="Thấp nhất" value={lowest.subjectName} />
        <InsightChip label="Xu hướng" value="Điểm TB tăng nhẹ" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <ChartCard title="Điểm trung bình toàn quốc theo năm">
          <SimpleLineChart
            series={[
              {
                name: 'Điểm TB',
                color: COLORS[1],
                points: nationalAverageByYear
                  .filter(item => year === 'all' || item.year === year)
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
