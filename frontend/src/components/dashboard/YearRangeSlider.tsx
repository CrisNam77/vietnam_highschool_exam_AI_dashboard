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
  const pct = (idx: number) => (maxIdx === 0 ? 0 : (idx / maxIdx) * 100);

  const idxFromEvent = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const { left, width } = track.getBoundingClientRect();
      return Math.round(Math.min(1, Math.max(0, (clientX - left) / width)) * maxIdx);
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
    <div className="flex min-w-[230px] flex-1 flex-col">
      {/* Label row — matches DashboardSelect label style */}
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">
        Khoảng năm
      </span>

      {/* Control row — same height as select button (py-2.5) */}
      <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-[#F5F7FB] px-3.5 py-2.5 transition hover:border-[#AD88F1] hover:bg-white">
        {/* From badge */}
        <span className="shrink-0 text-sm font-bold text-[#594DA3]">{fromYear}</span>

        {/* Slider area */}
        <div className="flex flex-1 flex-col justify-center gap-1.5 px-1">
          {/* Track */}
          <div
            ref={trackRef}
            className="relative h-1.5 cursor-pointer rounded-full bg-slate-200"
            onClick={handleTrackClick}
          >
            {/* Active fill */}
            <div
              className="pointer-events-none absolute h-full rounded-full bg-gradient-to-r from-[#594DA3] to-[#AD88F1]"
              style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
            />
            {/* FROM thumb */}
            <button
              type="button"
              aria-label={`Từ năm ${fromYear}`}
              onMouseDown={handleMouseDown('from')}
              className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#594DA3] bg-white shadow transition-transform focus:outline-none ${dragging === 'from' ? 'scale-125' : 'hover:scale-110'}`}
              style={{ left: `${leftPct}%` }}
            />
            {/* TO thumb */}
            <button
              type="button"
              aria-label={`Đến năm ${toYear}`}
              onMouseDown={handleMouseDown('to')}
              className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#AD88F1] bg-white shadow transition-transform focus:outline-none ${dragging === 'to' ? 'scale-125' : 'hover:scale-110'}`}
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
                className={`text-[9px] font-bold leading-none transition-colors ${i >= fromIdx && i <= toIdx ? 'text-[#594DA3]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* To badge */}
        <span className="shrink-0 text-sm font-bold text-[#AD88F1]">{toYear}</span>
      </div>
    </div>
  );
}
