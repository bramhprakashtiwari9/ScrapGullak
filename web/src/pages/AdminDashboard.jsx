import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, ClipboardList, RefreshCw, Truck, Warehouse } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { adminApi } from '../services/api';
import MetricsStrip from '../components/admin/MetricsStrip';
import RateMarginController from '../components/admin/RateMarginController';
import DispatchBoard from '../components/admin/DispatchBoard';
import YardTracker from '../components/admin/YardTracker';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import { formatDate, formatKg } from '../utils/format';

const TABS = [
  { id: 'rates', label: 'Rates & margins', icon: BarChart3 },
  { id: 'dispatch', label: 'Dispatch board', icon: ClipboardList },
  { id: 'yard', label: 'Yard & baling', icon: Warehouse },
];

function AdminConsole() {
  const { refreshRates, notify } = useApp();
  const [tab, setTab] = useState('rates');
  const [data, setData] = useState({ metrics: null, pickups: [], agents: [], inventory: [], rates: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [metrics, pickups, agents, inventory, rates] = await Promise.all([
        adminApi.metrics(), adminApi.pickups(), adminApi.agents(), adminApi.inventory(), adminApi.rates(),
      ]);
      setData({ metrics, pickups, agents, inventory, rates });
    } catch (e) {
      setError(e.message || 'Could not load the yard dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const afterRateSave = async () => { await Promise.all([refreshRates(), load()]); };
  const alerts = data.metrics?.truckAlerts || [];
  const readyAlerts = alerts.filter((a) => a.ready);
  const counts = { dispatch: data.metrics?.unassignedPickups ?? data.pickups.filter((p) => p.status === 'BOOKED').length, yard: readyAlerts.length };

  if (loading) return <Spinner label="Loading yard dashboard…" />;
  if (error) return <EmptyState icon={AlertTriangle} title="Dashboard did not load" action={<button type="button" className="btn-outline" onClick={load}>Try again</button>}>{error}</EmptyState>;

  return (
    <>
      <MetricsStrip metrics={data.metrics} />

      {alerts.length > 0 && (
        <div className="mt-4 rounded-2xl border border-gullak/40 bg-gullak-soft p-4">
          <p className="flex items-center gap-2 font-semibold text-gullak-dark"><Truck className="h-4 w-4" /> Truck-load readiness</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {alerts.map((a) => (
              <li key={a.categoryId}>
                <button type="button" onClick={() => setTab('yard')} className={`badge py-1 text-[13px] ${a.ready ? 'bg-gullak text-white' : 'bg-white text-coin-dark'}`}>
                  {a.categoryName}: {a.ready ? 'ready to dispatch' : `${a.readinessPercent}%`} ({formatKg(a.baledKg)})
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex items-end gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Admin sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === id ? 'border-gullak text-trust' : 'border-transparent text-slate-500 hover:text-trust'}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
            {counts[id] > 0 && <span className={`rounded-full px-1.5 text-xs ${id === 'yard' ? 'bg-gullak text-white' : 'bg-coin text-trust'}`}>{counts[id]}</span>}
          </button>
        ))}
        <button type="button" onClick={load} className="btn-ghost mb-1 ml-auto shrink-0 px-3 py-1.5 text-xs" aria-label="Refresh dashboard data">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div id={`panel-${tab}`} role="tabpanel" className="mt-6">
        {tab === 'rates' && <RateMarginController rates={data.rates} onSaved={afterRateSave} notify={notify} />}
        {tab === 'dispatch' && <DispatchBoard pickups={data.pickups} agents={data.agents} onChanged={load} notify={notify} />}
        {tab === 'yard' && <YardTracker inventory={data.inventory} onChanged={load} notify={notify} />}
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const { session } = useApp();
  const isAdmin = session?.role === 'ADMIN' || session?.user?.role === 'ADMIN';

  return (
    <div className="container-page py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Phase-2 yard, {formatDate(new Date())}</p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">Yard profit dashboard</h1>
        </div>
      </header>
      {isAdmin ? <AdminConsole key={session?.token} /> : (
        <EmptyState icon={Warehouse} title="This dashboard is for ScrapGullak yard staff"
          action={<a className="btn-primary" href="/login">Sign in as staff</a>}>
          Sign in with an administrator account to edit rates, dispatch agents and track baling.
        </EmptyState>
      )}
    </div>
  );
}
