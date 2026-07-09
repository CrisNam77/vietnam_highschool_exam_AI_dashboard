import type {
  KpiItem,
  DistributionRecord,
  DistributionStats,
  ProvinceRanking,
  Region,
  RegionMetric,
  Subject,
  SubjectMetric,
  SubjectYearMetric,
  YearMetric,
} from '@/types/dashboard';

// Mock data for the first UI phase only. Replace this module with backend
// aggregate API responses after data/processed/final_data.csv is available.
export const YEARS = [2022, 2023, 2024, 2025, 2026] as const;

export const SUBJECTS: Subject[] = [
  { id: 'toan', name: 'Toán' },
  { id: 'ngu_van', name: 'Ngữ văn' },
  { id: 'tieng_anh', name: 'Tiếng Anh' },
  { id: 'vat_ly', name: 'Vật lý' },
  { id: 'hoa_hoc', name: 'Hóa học' },
  { id: 'sinh_hoc', name: 'Sinh học' },
  { id: 'lich_su', name: 'Lịch sử' },
  { id: 'dia_ly', name: 'Địa lý' },
  { id: 'gdcd', name: 'GDCD' },
];

export const REGIONS: Region[] = [
  { id: 'dbsh', name: 'ĐB sông Hồng' },
  { id: 'dnb', name: 'Đông Nam Bộ' },
  { id: 'btb', name: 'Bắc Trung Bộ' },
  { id: 'dhntb', name: 'DH Nam Trung Bộ' },
  { id: 'dbscl', name: 'ĐB sông Cửu Long' },
  { id: 'tn', name: 'Tây Nguyên' },
  { id: 'tdmnpb', name: 'TD & MN phía Bắc' },
];

export const PROGRAMS = ['CT2006', 'CT2018'] as const;

export const COMBINATIONS = [
  { id: 'a00', name: 'A00' },
  { id: 'a01', name: 'A01' },
  { id: 'b00', name: 'B00' },
  { id: 'c00', name: 'C00' },
  { id: 'd01', name: 'D01' },
];

export const overviewKpis: KpiItem[] = [
  { label: 'Tổng số thí sinh', value: '5,24 triệu' },
  { label: 'Số tỉnh/thành', value: '63' },
  { label: 'Giai đoạn', value: '2022-2026' },
  { label: 'Điểm TB toàn quốc', value: '6.42' },
];

export const nationalAverageByYear: YearMetric[] = [
  { year: 2022, value: 6.21 },
  { year: 2023, value: 6.28 },
  { year: 2024, value: 6.34 },
  { year: 2025, value: 6.39 },
  { year: 2026, value: 6.47 },
];

export const candidatesByYear: YearMetric[] = [
  { year: 2022, value: 995435 },
  { year: 2023, value: 1017584 },
  { year: 2024, value: 1061604 },
  { year: 2025, value: 1153072 },
  { year: 2026, value: 1015000 },
];

export const subjectAverages: SubjectMetric[] = [
  { subjectId: 'toan', subjectName: 'Toán', value: 6.68 },
  { subjectId: 'ngu_van', subjectName: 'Ngữ văn', value: 6.45 },
  { subjectId: 'tieng_anh', subjectName: 'Tiếng Anh', value: 5.28 },
  { subjectId: 'vat_ly', subjectName: 'Vật lý', value: 6.72 },
  { subjectId: 'hoa_hoc', subjectName: 'Hóa học', value: 6.61 },
  { subjectId: 'sinh_hoc', subjectName: 'Sinh học', value: 6.05 },
  { subjectId: 'lich_su', subjectName: 'Lịch sử', value: 6.31 },
  { subjectId: 'dia_ly', subjectName: 'Địa lý', value: 6.77 },
  { subjectId: 'gdcd', subjectName: 'GDCD', value: 7.82 },
];

const yearlyBase: Record<string, number[]> = {
  toan: [6.42, 6.54, 6.61, 6.72, 6.79],
  ngu_van: [6.29, 6.35, 6.47, 6.53, 6.62],
  tieng_anh: [5.08, 5.15, 5.23, 5.36, 5.49],
  vat_ly: [6.51, 6.63, 6.69, 6.81, 6.96],
  hoa_hoc: [6.44, 6.53, 6.62, 6.69, 6.78],
  sinh_hoc: [5.83, 5.94, 6.02, 6.15, 6.29],
  lich_su: [6.1, 6.18, 6.3, 6.43, 6.55],
  dia_ly: [6.55, 6.64, 6.75, 6.86, 6.98],
  gdcd: [7.54, 7.68, 7.79, 7.92, 8.05],
};

