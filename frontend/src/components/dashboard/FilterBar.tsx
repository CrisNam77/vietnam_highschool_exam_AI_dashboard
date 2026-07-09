'use client';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterControl {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export function FilterBar({
  controls,
  search,
  onReset,
}: {
  controls: FilterControl[];
  search?: {
    label: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
  };
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        {controls.map(control => (
          <label key={control.label} className="min-w-[148px] flex-1 text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">
            {control.label}
            <select
              value={control.value}
              onChange={event => control.onChange(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F5F7FB] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[#0F172A] outline-none transition focus:border-[#826ACA] focus:bg-white"
            >
              {control.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {search && (
          <label className="min-w-[220px] flex-[1.3] text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">
            {search.label}
            <input
              value={search.value}
              onChange={event => search.onChange(event.target.value)}
              placeholder={search.placeholder}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F5F7FB] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#826ACA] focus:bg-white"
            />
          </label>
        )}
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-[#AD88F1]/60 bg-white px-4 py-2 text-sm font-bold text-[#594DA3] transition hover:bg-[#AD88F1]/10"
        >
          Đặt lại
        </button>
      </div>
    </div>
  );
}
