import { useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { adminApi } from '../../services/api';
import { GROUP_LABEL, GROUP_TONE, groupOfCategory } from '../../utils/constants';
import { formatINR, formatTime, round2 } from '../../utils/format';
import CategoryIcon from '../ui/CategoryIcon';

function marginOf(buy, mill) {
  const b = Number(buy); const m = Number(mill);
  if (!(b > 0) || !(m > 0)) return { perKg: 0, pct: 0 };
  return { perKg: round2(m - b), pct: round2(((m - b) / m) * 100) };
}

const marginTone = (pct) => (pct < 0 ? 'text-rose-600' : pct < 12 ? 'text-coin-dark' : 'text-gullak-dark');

export default function RateMarginController({ rates, onSaved, notify }) {
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null); // id | 'all'

  const rows = useMemo(() => rates.map((r) => {
    const d = drafts[r.id];
    const buy = d?.buy ?? String(r.buyingRateInr);
    const mill = d?.mill ?? String(r.millSellingRateInr);
    const dirty = d && (Number(buy) !== Number(r.buyingRateInr) || Number(mill) !== Number(r.millSellingRateInr));
    return { r, buy, mill, dirty, margin: marginOf(buy, mill) };
  }), [rates, drafts]);

  const dirtyRows = rows.filter((x) => x.dirty);
  const avgPct = rows.length ? round2(rows.reduce((s, x) => s + x.margin.pct, 0) / rows.length) : 0;
  const thinnest = [...rows].sort((a, b) => a.margin.pct - b.margin.pct)[0];

  const setDraft = (id, patch) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const saveRow = async ({ r, buy, mill }) => {
    if (!(Number(buy) > 0) || !(Number(mill) > 0)) { notify(`Enter both rates for ${r.name}.`, 'error'); return false; }
    await adminApi.updateRate(r.id, { buyingRateInr: Number(buy), millSellingRateInr: Number(mill) });
    setDrafts((d) => { const n = { ...d }; delete n[r.id]; return n; });
    return true;
  };

  const save = async (row) => {
    setSaving(row.r.id);
    try {
      if (await saveRow(row)) { notify(`${row.r.name} rate saved.`); await onSaved(); }
    } catch (e) { notify(e.message, 'error'); } finally { setSaving(null); }
  };

  const saveAll = async () => {
    setSaving('all');
    try {
      let n = 0;
      for (const row of dirtyRows) { if (await saveRow(row)) n += 1; }
      notify(`${n} rate${n === 1 ? '' : 's'} saved. The public rate card now shows them.`);
      await onSaved();
    } catch (e) { notify(e.message, 'error'); } finally { setSaving(null); }
  };

  return (
    <div className="card">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Daily rate and margin controller</h2>
          <p className="text-sm text-slate-500">
            Average margin <span className={`font-semibold ${marginTone(avgPct)}`}>{avgPct}%</span>
            {thinnest && <> · thinnest on {thinnest.r.name} at <span className={`font-semibold ${marginTone(thinnest.margin.pct)}`}>{thinnest.margin.pct}%</span></>}
          </p>
        </div>
        <button type="button" className="btn-primary" disabled={!dirtyRows.length || saving === 'all'} onClick={saveAll}>
          {saving === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {dirtyRows.length || ''} change{dirtyRows.length === 1 ? '' : 's'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-5 py-3 font-medium">Scrap grade</th>
              <th className="px-3 py-3 font-medium">Customer buying rate (₹/kg)</th>
              <th className="px-3 py-3 font-medium">Mill selling rate (₹/kg)</th>
              <th className="px-3 py-3 text-right font-medium">Margin / kg</th>
              <th className="px-3 py-3 text-right font-medium">Margin %</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { r, buy, mill, dirty, margin } = row;
              const g = groupOfCategory(r);
              return (
                <tr key={r.id} className={`border-b border-slate-100 ${dirty ? 'bg-coin-soft/40' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${GROUP_TONE[g]}`}><CategoryIcon iconName={r.iconName} group={g} className="h-4 w-4" /></span>
                      <div>
                        <p className="font-semibold text-trust">{r.name}</p>
                        <p className="text-xs text-slate-400">{GROUP_LABEL[r.categoryGroup]} · updated {formatTime(r.updatedAt)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <label className="sr-only" htmlFor={`buy-${r.id}`}>Buying rate for {r.name}</label>
                    <input id={`buy-${r.id}`} type="number" min="0" step="0.5" className="field w-28 py-1.5 text-right tabular" value={buy} onChange={(e) => setDraft(r.id, { buy: e.target.value })} />
                  </td>
                  <td className="px-3 py-3">
                    <label className="sr-only" htmlFor={`mill-${r.id}`}>Mill selling rate for {r.name}</label>
                    <input id={`mill-${r.id}`} type="number" min="0" step="0.5" className="field w-28 py-1.5 text-right tabular" value={mill} onChange={(e) => setDraft(r.id, { mill: e.target.value })} />
                  </td>
                  <td className={`px-3 py-3 text-right font-semibold tabular ${marginTone(margin.pct)}`}>{formatINR(margin.perKg, true)}</td>
                  <td className={`px-3 py-3 text-right font-semibold tabular ${marginTone(margin.pct)}`}>{margin.pct}%</td>
                  <td className="px-5 py-3 text-right">
                    <button type="button" className="btn-outline px-3 py-1.5 text-xs" disabled={!dirty || saving === r.id} onClick={() => save(row)}>
                      {saving === r.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
