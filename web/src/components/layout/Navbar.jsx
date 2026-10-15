import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Factory, Home, LogOut, Loader2, Menu, Truck, Warehouse, X } from 'lucide-react';
import { useApp, VIEWS } from '../../context/AppContext';
import { IS_PUBLIC_DEMO, isMockToken } from '../../services/api';
import GullakMark from '../ui/GullakMark';

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
  agent: [
    { to: '/agent', label: 'Pickup route' },
    { to: '/rates', label: 'Public rate card' },
  ],
};

const VIEW_ICONS = { customer: Home, b2b: Factory, admin: Warehouse, agent: Truck };

function ConnectionPill() {
  const { connectionMode, session } = useApp();
  const demo = IS_PUBLIC_DEMO || isMockToken(session?.token);
  const label = demo ? 'Demo data' : connectionMode === 'offline' ? 'Offline' : connectionMode === 'online' ? 'Live API' : 'Connecting';
  const dot = demo ? 'bg-coin' : connectionMode === 'online' ? 'bg-gullak' : 'bg-slate-400';
  const title = demo
    ? 'The backend is not reachable, so the app is running on built-in sample data. Everything still works.'
    : connectionMode === 'offline' ? 'The API is unreachable. Live account data is not being replaced with sample data.' : 'Connected to the ScrapGullak Spring Boot API.';
  return (
    <span title={title} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </span>
  );
}

export default function Navbar() {
  const { view, switchView, switching, session, logout } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const activeView = IS_PUBLIC_DEMO ? view : session?.role === 'ADMIN' ? 'admin' : session?.role === 'AGENT' ? 'agent' : 'customer';
  const links = LINKS[activeView];
  const user = session?.user;
  const publicDemo = IS_PUBLIC_DEMO;

  return (
    <header className="sticky top-0 z-40">
      {publicDemo && (
        <div role="note" className="bg-coin-soft px-4 py-2 text-center text-xs font-semibold text-coin-dark sm:text-sm">
          Public demo — bookings and payments are simulated; no real pickups are dispatched.
        </div>
      )}
      {publicDemo && <div className="bg-trust text-white">
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
      }

      {/* Main nav */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to={VIEWS[activeView].home} className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
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
            {!user && !publicDemo && <Link to="/login" className="btn-outline">Sign in</Link>}
            {user && !publicDemo && (
              <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }} className="btn-ghost hidden items-center gap-1 px-2 sm:inline-flex" aria-label="Sign out">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            )}
            {activeView === 'customer' && (
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
              {user && !publicDemo && (
                <div className="mt-2 border-t border-slate-100 px-3 pt-3">
                  <p className="mb-2 text-sm font-semibold text-trust">{user.companyName || user.fullName}</p>
                  <button type="button" onClick={() => { logout(); setOpen(false); navigate('/login', { replace: true }); }}
                    className="flex w-full items-center gap-2 rounded-lg py-2 text-left text-sm font-semibold text-slate-600">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
