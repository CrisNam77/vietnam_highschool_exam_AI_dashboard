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

  const minIdx = 0;
  const maxIdx = years.length - 1;
  const fromIdx = years.indexOf(fromYear);
  const toIdx = years.indexOf(toYear);

  const pct = (idx: number) => (idx / maxIdx) * 100;

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

  const handleTrackClick = (e: React.MouseEvent) => {
    const idx = idxFromEvent(e.clientX);
    const distFrom = Math.abs(idx - fromIdx);
    const distTo = Math.abs(idx - toIdx);
    if (distFrom <= distTo) {
      onFromChange(years[Math.min(idx, toIdx)]);
    } else {
      onToChange(years[Math.max(idx, fromIdx)]);
    }
  };

  const handleMouseDown = (thumb: 'from' | 'to') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(thumb);

    const onMove = (moveEvent: MouseEvent) => {
      const idx = idxFromEvent(moveEvent.clientX);
      if (thumb === 'from') {
        onFromChange(years[Math.min(idx, toIdx)]);
      } else {
        onToChange(years[Math.max(idx, fromIdx)]);
      }
    };
    const onUp = () => {
      setDragging(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const leftPct = pct(fromIdx < 0 ? 0 : fromIdx);
  const rightPct = pct(toIdx < 0 ? maxIdx : toIdx);

  return (
    <div className="flex min-w-[260px] flex-1 flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">
        Khoảng năm
      </span>

      {/* Year labels row */}
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-[#594DA3]/10 px-2.5 py-1 text-xs font-extrabold text-[#594DA3]">
          {fromYear}
        </span>
        <span className="text-xs font-bold text-[#94A3B8]">—</span>
        <span className="rounded-lg bg-[#594DA3]/10 px-2.5 py-1 text-xs font-extrabold text-[#594DA3]">
          {toYear}
        </span>
      </div>

      {/* Slider track */}
      <div className="relative py-2">
        <div
          ref={trackRef}
          className="relative h-1.5 cursor-pointer rounded-full bg-slate-200"
          onClick={handleTrackClick}
        >
          {/* Active range fill */}
          <div
            className="pointer-events-none absolute h-full rounded-full bg-gradient-to-r from-[#594DA3] to-[#AD88F1]"
            style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
          />

          {/* FROM thumb */}
          <button
            type="button"
            aria-label={`Từ năm ${fromYear}`}
            className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#594DA3] bg-white shadow-md transition-transform focus:outline-none ${dragging === 'from' ? 'scale-125' : 'hover:scale-110'}`}
            style={{ left: `${leftPct}%` }}
            onMouseDown={handleMouseDown('from')}
          />

          {/* TO thumb */}
          <button
            type="button"
            aria-label={`Đến năm ${toYear}`}
            className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#AD88F1] bg-white shadow-md transition-transform focus:outline-none ${dragging === 'to' ? 'scale-125' : 'hover:scale-110'}`}
            style={{ left: `${rightPct}%` }}
            onMouseDown={handleMouseDown('to')}
          />
        </div>

        {/* Tick marks */}
        <div className="mt-2.5 flex items-center justify-between px-0">
          {years.map((y, i) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                const distFrom = Math.abs(i - fromIdx);
                const distTo = Math.abs(i - toIdx);
                if (distFrom <= distTo) {
                  onFromChange(years[Math.min(i, toIdx)]);
                } else {
                  onToChange(years[Math.max(i, fromIdx)]);
                }
              }}
              className={`text-[10px] font-bold transition-colors ${
                i >= fromIdx && i <= toIdx
                  ? 'text-[#594DA3]'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
