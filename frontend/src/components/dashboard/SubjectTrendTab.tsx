'use client';

import { useState } from 'react';
import { eightPlusRates, subjectYearMatrix, SUBJECTS, underFiveRates, YEARS } from '@/data/dashboardData';
import type { MetricKey } from '@/types/dashboard';
import { ChartCard, SimpleBarChart, SimpleLineChart } from './charts';
import { DashboardShell } from './DashboardShell';
import { FilterBar } from './FilterBar';
import { HeatmapTable } from './HeatmapTable';

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
  vat_ly: '#826ACA',
  hoa_hoc: '#AD88F1',
  sinh_hoc: '#7C3AED',
  lich_su: '#4F46E5',
  dia_ly: '#2563EB',
  gdcd: '#0F766E',
};

const metricValueMode: Record<MetricKey, 'score' | 'percent' | 'count'> = {
  average: 'score',
  underFive: 'percent',
  eightPlus: 'percent',
  perfect10: 'count',
};

export function SubjectTrendTab() {
  const [fromYear, setFromYear] = useState(2022);
  const [toYear, setToYear] = useState(2026);
  const [subjectId, setSubjectId] = useState('all');
  const [metric, setMetric] = useState<MetricKey>('average');

  const startYear = Math.min(fromYear, toYear);
  const endYear = Math.max(fromYear, toYear);
  const yearRange = YEARS.filter(year => year >= startYear && year <= endYear);
  const lineSubjects = subjectId === 'all'
    ? SUBJECTS
    : SUBJECTS.filter(subject => subject.id === subjectId);

  const heatmapRows = SUBJECTS.map(subject => ({
    label: subject.name,
    values: Object.fromEntries(
      yearRange.map(year => {
        const row = subjectYearMatrix.find(item => item.subjectId === subject.id && item.year === year);
        return [String(year), row?.[metric] ?? 0];
      })
    ),
  }));

  return (
    <DashboardShell
      title="Xu hướng & Môn học"
      question="Theo dõi biến động điểm thi theo năm và môn học."
    >
      <FilterBar
        controls={[
          {
            label: 'Từ năm',
            value: String(fromYear),
            options: YEARS.map(year => ({ label: String(year), value: String(year) })),
            onChange: value => setFromYear(Number(value)),
          },
          {
            label: 'Đến năm',
            value: String(toYear),
            options: YEARS.map(year => ({ label: String(year), value: String(year) })),
            onChange: value => setToYear(Number(value)),
          },
          {
            label: 'Môn học',
            value: subjectId,
            options: [{ label: 'Tất cả môn', value: 'all' }, ...SUBJECTS.map(subject => ({ label: subject.name, value: subject.id }))],
            onChange: setSubjectId,
          },
          {
            label: 'Chỉ số',
            value: metric,
            options: Object.entries(metricLabels).map(([value, label]) => ({ label, value })),
            onChange: value => setMetric(value as MetricKey),
          },
        ]}
        onReset={() => {
          setFromYear(2022);
          setToYear(2026);
          setSubjectId('all');
          setMetric('average');
        }}
      />

      <ChartCard title={`Xu hướng ${metricLabels[metric].toLowerCase()} theo môn`}>
        <SimpleLineChart
          valueMode={metricValueMode[metric]}
          series={lineSubjects.map(subject => ({
            name: subject.name,
            color: subjectPalette[subject.id] ?? '#594DA3',
            points: yearRange.map(year => {
              const row = subjectYearMatrix.find(item => item.subjectId === subject.id && item.year === year);
              return { label: String(year), value: row?.[metric] ?? 0 };
            }),
          }))}
        />
      </ChartCard>

      <HeatmapTable columns={yearRange.map(String)} rows={heatmapRows} danger={metric === 'underFive'} />

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Tỷ lệ dưới 5 theo môn">
          <SimpleBarChart points={underFiveRates.map(item => ({ label: item.subjectName, value: item.value }))} danger />
        </ChartCard>
        <ChartCard title="Tỷ lệ từ 8 trở lên theo môn">
          <SimpleBarChart points={eightPlusRates.map(item => ({ label: item.subjectName, value: item.value }))} color="#594DA3" />
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
