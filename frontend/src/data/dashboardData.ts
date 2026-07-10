import data from './data';
import { DASHBOARD_SUBJECTS } from './dashboardSchema';
import type {
  KpiItem,
  CombinationOption,
  DistributionRecord,
  DistributionStats,
  ProvinceRanking,
  Region,
  RegionMetric,
  Subject,
  SubjectMetric,
  SubjectYearMetric,
  YearMetric,
  Program
} from '@/types/dashboard';

export const YEARS = data.YEARS as readonly number[];
export const SUBJECTS: Subject[] = DASHBOARD_SUBJECTS;
export const REGIONS = data.REGIONS as Region[];
export const PROGRAMS = data.PROGRAMS as readonly Program[];
export const COMBINATIONS = data.COMBINATIONS as CombinationOption[];

export const overviewKpis = data.overviewKpis as KpiItem[];
export const nationalAverageByYear = data.nationalAverageByYear as YearMetric[];
export const candidatesByYear = data.candidatesByYear as YearMetric[];
export const subjectAverages = data.subjectAverages as SubjectMetric[];
export const subjectYearMatrix = data.subjectYearMatrix as SubjectYearMetric[];
export const underFiveRates = data.underFiveRates as SubjectMetric[];
export const eightPlusRates = data.eightPlusRates as SubjectMetric[];
export const provinceRankings = data.provinceRankings as ProvinceRanking[];
export const regionAverages = data.regionAverages as RegionMetric[];
export const regionSubjectMatrix = data.regionSubjectMatrix;

export const subjectDistributions = data.subjectDistributions as DistributionRecord[];
export const combinationDistributions = data.combinationDistributions as DistributionRecord[];
export const distributionStats = data.distributionStats as DistributionStats[];
