import type { Program, Subject } from '@/types/dashboard';

export type ProcessedSubjectColumn =
  | 'toan'
  | 'ngu_van'
  | 'diem_anh'
  | 'vat_li'
  | 'hoa_hoc'
  | 'sinh_hoc'
  | 'lich_su'
  | 'dia_li'
  | 'gdcd'
  | 'tin_hoc'
  | 'cong_nghe_cn'
  | 'cong_nghe_nn'
  | 'gd_ktpl';

export type DashboardSubject = Subject & {
  column: ProcessedSubjectColumn;
  programs: Exclude<Program, 'all'>[];
};

export const DASHBOARD_SUBJECTS: DashboardSubject[] = [
  { id: 'toan', name: 'Toán', column: 'toan', programs: ['CT2006', 'CT2018'] },
  { id: 'ngu_van', name: 'Ngữ văn', column: 'ngu_van', programs: ['CT2006', 'CT2018'] },
  { id: 'tieng_anh', name: 'Tiếng Anh', column: 'diem_anh', programs: ['CT2006', 'CT2018'] },
  { id: 'vat_li', name: 'Vật lý', column: 'vat_li', programs: ['CT2006', 'CT2018'] },
  { id: 'hoa_hoc', name: 'Hóa học', column: 'hoa_hoc', programs: ['CT2006', 'CT2018'] },
  { id: 'sinh_hoc', name: 'Sinh học', column: 'sinh_hoc', programs: ['CT2006', 'CT2018'] },
  { id: 'lich_su', name: 'Lịch sử', column: 'lich_su', programs: ['CT2006', 'CT2018'] },
  { id: 'dia_li', name: 'Địa lý', column: 'dia_li', programs: ['CT2006', 'CT2018'] },
  { id: 'gdcd', name: 'GDCD', column: 'gdcd', programs: ['CT2006'] },
  { id: 'tin_hoc', name: 'Tin học', column: 'tin_hoc', programs: ['CT2018'] },
  { id: 'cong_nghe_cn', name: 'Công nghệ CN', column: 'cong_nghe_cn', programs: ['CT2018'] },
  { id: 'cong_nghe_nn', name: 'Công nghệ NN', column: 'cong_nghe_nn', programs: ['CT2018'] },
  { id: 'gd_ktpl', name: 'GDKTPL', column: 'gd_ktpl', programs: ['CT2018'] },
];

export function subjectsForProgram(program: Program): DashboardSubject[] {
  if (program === 'all') return DASHBOARD_SUBJECTS;
  return DASHBOARD_SUBJECTS.filter(subject => subject.programs.includes(program));
}

export function programsForYear(year: number): Exclude<Program, 'all'>[] {
  if (year <= 2024) return ['CT2006'];
  if (year >= 2026) return ['CT2018'];
  return ['CT2006', 'CT2018'];
}

export function subjectsForYear(year: number): DashboardSubject[] {
  const programs = programsForYear(year);
  return DASHBOARD_SUBJECTS.filter(subject => subject.programs.some(program => programs.includes(program)));
}

export function subjectAppliesToYear(subject: Subject, year: number): boolean {
  const programs = programsForYear(year);
  return subject.programs?.some(program => programs.includes(program)) ?? true;
}
