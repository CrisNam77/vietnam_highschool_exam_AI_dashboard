import type { KpiItem } from '@/types/dashboard';

export function KpiCard({ item }: { item: KpiItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748B]">{item.label}</p>
      <p className="mt-2 text-2xl font-extrabold text-[#00195A]">{item.value}</p>
      {item.detail && <p className="mt-1 text-xs font-medium text-[#64748B]">{item.detail}</p>}
    </div>
  );
}
