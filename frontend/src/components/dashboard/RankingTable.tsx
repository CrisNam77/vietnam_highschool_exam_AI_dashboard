'use client';

import { useMemo, useState } from 'react';
import type { ProvinceRanking } from '@/types/dashboard';

type SortKey = 'average' | 'candidates';

export function RankingTable({
  rows,
  search,
}: {
  rows: ProvinceRanking[];
  search: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('average');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const visibleRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return rows
      .filter(row => !normalized || row.province.toLowerCase().includes(normalized))
      .sort((a, b) => b[sortKey] - a[sortKey]);
  }, [rows, search, sortKey]);

  const maxPage = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const currentPage = Math.min(page, maxPage);
  const pageRows = visibleRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#0F172A]">Bảng xếp hạng tỉnh/thành</h3>
        <div className="flex gap-2">
          {(['average', 'candidates'] as const).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSortKey(key);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                sortKey === key ? 'bg-[#594DA3] text-white' : 'bg-[#F5F7FB] text-[#64748B] hover:text-[#31327E]'
              }`}
            >
              {key === 'average' ? 'Sắp theo điểm' : 'Sắp theo thí sinh'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[#F5F7FB] text-left text-xs font-extrabold uppercase tracking-[0.12em] text-[#64748B]">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Tỉnh/thành</th>
              <th className="px-4 py-3">Vùng miền</th>
              <th className="px-4 py-3 text-right">Điểm TB</th>
              <th className="px-4 py-3 text-right">Thí sinh</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => (
              <tr key={`${row.province}-${row.subjectId}`} className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold text-[#64748B]">{(currentPage - 1) * pageSize + index + 1}</td>
                <td className="px-4 py-3 font-bold text-[#0F172A]">{row.province}</td>
                <td className="px-4 py-3 text-[#64748B]">{row.regionName}</td>
                <td className="px-4 py-3 text-right font-extrabold text-[#31327E]">{row.average.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#64748B]">{row.candidates.toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs font-bold text-[#64748B]">
        <span>
          Trang {currentPage}/{maxPage} · {visibleRows.length} dòng
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage(value => Math.max(1, value - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 transition hover:bg-[#F5F7FB]"
          >
            Trước
          </button>
          <button
            type="button"
            onClick={() => setPage(value => Math.min(maxPage, value + 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 transition hover:bg-[#F5F7FB]"
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  );
}
