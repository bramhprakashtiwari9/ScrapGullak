import { useState } from 'react';
import { useApp } from '../context/AppContext';
import RateGrid from '../components/rates/RateGrid';
import GullakCalculator, { newLine } from '../components/rates/GullakCalculator';
import { formatDate } from '../utils/format';

export default function RatesPage() {
  const { rates, ratesLoading, notify } = useApp();
  const [lines, setLines] = useState([]);

  const addToEstimate = (cat) => {
    if (lines.some((l) => l.categoryId === String(cat.id))) {
      notify(`${cat.name} is already in your estimate. Change its weight there.`);
      return;
    }
    setLines((ls) => [...ls, newLine(cat.id, 1)]);
    notify(`${cat.name} added to your estimate.`);
  };

  return (
    <div className="container-page py-10">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Today’s Noida buying rates</h1>
        <p className="mt-3 text-lg text-slate-600">
          What we pay at your doorstep on {formatDate(new Date())}. Rates move with the mill market and are refreshed every morning at our Phase-2 yard.
        </p>
      </header>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_400px]">
        <RateGrid rates={rates} loading={ratesLoading} onAdd={addToEstimate} />
        <div className="lg:sticky lg:top-32 lg:self-start">
          <GullakCalculator lines={lines} onChange={setLines} />
          {!lines.length && <p className="mt-3 text-sm text-slate-500">Use “Add to estimate” on any grade, or add items directly above.</p>}
        </div>
      </div>
    </div>
  );
}
