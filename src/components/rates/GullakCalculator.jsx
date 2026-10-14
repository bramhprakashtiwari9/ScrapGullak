import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Leaf, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ratesApi } from '../../services/api';
import { CATEGORY_GROUPS, groupOfCategory } from '../../utils/constants';
import { co2ForKg, formatINR, formatKg, formatRate } from '../../utils/format';

let lineSeq = 0;
export const newLine = (categoryId = '', weightKg = '') => ({ key: `l${Date.now()}-${lineSeq++}`, categoryId: String(categoryId), weightKg: String(weightKg) });

const QUICK_PICKS = [/gatta/i, /newspaper/i, /hms/i, /pet/i];

/**
 * "Fill your Gullak" estimator. Controlled: the parent owns `lines` so other components
 * (e.g. the rate grid) can add rows.
 */
export default function GullakCalculator({ lines, onChange, title = 'Fill your Gullak', showBookCta = true }) {
  const { rates } = useApp();
  const navigate = useNavigate();
  const [server, setServer] = useState(null);

  const byId = useMemo(() => Object.fromEntries(rates.map((r) => [String(r.id), r])), [rates]);
  const valid = lines.filter((l) => byId[l.categoryId] && Number(l.weightKg) > 0);
  const signature = valid.map((l) => `${l.categoryId}:${l.weightKg}`).join('|');

  const localTotal = valid.reduce((s, l) => s + Number(l.weightKg) * Number(byId[l.categoryId].buyingRateInr), 0);
  const totalKg = valid.reduce((s, l) => s + Number(l.weightKg), 0);
  const co2 = valid.reduce((s, l) => s + co2ForKg(l.weightKg, byId[l.categoryId].categoryGroup), 0);

  // Ask the backend for the authoritative estimate (debounced); show the local figure meanwhile.
  useEffect(() => {
    if (!valid.length) { setServer(null); return undefined; }
    const t = setTimeout(async () => {
      try {
        const r = await ratesApi.estimate(valid.map((l) => ({ categoryId: Number(l.categoryId), weightKg: Number(l.weightKg) })));
        setServer({ signature, total: r.totalEstimatedPayoutInr });
      } catch { setServer(null); }
    }, 450);
    return () => clearTimeout(t);
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = server?.signature === signature ? server.total : localTotal;

  const update = (key, patch) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key) => onChange(lines.filter((l) => l.key !== key));
  const add = (categoryId = '') => onChange([...lines, newLine(categoryId, categoryId ? 1 : '')]);

  const quick = QUICK_PICKS.map((rx) => rates.find((r) => rx.test(r.name))).filter(Boolean)
    .filter((r) => !lines.some((l) => l.categoryId === String(r.id)));

  const bookWithItems = () => {
    const groups = [...new Set(valid.map((l) => groupOfCategory(byId[l.categoryId])))];
    navigate('/', { state: { scrollTo: 'book', groups } });
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-5">
        <h2 className="text-xl font-extrabold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">Add what is lying in your storeroom. Final payout depends on the weight on our digital scale.</p>
      </div>

      <ul className="mt-4 space-y-2 px-5">
        {lines.map((l) => {
          const cat = byId[l.categoryId];
          const sub = cat && Number(l.weightKg) > 0 ? Number(l.weightKg) * Number(cat.buyingRateInr) : 0;
          return (
            <li key={l.key} className="grid grid-cols-[1fr_88px_auto] items-center gap-2 rounded-xl bg-paper p-2 sm:grid-cols-[1fr_96px_96px_auto]">
              <label className="min-w-0">
                <span className="sr-only">Scrap grade</span>
                <select className="field bg-white py-2 text-sm" value={l.categoryId} onChange={(e) => update(l.key, { categoryId: e.target.value })}>
                  <option value="">Choose grade</option>
                  {CATEGORY_GROUPS.filter((g) => g.id !== 'ALL').map((g) => (
                    <optgroup key={g.id} label={g.label}>
                      {rates.filter((r) => r.categoryGroup === g.id).map((r) => (
                        <option key={r.id} value={r.id}>{r.name} · {formatRate(r.buyingRateInr, r.unit)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="relative">
                <span className="sr-only">Weight in kg</span>
                <input type="number" inputMode="decimal" min="0" step="0.1" className="field bg-white py-2 pr-8 text-right text-sm tabular" placeholder="0"
                  value={l.weightKg} onChange={(e) => update(l.key, { weightKg: e.target.value })} />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">kg</span>
              </label>
              <span className="hidden text-right text-sm font-semibold text-trust tabular sm:block">{sub ? formatINR(sub) : '—'}</span>
              <button type="button" onClick={() => remove(l.key)} className="btn-ghost px-2" aria-label="Remove item"><Trash2 className="h-4 w-4" /></button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        <button type="button" className="btn-outline px-3 py-1.5 text-xs" onClick={() => add()}><Plus className="h-3.5 w-3.5" /> Add item</button>
        {quick.slice(0, 3).map((r) => (
          <button key={r.id} type="button" className="chip-off py-1 text-xs" onClick={() => add(r.id)}>+ {r.name.split(' (')[0]}</button>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-4 bg-trust px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-coin text-trust"><Coins className="h-6 w-6" /></span>
          <div>
            <p className="text-sm text-slate-300">Estimated payout</p>
            <p className="font-display text-3xl font-extrabold tabular" aria-live="polite">{formatINR(total)}</p>
            <p className="flex items-center gap-1 text-xs text-slate-400">
              {formatKg(totalKg)} <Leaf className="ml-1 h-3 w-3 text-gullak" /> about {formatKg(co2)} CO₂ avoided
            </p>
          </div>
        </div>
        {showBookCta && (
          <button type="button" className="btn-coin" disabled={!valid.length} onClick={bookWithItems}>Book pickup for these items</button>
        )}
      </div>
    </div>
  );
}
