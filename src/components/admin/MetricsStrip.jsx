import { IndianRupee, Scale, TrendingUp, Truck } from 'lucide-react';
import { formatINR, formatKg } from '../../utils/format';

export default function MetricsStrip({ metrics }) {
  const m = metrics || {};
  const positive = (m.netProfitMarginInr ?? 0) >= 0;
  const tiles = [
    { icon: IndianRupee, label: 'Procurement cost today', value: formatINR(m.todayProcurementCostInr), note: `${m.todayCompletedPickups ?? 0} pickups paid out` },
    { icon: Truck, label: 'Projected mill resale', value: formatINR(m.projectedMillResaleInr), note: 'At today’s mill selling rates' },
    { icon: TrendingUp, label: 'Net margin', value: formatINR(m.netProfitMarginInr), note: `${m.marginPercent ?? 0}% of resale value`, tone: positive ? 'text-gullak-dark' : 'text-rose-600' },
    { icon: Scale, label: 'Collected today', value: formatKg(m.todayCollectedKg), note: `${m.pendingPickups ?? 0} pickups still open` },
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map(({ icon: Icon, label, value, note, tone }) => (
        <div key={label} className="bg-white p-5">
          <p className="flex items-center gap-2 text-sm text-slate-500"><Icon className="h-4 w-4" aria-hidden="true" />{label}</p>
          <p className={`mt-2 font-display text-[28px] font-extrabold leading-none tabular ${tone || 'text-trust'}`}>{value}</p>
          <p className="mt-2 text-xs text-slate-500">{note}</p>
        </div>
      ))}
    </div>
  );
}
