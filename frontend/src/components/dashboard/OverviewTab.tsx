'use client';

import { useState } from 'react';
import { candidatesByYear, nationalAverageByYear, overviewKpis, subjectAverages, subjectYearMatrix, YEARS } from '@/data/dashboardData';
import type { YearOption } from '@/types/dashboard';
import { ChartCard, SimpleBarChart, SimpleLineChart } from './charts';
import { DashboardShell } from './DashboardShell';
import { FilterBar } from './FilterBar';
import { KpiCard } from './KpiCard';

const COLORS = ['#00195A', '#594DA3', '#826ACA', '#AD88F1'];

export function OverviewTab() {
  const [year, setYear] = useState<YearOption>('all');
  const scopedSubjectAverages = year === 'all' 
    ? subjectAverages 
    : subjectYearMatrix
        .filter(item => item.year === year)
        .map(item => ({ subjectId: item.subjectId, subjectName: item.subjectName, value: item.average }));

  const scopedCandidates = candidatesByYear
    .filter(item => year === 'all' || item.year === year)
    .map(item => ({ label: String(item.year), value: item.value }));

  const average = scopedSubjectAverages.reduce((sum, item) => sum + item.value, 0) / (scopedSubjectAverages.length || 1);
  const totalCandidates = scopedCandidates.reduce((sum, item) => sum + item.value, 0);

  const kpis = overviewKpis.map(item => {
    if (item.label === 'Điểm TB toàn quốc') {
      return { ...item, value: average.toFixed(2) };
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
            options: [{ label: 'Tất cả', value: 'all' }, ...YEARS.map(item => ({ label: String(item), value: String(item) }))],
            onChange: value => setYear(value === 'all' ? 'all' : Number(value) as YearOption),
          },
        ]}
        onReset={() => setYear('all')}
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
