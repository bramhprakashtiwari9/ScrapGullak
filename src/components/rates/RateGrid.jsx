import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { CATEGORY_GROUPS, GROUP_LABEL, GROUP_TONE, groupOfCategory } from '../../utils/constants';
import { formatRate, formatTime } from '../../utils/format';
import CategoryIcon from '../ui/CategoryIcon';
import Spinner from '../ui/Spinner';

export default function RateGrid({ rates, loading, onAdd }) {
  const [group, setGroup] = useState('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => rates.filter((r) => {
    if (group !== 'ALL' && r.categoryGroup !== group) return false;
    return !query || r.name.toLowerCase().includes(query.toLowerCase());
  }), [rates, group, query]);

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by scrap group">
          {CATEGORY_GROUPS.map((g) => (
            <button key={g.id} type="button" aria-pressed={group === g.id} onClick={() => setGroup(g.id)} className={group === g.id ? 'chip-on' : 'chip-off'}>
              {g.label}
            </button>
          ))}
        </div>
        <label className="relative block lg:w-64">
          <span className="sr-only">Search scrap grades</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="field pl-9" placeholder="Search copper, gatta, AC…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {loading ? <Spinner label="Loading today’s rates…" /> : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const g = groupOfCategory(r);
            return (
              <li key={r.id} className="card flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${GROUP_TONE[g] || GROUP_TONE.MIXED}`}>
                    <CategoryIcon iconName={r.iconName} group={g} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-bold leading-snug">{r.name}</h3>
                    <p className="text-xs text-slate-500">{GROUP_LABEL[r.categoryGroup] || r.categoryGroup}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <p className="font-display text-2xl font-extrabold text-trust tabular">{formatRate(r.buyingRateInr, r.unit)}</p>
                  {onAdd && (
                    <button type="button" onClick={() => onAdd(r)} className="btn-outline px-3 py-1.5 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Add to estimate
                    </button>
                  )}
                </div>
                {r.updatedAt && <p className="mt-2 text-xs text-slate-400">Updated {formatTime(r.updatedAt)}</p>}
              </li>
            );
          })}
          {!filtered.length && <li className="col-span-full py-8 text-center text-sm text-slate-500">No grade matches “{query}”. Try a different word, or pick Mixed day scrap.</li>}
        </ul>
      )}
    </div>
  );
}
