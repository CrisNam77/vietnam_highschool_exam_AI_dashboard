export interface HeatmapRow {
  label: string;
  values: Record<string, number>;
}

function cellColor(value: number, min: number, max: number, danger = false) {
  const ratio = (value - min) / (max - min || 1);
  if (danger) {
    return `rgba(248, 113, 113, ${0.14 + ratio * 0.52})`;
  }
  return `rgba(130, 106, 202, ${0.12 + ratio * 0.58})`;
}

export function HeatmapTable({
  columns,
  rows,
  danger = false,
}: {
  columns: string[];
  rows: HeatmapRow[];
  danger?: boolean;
}) {
  const values = rows.flatMap(row => columns.map(column => row.values[column] ?? 0));
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#F5F7FB] text-left text-xs font-extrabold uppercase tracking-[0.12em] text-[#64748B]">
              <th className="px-4 py-3">Nhóm</th>
              {columns.map(column => (
                <th key={column} className="px-3 py-3 text-center">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-t border-slate-100">
                <th className="whitespace-nowrap px-4 py-3 text-left font-bold text-[#0F172A]">{row.label}</th>
                {columns.map(column => {
                  const value = row.values[column] ?? 0;
                  return (
                    <td key={column} className="px-3 py-2 text-center">
                      <span
                        className="inline-flex min-w-14 justify-center rounded-lg px-2 py-1 text-xs font-extrabold text-[#0F172A]"
                        style={{ background: cellColor(value, min, max, danger) }}
                      >
                        {value.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
