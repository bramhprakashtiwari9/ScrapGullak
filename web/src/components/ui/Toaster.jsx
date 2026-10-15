import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Toaster() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex max-w-md animate-toast-in items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${t.tone === 'error' ? 'bg-rose-600 text-white' : 'bg-trust text-white'}`}>
          {t.tone === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gullak" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
