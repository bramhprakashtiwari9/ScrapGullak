import { useMemo, useState } from 'react';
import { Building2, Home, Loader2, MapPin, Phone, UserRound } from 'lucide-react';
import { adminApi } from '../../services/api';
import { GROUP_LABEL } from '../../utils/constants';
import { formatDay, formatINR, formatKg } from '../../utils/format';
import StatusBadge from '../ui/StatusBadge';

const COLUMNS = [
  { id: 'new', title: 'New bookings', statuses: ['BOOKED'], empty: 'No unassigned bookings. New requests land here.' },
  { id: 'route', title: 'Assigned and on route', statuses: ['AGENT_ASSIGNED', 'OUT_FOR_PICKUP'], empty: 'Assign a booking to send an agent.' },
  { id: 'done', title: 'Weighed and paid', statuses: ['WEIGHED', 'PAID'], empty: 'Completed pickups appear here.' },
];

function PickupCard({ p, agents, onAssign, busy }) {
  const [agentId, setAgentId] = useState(p.assignedAgent?.id ? String(p.assignedAgent.id) : '');
  const closed = ['PAID', 'CANCELLED', 'WEIGHED'].includes(p.status);
  const B2B = p.orderType === 'INDUSTRIAL_B2B';
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400">#{p.orderNumber}</p>
          <p className="truncate font-semibold text-trust">{p.customer?.fullName}</p>
        </div>
        <span className={`badge shrink-0 ${B2B ? 'bg-trust text-white' : 'bg-gullak-soft text-gullak-dark'}`}>
          {B2B ? <Building2 className="h-3 w-3" /> : <Home className="h-3 w-3" />}{B2B ? 'B2B' : 'B2C'}
        </span>
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />{p.fullAddress}, {p.noidaSector}</p>
      <p className="mt-1 text-sm text-slate-600">{formatDay(p.scheduledDate)}, {p.timeSlot} · {p.estimatedWeightRange}</p>
      {!!p.scrapGroups?.length && (
        <div className="mt-2 flex flex-wrap gap-1">
          {p.scrapGroups.map((g) => <span key={g} className="badge bg-slate-100 text-slate-600">{GROUP_LABEL[g] || g}</span>)}
        </div>
      )}
      {p.photoUrl && <img src={p.photoUrl} alt={`Scrap photo for ${p.orderNumber}`} className="mt-2 h-20 w-full rounded-lg object-cover" />}

      {closed ? (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
          <StatusBadge status={p.status} />
          <span className="font-semibold text-trust tabular">{formatKg(p.finalTotalWeightKg)} · {formatINR(p.finalPayoutInr)}</span>
        </div>
      ) : (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <StatusBadge status={p.status} />
            <a href={`tel:${p.customer?.phone}`} className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-trust"><Phone className="h-3 w-3" />{p.customer?.phone}</a>
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor={`agent-${p.id}`}>Field agent for {p.orderNumber}</label>
            <select id={`agent-${p.id}`} className="field flex-1 py-1.5 text-sm" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">Choose agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.fullName} ({a.noidaSector}, {a.activePickups ?? 0} open)</option>
              ))}
            </select>
            <button type="button" className="btn-dark px-3 py-1.5 text-xs" disabled={!agentId || busy || String(p.assignedAgent?.id) === agentId}
              onClick={() => onAssign(p, agentId)}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserRound className="h-3.5 w-3.5" />}
              {p.assignedAgent ? 'Reassign' : 'Assign'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function DispatchBoard({ pickups, agents, onChanged, notify }) {
  const [sector, setSector] = useState('ALL');
  const [busyId, setBusyId] = useState(null);

  const sectors = useMemo(() => {
    const counts = {};
    pickups.filter((p) => p.status !== 'CANCELLED').forEach((p) => { counts[p.noidaSector] = (counts[p.noidaSector] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));
  }, [pickups]);

  const visible = pickups.filter((p) => sector === 'ALL' || p.noidaSector === sector);

  const assign = async (p, agentId) => {
    setBusyId(p.id);
    try {
      const updated = await adminApi.assignAgent(p.id, agentId);
      notify(`${updated.orderNumber} assigned to ${updated.assignedAgent?.fullName}.`);
      await onChanged();
    } catch (e) { notify(e.message, 'error'); } finally { setBusyId(null); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by sector">
        <button type="button" aria-pressed={sector === 'ALL'} className={sector === 'ALL' ? 'chip-on' : 'chip-off'} onClick={() => setSector('ALL')}>All sectors</button>
        {sectors.map(([s, n]) => (
          <button key={s} type="button" aria-pressed={sector === s} className={sector === s ? 'chip-on' : 'chip-off'} onClick={() => setSector(s)}>
            {s} <span className="text-xs opacity-70">{n}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          let list = visible.filter((p) => col.statuses.includes(p.status));
          if (col.id === 'done') list = list.sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0)).slice(0, 8);
          else list = list.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.noidaSector.localeCompare(b.noidaSector, 'en', { numeric: true }));
          return (
            <section key={col.id} className="rounded-2xl bg-slate-100/80 p-3" aria-labelledby={`col-${col.id}`}>
              <h3 id={`col-${col.id}`} className="flex items-center justify-between px-1 pb-3 text-sm font-bold">
                {col.title}<span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{list.length}</span>
              </h3>
              {list.length ? (
                <ul className="space-y-2.5">
                  {list.map((p) => <PickupCard key={p.id} p={p} agents={agents} onAssign={assign} busy={busyId === p.id} />)}
                </ul>
              ) : <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">{col.empty}</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
