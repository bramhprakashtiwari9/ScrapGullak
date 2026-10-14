import { useState } from 'react';
import { AlertTriangle, Loader2, Truck } from 'lucide-react';
import { adminApi } from '../../services/api';
import { baleLabel, groupOfCategory, GROUP_TONE } from '../../utils/constants';
import { formatKg, formatTime } from '../../utils/format';
import CategoryIcon from '../ui/CategoryIcon';

function YardRow({ inv, onProcess, busy }) {
  const raw = inv.rawMixedWeightKg; const seg = inv.segregatedWeightKg; const baled = inv.baledReadyForMillWeightKg;
  const threshold = inv.minTruckDispatchThresholdKg;
  const total = raw + seg + baled || 1;
  const readiness = Math.min(100, Math.round((baled / threshold) * 100));
  const ready = baled >= threshold;
  const [kg, setKg] = useState('');
  const cat = inv.scrapCategory;
  const g = groupOfCategory(cat);
  const amount = Number(kg);

  return (
    <li className={`rounded-2xl border bg-white p-4 ${ready ? 'border-gullak ring-1 ring-gullak/30' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-9 w-9 place-items-center rounded-lg ${GROUP_TONE[g]}`}><CategoryIcon group={g} className="h-4 w-4" /></span>
          <div>
            <p className="font-semibold text-trust">{cat.name}</p>
            <p className="text-xs text-slate-500">{baleLabel(cat.name)} · updated {formatTime(inv.lastUpdated)}</p>
          </div>
        </div>
        {ready ? (
          <span className="badge bg-gullak text-white"><Truck className="h-3.5 w-3.5" /> Ready for direct mill truck dispatch</span>
        ) : readiness >= 75 ? (
          <span className="badge bg-coin-soft text-coin-dark"><AlertTriangle className="h-3.5 w-3.5" /> {readiness}% of a truck load</span>
        ) : null}
      </div>

      {/* Stage split */}
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <span className="bg-slate-400" style={{ width: `${(raw / total) * 100}%` }} />
        <span className="bg-coin" style={{ width: `${(seg / total) * 100}%` }} />
        <span className="bg-gullak" style={{ width: `${(baled / total) * 100}%` }} />
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div><dt className="flex items-center gap-1 text-slate-500"><span className="h-2 w-2 rounded-full bg-slate-400" />Raw mixed</dt><dd className="font-semibold text-trust tabular">{formatKg(raw)}</dd></div>
        <div><dt className="flex items-center gap-1 text-slate-500"><span className="h-2 w-2 rounded-full bg-coin" />Sorted</dt><dd className="font-semibold text-trust tabular">{formatKg(seg)}</dd></div>
        <div><dt className="flex items-center gap-1 text-slate-500"><span className="h-2 w-2 rounded-full bg-gullak" />Baled</dt><dd className="font-semibold text-trust tabular">{formatKg(baled)}</dd></div>
      </dl>

      {/* Truck capacity meter */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-500"><span>Truck load</span><span className="tabular">{formatKg(baled)} of {formatKg(threshold)}</span></div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={readiness} aria-valuemin={0} aria-valuemax={100} aria-label={`${cat.name} truck readiness`}>
          <div className={`h-full rounded-full ${ready ? 'bg-gullak' : readiness >= 75 ? 'bg-coin' : 'bg-slate-400'}`} style={{ width: `${readiness}%` }} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Weight to move for {cat.name}</span>
          <input type="number" min="0" step="1" placeholder="0" value={kg} onChange={(e) => setKg(e.target.value)} className="field w-24 py-1.5 pr-7 text-right text-sm tabular" />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">kg</span>
        </label>
        <button type="button" className="btn-outline px-3 py-1.5 text-xs" disabled={busy || !(amount > 0) || amount > raw} onClick={() => onProcess(cat, 'SEGREGATE', amount, () => setKg(''))}>Sort</button>
        <button type="button" className="btn-outline px-3 py-1.5 text-xs" disabled={busy || !(amount > 0) || amount > seg} onClick={() => onProcess(cat, 'BALE', amount, () => setKg(''))}>Bale for mill</button>
        <button type="button" className="btn-outline px-3 py-1.5 text-xs" disabled={busy} onClick={() => setKg(String(Math.floor(raw || seg)))}>Fill max</button>
        {ready && (
          <button type="button" className="btn-primary ml-auto px-3 py-1.5 text-xs" disabled={busy} onClick={() => onProcess(cat, 'DISPATCH', baled)}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />} Dispatch truck
          </button>
        )}
      </div>
    </li>
  );
}

export default function YardTracker({ inventory, onChanged, notify }) {
  const [busyId, setBusyId] = useState(null);
  const sorted = [...inventory].sort((a, b) =>
    b.baledReadyForMillWeightKg / b.minTruckDispatchThresholdKg - a.baledReadyForMillWeightKg / a.minTruckDispatchThresholdKg);
  const totals = inventory.reduce((t, i) => ({
    raw: t.raw + i.rawMixedWeightKg, seg: t.seg + i.segregatedWeightKg, baled: t.baled + i.baledReadyForMillWeightKg,
  }), { raw: 0, seg: 0, baled: 0 });
  const readyCount = inventory.filter((i) => i.baledReadyForMillWeightKg >= i.minTruckDispatchThresholdKg).length;

  const process = async (cat, stage, weightKg, done) => {
    setBusyId(cat.id);
    try {
      await adminApi.processInventory({ categoryId: cat.id, stage, weightKg });
      const verb = { SEGREGATE: 'sorted', BALE: 'baled', DISPATCH: 'dispatched to the mill' }[stage];
      notify(`${formatKg(weightKg)} of ${cat.name} ${verb}.`);
      done?.();
      await onChanged();
    } catch (e) { notify(e.message, 'error'); } finally { setBusyId(null); }
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="card p-4"><p className="text-sm text-slate-500">Raw mixed on yard</p><p className="font-display text-2xl font-extrabold tabular">{formatKg(totals.raw)}</p></div>
        <div className="card p-4"><p className="text-sm text-slate-500">Sorted, awaiting baling</p><p className="font-display text-2xl font-extrabold tabular">{formatKg(totals.seg)}</p></div>
        <div className="card p-4"><p className="text-sm text-slate-500">Baled and mill-ready</p><p className="font-display text-2xl font-extrabold tabular">{formatKg(totals.baled)}</p></div>
        <div className={`card p-4 ${readyCount ? 'border-gullak bg-gullak-soft' : ''}`}><p className="text-sm text-slate-500">Truck loads ready</p><p className="font-display text-2xl font-extrabold tabular text-gullak-dark">{readyCount}</p></div>
      </div>
      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
        {sorted.map((inv) => <YardRow key={inv.scrapCategory.id} inv={inv} onProcess={process} busy={busyId === inv.scrapCategory.id} />)}
      </ul>
    </div>
  );
}