export const subjectYearMatrix: SubjectYearMetric[] = SUBJECTS.flatMap(subject =>
  YEARS.map((year, index) => {
    const average = yearlyBase[subject.id][index];
    const underFive = Math.max(4, Number((24 - average * 2.35 + index * 0.2).toFixed(1)));
    const eightPlus = Math.min(58, Number((average * 7.1 - 27 + index * 0.9).toFixed(1)));
    const perfect10 = Math.max(120, Math.round((average - 4.8) * 980 + index * 130));
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      year,
      average,
      underFive,
      eightPlus,
      perfect10,
    };
  })
);

export const underFiveRates: SubjectMetric[] = SUBJECTS.map(subject => {
  const latest = subjectYearMatrix.find(row => row.subjectId === subject.id && row.year === 2026);
  return { subjectId: subject.id, subjectName: subject.name, value: latest?.underFive ?? 0 };
});

export const eightPlusRates: SubjectMetric[] = SUBJECTS.map(subject => {
  const latest = subjectYearMatrix.find(row => row.subjectId === subject.id && row.year === 2026);
  return { subjectId: subject.id, subjectName: subject.name, value: latest?.eightPlus ?? 0 };
});

const provinceSeed = [
  ['Hà Nội', 'dbsh', 6.82, 108400],
  ['Hải Phòng', 'dbsh', 6.64, 31500],
  ['Bắc Ninh', 'dbsh', 6.71, 18200],
  ['TP.HCM', 'dnb', 6.76, 87200],
  ['Bình Dương', 'dnb', 6.58, 23400],
  ['Đồng Nai', 'dnb', 6.49, 30200],
  ['Thanh Hóa', 'btb', 6.37, 36500],
  ['Nghệ An', 'btb', 6.33, 34800],
  ['Đà Nẵng', 'dhntb', 6.69, 14200],
  ['Khánh Hòa', 'dhntb', 6.45, 16800],
  ['Cần Thơ', 'dbscl', 6.5, 13800],
  ['An Giang', 'dbscl', 6.18, 22100],
  ['Lâm Đồng', 'tn', 6.31, 15300],
  ['Đắk Lắk', 'tn', 6.08, 24600],
  ['Thái Nguyên', 'tdmnpb', 6.25, 17200],
  ['Lào Cai', 'tdmnpb', 5.96, 9300],
] as const;

export const provinceRankings: ProvinceRanking[] = provinceSeed.flatMap(([province, regionId, base, candidates]) => {
  const region = REGIONS.find(item => item.id === regionId);
  return YEARS.flatMap((year, yearIndex) =>
    SUBJECTS.map((subject, subjectIndex) => ({
      province,
      regionId,
      regionName: region?.name ?? regionId,
      year,
      subjectId: subject.id,
      subjectName: subject.name,
      average: Number((base + yearIndex * 0.04 + (subjectAverages[subjectIndex].value - 6.4) * 0.16).toFixed(2)),
      candidates: Math.round(candidates * (0.94 + yearIndex * 0.018)),
    }))
  );
});

export const regionAverages: RegionMetric[] = REGIONS.flatMap((region, regionIndex) =>
  YEARS.flatMap((year, yearIndex) =>
    SUBJECTS.map((subject, subjectIndex) => ({
      regionId: region.id,
      regionName: region.name,
      year,
      subjectId: subject.id,
      subjectName: subject.name,
      average: Number((6.18 + regionIndex * 0.07 + yearIndex * 0.05 + (subjectAverages[subjectIndex].value - 6.4) * 0.22).toFixed(2)),
    }))
  )
);

export const regionSubjectMatrix = regionAverages.filter(item => item.year === 2026);

const subjectBins = ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10'];
const combinationBins = ['0-5', '5-10', '10-15', '15-20', '20-25', '25-30'];

function normalizeDistribution(weights: number[], total: number) {
  const sum = weights.reduce((acc, value) => acc + value, 0);
  return weights.map((weight, index) => {
    const percentage = Number(((weight / sum) * 100).toFixed(1));
    return {
      percentage,
      count: index === weights.length - 1
        ? Math.max(0, total - Math.round(weights.slice(0, -1).reduce((acc, item) => acc + (item / sum) * total, 0)))
        : Math.round((weight / sum) * total),
    };
  });
}

