export type Tab = 'overview' | 'trends' | 'regions' | 'assistant';

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
}

export interface SubjectMetric {
  subjectId: string;
  subjectName: string;
  value: number;
}

export interface SubjectYearMetric {
  subjectId: string;
  subjectName: string;
  year: number;
  average: number;
  underFive: number;
  eightPlus: number;
  perfect10: number;
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
