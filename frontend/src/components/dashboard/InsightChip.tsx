export function InsightChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#AD88F1]/45 bg-white px-3 py-2 text-sm shadow-sm">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">{label}</span>
      <span className="font-bold text-[#31327E]">{value}</span>
    </div>
  );
}
