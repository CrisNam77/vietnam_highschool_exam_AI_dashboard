'use client';

import { useMemo, useState } from 'react';
import { provinceRankings, REGIONS, regionAverages, regionSubjectMatrix, SUBJECTS, YEARS } from '@/data/dashboardData';
import type { ProvinceRanking } from '@/types/dashboard';
import { ChartCard, SimpleBarChart, SimpleHorizontalBarChart } from './charts';
import { DashboardShell } from './DashboardShell';
import { FilterBar } from './FilterBar';
import { HeatmapTable } from './HeatmapTable';
import { RankingTable } from './RankingTable';

type Direction = 'highest' | 'lowest';

function aggregateProvinceRows(rows: ProvinceRanking[], subjectId: string): ProvinceRanking[] {
  if (subjectId !== 'aggregate') return rows.filter(row => row.subjectId === subjectId);

  const grouped = new Map<string, ProvinceRanking[]>();
  rows.forEach(row => {
    const key = `${row.province}-${row.year}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  });

  return [...grouped.values()].map(items => {
    const first = items[0];
    const average = items.reduce((sum, item) => sum + item.average, 0) / items.length;
    const candidates = Math.round(items.reduce((sum, item) => sum + item.candidates, 0) / items.length);
    return {
      ...first,
      subjectId: 'aggregate',
      subjectName: 'Tổng hợp',
      average: Number(average.toFixed(2)),
      candidates,
    };
  });
}

export function RegionTab() {
  const [year, setYear] = useState(2026);
  const [subjectId, setSubjectId] = useState('aggregate');
  const [regionId, setRegionId] = useState('all');
  const [topN, setTopN] = useState(10);
  const [direction, setDirection] = useState<Direction>('highest');
  const [search, setSearch] = useState('');

  const scopedRows = useMemo(() => {
    const byYear = provinceRankings.filter(row => row.year === year);
    return aggregateProvinceRows(byYear, subjectId).filter(row => regionId === 'all' || row.regionId === regionId);
  }, [year, subjectId, regionId]);

  const rankedRows = [...scopedRows].sort((a, b) => direction === 'highest' ? b.average - a.average : a.average - b.average);
  const topRows = rankedRows.slice(0, topN);
  const regionPoints = REGIONS.map(region => {
    const regionItems = regionAverages.filter(item => item.year === year && item.regionId === region.id && (subjectId === 'aggregate' || item.subjectId === subjectId));
    const value = regionItems.reduce((sum, item) => sum + item.average, 0) / Math.max(1, regionItems.length);
    return { label: region.name, value: Number(value.toFixed(2)) };
  });

  const heatmapRows = REGIONS.map(region => ({
    label: region.name,
    values: Object.fromEntries(
      SUBJECTS.map(subject => {
        const row = regionSubjectMatrix.find(item => item.regionId === region.id && item.subjectId === subject.id);
        return [subject.name, row?.average ?? 0];
      })
    ),
  }));

  return (
    <DashboardShell
      title="Địa phương & Vùng miền"
      question="So sánh kết quả thi theo tỉnh/thành và vùng miền."
    >
      <FilterBar
        controls={[
          {
            label: 'Năm',
            value: String(year),
            options: YEARS.map(item => ({ label: String(item), value: String(item) })),
            onChange: value => setYear(Number(value)),
          },
          {
            label: 'Môn học',
            value: subjectId,
            options: [{ label: 'Tổng hợp', value: 'aggregate' }, ...SUBJECTS.map(subject => ({ label: subject.name, value: subject.id }))],
            onChange: setSubjectId,
          },
          {
            label: 'Vùng miền',
            value: regionId,
            options: [{ label: 'Toàn quốc', value: 'all' }, ...REGIONS.map(region => ({ label: region.name, value: region.id }))],
            onChange: setRegionId,
          },
          {
            label: 'Top N',
            value: String(topN),
            options: [5, 10, 20].map(item => ({ label: String(item), value: String(item) })),
            onChange: value => setTopN(Number(value)),
          },
          {
            label: 'Xếp hạng',
            value: direction,
            options: [
              { label: 'Cao nhất', value: 'highest' },
              { label: 'Thấp nhất', value: 'lowest' },
            ],
            onChange: value => setDirection(value as Direction),
          },
        ]}
        search={{
          label: 'Tìm tỉnh/thành',
          value: search,
          placeholder: 'Nhập tên tỉnh/thành...',
          onChange: setSearch,
        }}
        onReset={() => {
          setYear(2026);
          setSubjectId('aggregate');
          setRegionId('all');
          setTopN(10);
          setDirection('highest');
          setSearch('');
        }}
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title={`${direction === 'highest' ? 'Top' : 'Bottom'} tỉnh/thành theo điểm TB`}>
          <SimpleHorizontalBarChart
            direction={direction}
            points={topRows.map(row => ({ label: row.province, value: row.average }))}
          />
        </ChartCard>
        <ChartCard title="Điểm TB theo vùng miền">
          <SimpleBarChart points={regionPoints} color="#594DA3" />
        </ChartCard>
      </div>

      <HeatmapTable columns={SUBJECTS.map(subject => subject.name)} rows={heatmapRows} />
      <RankingTable rows={rankedRows} search={search} />
    </DashboardShell>
  );
}
