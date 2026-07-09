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

  const startDrag = (thumb: 'from' | 'to') => (e: React.MouseEvent) => {
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

  return (
    <div className="flex flex-col">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">
        Khoảng năm
      </span>
      <div className="mt-1 flex w-[260px] items-center gap-2 rounded-2xl border border-slate-200 bg-[#F5F7FB] px-3 py-2.5 transition hover:border-[#AD88F1] hover:bg-white">
        {/* FROM year */}
        <span className="w-9 shrink-0 text-center text-xs font-extrabold text-[#594DA3]">{fromYear}</span>

        {/* Track */}
        <div
          ref={trackRef}
          className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-slate-200"
          onClick={handleTrackClick}
        >
          <div
            className="pointer-events-none absolute h-full rounded-full bg-gradient-to-r from-[#594DA3] to-[#AD88F1]"
            style={{ left: `${pct(fromIdx)}%`, right: `${100 - pct(toIdx)}%` }}
          />
          <button
            type="button"
            aria-label={`Từ năm ${fromYear}`}
            onMouseDown={startDrag('from')}
            className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#594DA3] bg-white shadow focus:outline-none transition-transform ${dragging === 'from' ? 'scale-125' : 'hover:scale-110'}`}
            style={{ left: `${pct(fromIdx)}%` }}
          />
          <button
            type="button"
            aria-label={`Đến năm ${toYear}`}
            onMouseDown={startDrag('to')}
            className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#AD88F1] bg-white shadow focus:outline-none transition-transform ${dragging === 'to' ? 'scale-125' : 'hover:scale-110'}`}
            style={{ left: `${pct(toIdx)}%` }}
          />
        </div>

        {/* TO year */}
        <span className="w-9 shrink-0 text-center text-xs font-extrabold text-[#AD88F1]">{toYear}</span>
      </div>
    </div>
  );
}
