// Snapshot of the verified CT2006 2022–2024 aggregates used in the notebook report.
export const regionalGapBySubject = [
  { subject: 'Ngoại ngữ', meanGap: 0.56, medianGap: 0.73, highScoreGap: 5.66 },
  { subject: 'Vật lí', meanGap: 0.53, medianGap: 0.67, highScoreGap: 15.69 },
  { subject: 'Ngữ văn', meanGap: 0.37, medianGap: 0.50, highScoreGap: 16.00 },
  { subject: 'GDCD', meanGap: 0.33, medianGap: 0.33, highScoreGap: 11.70 },
  { subject: 'Toán', meanGap: 0.33, medianGap: 0.20, highScoreGap: 4.94 },
  { subject: 'Lịch sử', meanGap: 0.28, medianGap: 0.33, highScoreGap: 5.40 },
  { subject: 'Sinh học', meanGap: 0.22, medianGap: 0.25, highScoreGap: 1.37 },
  { subject: 'Địa lí', meanGap: 0.22, medianGap: 0.25, highScoreGap: 4.66 },
  { subject: 'Hóa học', meanGap: 0.19, medianGap: 0.25, highScoreGap: 10.00 },
] as const;

export const programScaleComparison = [
  { label: '2022 Bắc', raw: -0.218, relative: 0.170 },
  { label: '2022 Trung', raw: -0.061, relative: 0.292 },
  { label: '2022 Nam', raw: -0.341, relative: 0.095 },
  { label: '2023 Bắc', raw: 0.157, relative: 0.176 },
  { label: '2023 Trung', raw: 0.267, relative: 0.264 },
  { label: '2023 Nam', raw: 0.013, relative: 0.087 },
  { label: '2024 Bắc', raw: -0.194, relative: 0.153 },
  { label: '2024 Trung', raw: -0.063, relative: 0.264 },
  { label: '2024 Nam', raw: -0.326, relative: 0.078 },
] as const;
