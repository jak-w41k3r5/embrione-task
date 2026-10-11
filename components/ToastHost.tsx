'use client';

import { useEffect, useState } from 'react';
import type { ToastType } from '@/lib/toast';

type Item = { id: number; type: ToastType; message: string };

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-400/40 bg-emerald-950/90 text-emerald-100',
  error: 'border-rose-400/40 bg-rose-950/90 text-rose-100',
  info: 'border-indigo-400/40 bg-indigo-950/90 text-indigo-100',
};

const ICONS: Record<ToastType, string> = { success: '✓', error: '!', info: 'i' };

export default function ToastHost() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let counter = 0;

    function onToast(e: Event) {
      const { type, message } = (e as CustomEvent<{ type: ToastType; message: string }>).detail;
      const id = ++counter;
      setItems((cur) => [...cur.slice(-3), { id, type, message }]);
      window.setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4500);
    }

    window.addEventListener('embrione:toast', onToast);
    return () => window.removeEventListener('embrione:toast', onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-md animate-toast-in items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl shadow-black/40 backdrop-blur ${STYLES[t.type]}`}
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
            {ICONS[t.type]}
          </span>
          <span className="break-words">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
