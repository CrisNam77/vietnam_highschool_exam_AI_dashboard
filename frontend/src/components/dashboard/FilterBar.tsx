'use client';

import { DashboardSelect } from './DashboardSelect';

export interface FilterOption {
  label: string;
  value: string;
  description?: string;
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
  flat,
}: {
  controls: FilterControl[];
  search?: {
    label: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
  };
  onReset: () => void;
  flat?: boolean;
}) {
  const inner = (
    <div className="flex flex-wrap items-end gap-3">
      {controls.map(control => (
        <DashboardSelect
          key={control.label}
          label={control.label}
          value={control.value}
          options={control.options}
          onChange={control.onChange}
        />
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
  );

  if (flat) return inner;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {inner}
    </div>
  );
}