function subjectWeights(mean: number, yearIndex: number) {
  return subjectBins.map((_, index) => {
    const center = index + 0.5;
    const spread = mean >= 7 ? 2.2 : mean < 5.7 ? 2.65 : 2.45;
    const base = Math.exp(-Math.pow(center - mean, 2) / (2 * spread));
    const highTail = center > 8 ? 1 + (mean - 6) * 0.08 : 1;
    return Math.max(0.15, base * highTail + yearIndex * 0.018);
  });
}

function combinationWeights(mean: number, yearIndex: number) {
  return combinationBins.map((_, index) => {
    const center = index * 5 + 2.5;
    const spread = 20;
    const base = Math.exp(-Math.pow(center - mean, 2) / (2 * spread));
    const highTail = center > 22 ? 1 + (mean - 19) * 0.05 : 1;
    return Math.max(0.12, base * highTail + yearIndex * 0.012);
  });
}

export const subjectDistributions: DistributionRecord[] = SUBJECTS.flatMap(subject =>
  YEARS.map((year, yearIndex) => {
    const metric = subjectYearMatrix.find(item => item.subjectId === subject.id && item.year === year);
    const total = 78000 + yearIndex * 4200 + SUBJECTS.findIndex(item => item.id === subject.id) * 1800;
    const normalized = normalizeDistribution(subjectWeights(metric?.average ?? 6.2, yearIndex), total);
    return {
      year,
      type: 'subject',
      key: subject.id,
      name: subject.name,
      bins: subjectBins.map((label, index) => ({ label, ...normalized[index] })),
    };
  })
);

const combinationMeans: Record<string, number[]> = {
  a00: [20.2, 20.5, 20.8, 21.1, 21.4],
  a01: [18.7, 19.0, 19.2, 19.6, 19.9],
  b00: [19.4, 19.7, 20.1, 20.2, 20.6],
  c00: [20.1, 20.3, 20.7, 21.0, 21.3],
  d01: [18.1, 18.4, 18.7, 19.1, 19.4],
};

export const combinationDistributions: DistributionRecord[] = COMBINATIONS.flatMap(combination =>
  YEARS.map((year, yearIndex) => {
    const mean = combinationMeans[combination.id][yearIndex];
    const total = 52000 + yearIndex * 3100 + COMBINATIONS.findIndex(item => item.id === combination.id) * 4600;
    const normalized = normalizeDistribution(combinationWeights(mean, yearIndex), total);
    return {
      year,
      type: 'combination',
      key: combination.id,
      name: combination.name,
      bins: combinationBins.map((label, index) => ({ label, ...normalized[index] })),
    };
  })
);

export const distributionStats: DistributionStats[] = [
  ...SUBJECTS.flatMap(subject =>
    YEARS.map((year, yearIndex) => {
      const metric = subjectYearMatrix.find(item => item.subjectId === subject.id && item.year === year);
      const mean = metric?.average ?? 6.2;
      return {
        year,
        type: 'subject' as const,
        key: subject.id,
        name: subject.name,
        candidateCount: 78000 + yearIndex * 4200 + SUBJECTS.findIndex(item => item.id === subject.id) * 1800,
        mean,
        median: Number((mean + 0.12).toFixed(2)),
        std: Number((1.55 + (7 - mean) * 0.08).toFixed(2)),
        mode: Number((mean + 0.35).toFixed(1)),
        underFiveRate: metric?.underFive ?? 0,
        eightPlusRate: metric?.eightPlus ?? 0,
        perfectCount: metric?.perfect10 ?? 0,
      };
    })
  ),
  ...COMBINATIONS.flatMap(combination =>
    YEARS.map((year, yearIndex) => {
      const mean = combinationMeans[combination.id][yearIndex];
      return {
        year,
        type: 'combination' as const,
        key: combination.id,
        name: combination.name,
        candidateCount: 52000 + yearIndex * 3100 + COMBINATIONS.findIndex(item => item.id === combination.id) * 4600,
        mean,
        median: Number((mean + 0.25).toFixed(2)),
        std: Number((3.25 + (21 - mean) * 0.06).toFixed(2)),
        mode: Number((mean + 0.7).toFixed(1)),
        under15Rate: Number(Math.max(4, 36 - mean * 1.35).toFixed(1)),
        above24Rate: Number(Math.max(6, mean * 2.1 - 29).toFixed(1)),
        highScoreCount: Math.round(Math.max(900, (mean - 17) * 1400 + yearIndex * 220)),
      };
    })
  ),
];
