'use client';

import { useEffect, useRef, useState } from 'react';

export interface DashboardSelectOption {
  value: string;
  label: string;
  description?: string;
}

export function DashboardSelect({
  label,
  value,
  options,
  onChange,
  className = '',
  disabled = false,
}: {
  label: string;
  value: string;
  options: DashboardSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value) ?? options[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className={`relative min-w-[148px] flex-1 text-xs font-bold uppercase tracking-[0.12em] text-[#64748B] ${className}`}>
      <span>{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        className="mt-1 flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#F5F7FB] px-3.5 py-2.5 text-left text-sm font-semibold normal-case tracking-normal text-[#0F172A] outline-none transition hover:border-[#AD88F1] hover:bg-white focus:border-[#826ACA] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="min-w-0 truncate">{selected?.label ?? 'Chọn'}</span>
        <span className={`text-[#826ACA] transition ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-[#00195A]/10">
          {options.map(option => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full rounded-xl px-3 py-2.5 text-left normal-case tracking-normal transition ${
                  active ? 'bg-[#594DA3] text-white' : 'text-[#0F172A] hover:bg-[#F5F7FB]'
                }`}
              >
                <span className="block truncate text-sm font-bold">{option.label}</span>
                {option.description && (
                  <span className={`mt-0.5 block truncate text-xs font-semibold ${active ? 'text-white/80' : 'text-[#64748B]'}`}>
                    {option.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
