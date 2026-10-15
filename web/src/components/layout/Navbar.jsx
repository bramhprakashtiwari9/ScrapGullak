import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Factory, Home, Loader2, Menu, Warehouse, X } from 'lucide-react';
import { useApp, VIEWS } from '../../context/AppContext';
import { isMockToken } from '../../services/api';
import GullakMark from '../ui/GullakMark';

const VIEW_ICONS = { customer: Home, b2b: Factory, admin: Warehouse };

const LINKS = {
  customer: [
    { to: '/', label: 'Book pickup', end: true },
    { to: '/rates', label: 'Live rates' },
    { to: '/passbook', label: 'My passbook' },
    { to: '/b2b', label: 'For businesses' },
  ],
  b2b: [
    { to: '/b2b', label: 'Corporate portal' },
    { to: '/rates', label: 'Live rates' },
    { to: '/passbook', label: 'Lifts & receipts' },
  ],
  admin: [
    { to: '/admin', label: 'Yard dashboard' },
    { to: '/rates', label: 'Public rate card' },
  ],
};

function ConnectionPill() {
  const { connectionMode, session } = useApp();
  const demo = isMockToken(session?.token) || connectionMode === 'offline';
  const label = demo ? 'Demo data' : connectionMode === 'online' ? 'Live API' : 'Connecting';
  const dot = demo ? 'bg-coin' : connectionMode === 'online' ? 'bg-gullak' : 'bg-slate-400';
  const title = demo
    ? 'The backend is not reachable, so the app is running on built-in sample data. Everything still works.'
    : 'Connected to the ScrapGullak Spring Boot API.';
  return (
    <span title={title} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </span>
  );
}

export default function Navbar() {
  const { view, switchView, switching, session } = useApp();
  const [open, setOpen] = useState(false);
  const links = LINKS[view];
  const user = session?.user;
  const publicDemo = import.meta.env.VITE_PUBLIC_DEMO === 'true';

  return (
    <header className="sticky top-0 z-40">
      {publicDemo && (
        <div role="note" className="bg-coin-soft px-4 py-2 text-center text-xs font-semibold text-coin-dark sm:text-sm">
          Public demo — bookings and payments are simulated; no real pickups are dispatched.
        </div>
      )}
      {/* Demo role switcher */}
      <div className="bg-trust text-white">
        <div className="container-page flex items-center justify-between gap-2 py-2">
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 sm:inline">Demo view</span>
            <div role="tablist" aria-label="Demo role switcher" className="flex rounded-lg bg-white/10 p-0.5">
              {Object.entries(VIEWS).map(([id, v]) => {
                const Icon = VIEW_ICONS[id];
                const active = view === id;
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={active}
                    disabled={switching}
                    onClick={() => !active && switchView(id)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold sm:px-2.5 transition-colors sm:text-[13px] ${active ? 'bg-gullak text-white' : 'text-slate-300 hover:text-white'}`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {v.label}
                  </button>
                );
              })}
            </div>
            {switching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label="Switching view" />}
          </div>
          <ConnectionPill />
        </div>
      </div>

      {/* Main nav */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to={VIEWS[view].home} className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <GullakMark />
            <span className="font-display text-xl font-extrabold tracking-tight text-trust">
              Scrap<span className="text-gullak">Gullak</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-gullak-soft text-gullak-dark' : 'text-slate-600 hover:text-trust'}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 lg:flex">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-coin-soft text-xs font-bold text-coin-dark">
                  {(user.fullName || '?').split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </span>
                <span className="text-sm font-medium text-trust">{user.companyName || user.fullName}</span>
              </div>
            )}
            {view !== 'admin' && (
              <Link to="/" state={{ scrollTo: 'book' }} className="btn-primary hidden sm:inline-flex">Book pickup</Link>
            )}
            <button className="btn-ghost px-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-slate-100 bg-white md:hidden" aria-label="Mobile">
            <div className="container-page flex flex-col py-2">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}
                  className={({ isActive }) => `rounded-lg px-3 py-2.5 text-[15px] font-semibold ${isActive ? 'bg-gullak-soft text-gullak-dark' : 'text-slate-700'}`}>
                  {l.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
