import { Loader2 } from 'lucide-react';

export default function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-10 text-sm text-slate-500 ${className}`} role="status">
      <Loader2 className="h-5 w-5 animate-spin text-gullak" aria-hidden="true" />
      {label}
    </div>
  );
}
