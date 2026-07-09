import data from './data';
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
  Program,
  YearOption
} from '@/types/dashboard';

export const YEARS = data.YEARS as readonly number[];
export const SUBJECTS: Subject[] = data.SUBJECTS;
export const REGIONS: Region[] = data.REGIONS;
export const PROGRAMS = data.PROGRAMS as readonly Program[];
export const COMBINATIONS: CombinationOption[] = data.COMBINATIONS;

export const overviewKpis: KpiItem[] = data.overviewKpis;
export const nationalAverageByYear: YearMetric[] = data.nationalAverageByYear;
export const candidatesByYear: YearMetric[] = data.candidatesByYear;
export const subjectAverages: SubjectMetric[] = data.subjectAverages;
export const subjectYearMatrix: SubjectYearMetric[] = data.subjectYearMatrix;
export const underFiveRates: SubjectMetric[] = data.underFiveRates;
export const eightPlusRates: SubjectMetric[] = data.eightPlusRates;
export const provinceRankings: ProvinceRanking[] = data.provinceRankings;
export const regionAverages: RegionMetric[] = data.regionAverages;
export const regionSubjectMatrix = data.regionSubjectMatrix;

export const subjectDistributions: DistributionRecord[] = data.subjectDistributions;
export const combinationDistributions: DistributionRecord[] = data.combinationDistributions;
export const distributionStats: DistributionStats[] = data.distributionStats;
