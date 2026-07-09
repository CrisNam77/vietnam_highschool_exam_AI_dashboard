'use client';

import { useMemo, useState } from 'react';
import { eightPlusRates, subjectYearMatrix, SUBJECTS, underFiveRates, YEARS } from '@/data/dashboardMockData';
import type { MetricKey } from '@/types/dashboard';
import { ChartCard, SimpleBarChart, SimpleLineChart } from './charts';
import { DashboardShell } from './DashboardShell';
import { FilterBar } from './FilterBar';
import { HeatmapTable } from './HeatmapTable';
import { InsightChip } from './InsightChip';

const metricLabels: Record<MetricKey, string> = {
  average: 'Điểm trung bình',
  underFive: 'Tỷ lệ dưới 5',
  eightPlus: 'Tỷ lệ từ 8 trở lên',
  perfect10: 'Số điểm 10',
};

const representativeSubjects = ['gdcd', 'tieng_anh', 'toan', 'ngu_van'];
const palette = ['#00195A', '#594DA3', '#826ACA', '#AD88F1', '#31327E'];

export function SubjectTrendTab() {
  const [fromYear, setFromYear] = useState(2022);
  const [toYear, setToYear] = useState(2026);
  const [subjectId, setSubjectId] = useState('all');
  const [metric, setMetric] = useState<MetricKey>('average');

  const yearRange = YEARS.filter(year => year >= Math.min(fromYear, toYear) && year <= Math.max(fromYear, toYear));
  const lineSubjects = subjectId === 'all'
    ? SUBJECTS.filter(subject => representativeSubjects.includes(subject.id))
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

  const strongestMove = useMemo(() => {
    return SUBJECTS.map(subject => {
      const first = subjectYearMatrix.find(item => item.subjectId === subject.id && item.year === yearRange[0]);
      const last = subjectYearMatrix.find(item => item.subjectId === subject.id && item.year === yearRange[yearRange.length - 1]);
      return { name: subject.name, diff: Math.abs((last?.average ?? 0) - (first?.average ?? 0)) };
    }).sort((a, b) => b.diff - a.diff)[0];
  }, [yearRange]);

  return (
    <DashboardShell
      title="Xu hướng & Môn học"
      question="Điểm thi thay đổi như thế nào qua các năm và môn nào biến động rõ nhất?"
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

      <div className="flex flex-wrap gap-2">
        <InsightChip label="Biến động rõ" value={strongestMove.name} />
        <InsightChip label="Line chart" value={subjectId === 'all' ? '4 môn tiêu biểu' : '1 môn đã chọn'} />
        <InsightChip label="Chỉ số" value={metricLabels[metric]} />
      </div>

      <ChartCard title={`Xu hướng ${metricLabels[metric].toLowerCase()} theo môn`}>
        <SimpleLineChart
          series={lineSubjects.map((subject, index) => ({
            name: subject.name,
            color: palette[index % palette.length],
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
