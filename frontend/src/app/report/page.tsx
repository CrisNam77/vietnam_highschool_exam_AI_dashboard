import { AnalysisReportFrame, ProgramScaleCharts, RegionalGapCharts } from '@/components/analysis/AnalysisReportCharts';

export default function AnalysisReportPage() {
  return (
    <AnalysisReportFrame>
      <RegionalGapCharts />
      <ProgramScaleCharts />
    </AnalysisReportFrame>
  );
}
