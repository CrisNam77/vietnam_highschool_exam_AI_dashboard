import type { ReactNode } from 'react';

export function DashboardShell({
  title,
  question,
  children,
}: {
  title: string;
  question?: string;
  children: ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto bg-[#F5F7FB] px-8 pb-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">{title}</h2>
          {question && <p className="mt-1 max-w-3xl text-sm font-medium text-[#64748B]">{question}</p>}
        </div>
        <span className="rounded-full border border-[#AD88F1]/40 bg-white px-3 py-1 text-xs font-bold text-[#594DA3]">
          Mock UI data
        </span>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}
