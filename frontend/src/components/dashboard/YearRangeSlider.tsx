'use client';

import { useRef, useState, useCallback } from 'react';

interface YearRangeSliderProps {
  years: number[];
  fromYear: number;
  toYear: number;
  onFromChange: (year: number) => void;
  onToChange: (year: number) => void;
}

export function YearRangeSlider({
  years,
  fromYear,
  toYear,
  onFromChange,
  onToChange,
}: YearRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'from' | 'to' | null>(null);

  const maxIdx = years.length - 1;
  const fromIdx = Math.max(0, years.indexOf(fromYear));
  const toIdx = Math.max(0, years.indexOf(toYear));

  const pct = (idx: number) => maxIdx === 0 ? 0 : (idx / maxIdx) * 100;

  const idxFromEvent = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const { left, width } = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
      return Math.round(ratio * maxIdx);
    },
    [maxIdx],
  );

  const handleMouseDown = (thumb: 'from' | 'to') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(thumb);
    const onMove = (ev: MouseEvent) => {
      const idx = idxFromEvent(ev.clientX);
      if (thumb === 'from') onFromChange(years[Math.min(idx, toIdx)]);
      else onToChange(years[Math.max(idx, fromIdx)]);
    };
    const onUp = () => {
      setDragging(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    const idx = idxFromEvent(e.clientX);
    const distFrom = Math.abs(idx - fromIdx);
    const distTo = Math.abs(idx - toIdx);
    if (distFrom <= distTo) onFromChange(years[Math.min(idx, toIdx)]);
    else onToChange(years[Math.max(idx, fromIdx)]);
  };

  const leftPct = pct(fromIdx);
  const rightPct = pct(toIdx);

  return (
    <div className="flex items-end gap-3">
      {/* Label + badge */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">Khoảng năm</span>
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-[#594DA3]/10 px-2 py-0.5 text-xs font-extrabold text-[#594DA3]">{fromYear}</span>
          <span className="text-[10px] font-bold text-[#94A3B8]">—</span>
          <span className="rounded-md bg-[#594DA3]/10 px-2 py-0.5 text-xs font-extrabold text-[#594DA3]">{toYear}</span>
        </div>
      </div>

      {/* Slider */}
      <div className="flex min-w-[180px] flex-col gap-1 pb-0.5">
        {/* Track */}
        <div
          ref={trackRef}
          className="relative h-1.5 cursor-pointer rounded-full bg-slate-200"
          onClick={handleTrackClick}
        >
          <div
            className="pointer-events-none absolute h-full rounded-full bg-gradient-to-r from-[#594DA3] to-[#AD88F1]"
            style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
          />
          {/* FROM thumb */}
          <button
            type="button"
            aria-label={`Từ năm ${fromYear}`}
            onMouseDown={handleMouseDown('from')}
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#594DA3] bg-white shadow focus:outline-none transition-transform ${dragging === 'from' ? 'scale-125' : 'hover:scale-110'}`}
            style={{ left: `${leftPct}%` }}
          />
          {/* TO thumb */}
          <button
            type="button"
            aria-label={`Đến năm ${toYear}`}
            onMouseDown={handleMouseDown('to')}
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#AD88F1] bg-white shadow focus:outline-none transition-transform ${dragging === 'to' ? 'scale-125' : 'hover:scale-110'}`}
            style={{ left: `${rightPct}%` }}
          />
        </div>
        {/* Tick labels */}
        <div className="flex items-center justify-between">
          {years.map((y, i) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                const di = Math.abs(i - fromIdx);
                const dj = Math.abs(i - toIdx);
                if (di <= dj) onFromChange(years[Math.min(i, toIdx)]);
                else onToChange(years[Math.max(i, fromIdx)]);
              }}
              className={`text-[9px] font-bold transition-colors leading-none ${i >= fromIdx && i <= toIdx ? 'text-[#594DA3]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
