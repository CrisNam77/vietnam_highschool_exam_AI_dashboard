import type { ReactNode } from 'react';

import { ChartCard, SimpleLineChart } from '@/components/dashboard/charts';
import { programScaleComparison, regionalGapBySubject } from '@/data/analysisReportData';

export function AnalysisReportFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F5F7FB] p-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#594DA3]">ExamData AI · Analytical report</p>
          <h1 className="mt-2 text-2xl font-black text-[#00195A]">Hai biểu đồ phân tích điểm thi THPT</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#64748B]">Các biểu đồ dưới đây dùng chính component biểu đồ và hệ màu của dashboard.</p>
        </header>
        {children}
      </div>
    </main>
  );
}

export function RegionalGapCharts() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ChartCard title="Khoảng cách vùng theo điểm trung bình và trung vị">
        <SimpleLineChart
          series={[
            {
              name: 'Khoảng cách TB',
              color: '#594DA3',
              points: regionalGapBySubject.map(item => ({ label: item.subject, value: item.meanGap })),
            },
            {
              name: 'Khoảng cách trung vị',
              color: '#826ACA',
              points: regionalGapBySubject.map(item => ({ label: item.subject, value: item.medianGap })),
            },
          ]}
        />
      </ChartCard>
      <ChartCard title="Khoảng cách trong nhóm đạt từ 8 điểm">
        <SimpleLineChart
          valueMode="percent"
          series={[{
            name: 'Chênh lệch tỷ lệ từ 8 điểm (điểm %)',
            color: '#F87171',
            points: regionalGapBySubject.map(item => ({ label: item.subject, value: item.highScoreGap })),
          }]}
        />
      </ChartCard>
    </div>
  );
}

export function ProgramScaleCharts() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ChartCard title="KHTN − KHXH theo điểm thô">
        <SimpleLineChart
          series={[{
            name: 'Điểm thô',
            color: '#00195A',
            points: programScaleComparison.map(item => ({ label: item.label, value: item.raw })),
          }]}
        />
      </ChartCard>
      <ChartCard title="KHTN − KHXH sau chuẩn hóa theo môn">
        <SimpleLineChart
          series={[{
            name: 'Điểm tương đối',
            color: '#826ACA',
            points: programScaleComparison.map(item => ({ label: item.label, value: item.relative })),
          }]}
        />
      </ChartCard>
    </div>
  );
}
