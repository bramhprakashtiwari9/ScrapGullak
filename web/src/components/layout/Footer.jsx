import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL, IS_PUBLIC_DEMO } from '../../services/api';
import GullakMark from '../ui/GullakMark';

export default function Footer() {
  const { resetDemo } = useApp();
  return (
    <footer className="mt-16 bg-trust text-slate-300">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <GullakMark />
            <span className="font-display text-xl font-extrabold text-white">ScrapGullak</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
            Kachre ko nahi, apni ScrapGullak ko bharein. Doorstep and industrial scrap pickup across Noida and Greater Noida, weighed digitally and paid on the spot.
          </p>
          <p className="mt-4 text-sm text-slate-400">Yard: Plot C-21, Phase-2, Noida 201305</p>
        </div>
        <div>
          <h3 className="font-display text-sm font-bold text-white">Sell your scrap</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/" state={{ scrollTo: 'book' }} className="hover:text-white">Book a doorstep pickup</Link></li>
            <li><Link to="/rates" className="hover:text-white">Today’s Noida rates</Link></li>
            <li><Link to="/passbook" className="hover:text-white">My Gullak passbook</Link></li>
            <li><Link to="/b2b" className="hover:text-white">Factory & IT park pickups</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-sm font-bold text-white">Talk to us</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="tel:+911204567890" className="hover:text-white">+91 120 456 7890</a></li>
            <li><a href="mailto:hello@scrapgullak.in" className="hover:text-white">hello@scrapgullak.in</a></li>
            <li className="text-slate-400">Pickups 8 AM – 8 PM, all days</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ScrapGullak Recycling.{!IS_PUBLIC_DEMO && ` API: ${API_BASE_URL}`}</span>
          {IS_PUBLIC_DEMO && <button type="button" onClick={resetDemo} className="inline-flex items-center gap-1.5 self-start text-slate-400 hover:text-white">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset demo data
          </button>}
        </div>
      </div>
    </footer>
  );
}
