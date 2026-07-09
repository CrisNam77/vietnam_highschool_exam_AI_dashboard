export type Tab = 'overview' | 'trends' | 'distribution' | 'regions' | 'assistant';

export type YearOption = 'all' | 2022 | 2023 | 2024 | 2025 | 2026;

export type Program = 'all' | 'CT2006' | 'CT2018';

export type MetricKey = 'average' | 'underFive' | 'eightPlus' | 'perfect10';

export interface Subject {
  id: string;
  name: string;
}

export interface Region {
  id: string;
  name: string;
}

export interface KpiItem {
  label: string;
  value: string;
  detail?: string;
}

export interface YearMetric {
  year: number;
  value: number;
  label?: string;
  program?: Program;
}

export interface SubjectMetric {
  subjectId: string;
  subjectName: string;
  value: number;
  program?: Program;
}

export interface SubjectYearMetric {
  subjectId: string;
  subjectName: string;
  year: number;
  average: number;
  underFive: number;
  eightPlus: number;
  perfect10: number;
  program?: Program;
}

export interface ProvinceRanking {
  province: string;
  regionId: string;
  regionName: string;
  year: number;
  subjectId: string;
  subjectName: string;
  average: number;
  candidates: number;
}

export interface RegionMetric {
  regionId: string;
  regionName: string;
  year: number;
  subjectId: string;
  subjectName: string;
  average: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface LineSeries {
  name: string;
  color: string;
  points: ChartPoint[];
}

export type DistributionKind = 'subject' | 'combination';

export interface DistributionBin {
  start: number;
  end: number;
  label: string;
  count: number;
  percentage: number;
}

export interface CombinationOption {
  id: string;
  name: string;
  subjects: string;
}

export interface DistributionStats {
  year: number;
  type: DistributionKind;
  key: string;
  name: string;
  candidateCount: number;
  mean: number;
  median: number;
  std: number;
  mad: number;
  mode: number;
  underFiveRate?: number;
  underFiveCount?: number;
  eightPlusRate?: number;
  eightPlusCount?: number;
  under15Rate?: number;
  underFifteenRate?: number;
  underFifteenCount?: number;
  above24Rate?: number;
  aboveTwentyFourRate?: number;
  aboveTwentyFourCount?: number;
  aboveTwentySevenRate?: number;
  aboveTwentySevenCount?: number;
  perfectCount?: number;
  zeroCount?: number;
  belowOneCount?: number;
  belowOneRate?: number;
  highScoreCount?: number;
  maxScoreCount?: number;
}

export interface DistributionRecord {
  year: number;
  type: DistributionKind;
  key: string;
  name: string;
  scoreMin: number;
  scoreMax: number;
  binSize: number;
  bins: DistributionBin[];
}
