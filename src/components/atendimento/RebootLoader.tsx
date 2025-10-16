import { useEffect, useMemo, useState } from 'react';
import { Loader2, Timer } from 'lucide-react';

interface RebootLoaderProps {
  totalSeconds?: number; // default 60
  startedAt?: number; // epoch ms when reboot started
}

/**
 * RebootLoader - inline status indicator for router reboot flow
 * - Shows spinner + countdown
 * - Uses design tokens and existing animation utilities
 */
export default function RebootLoader({ totalSeconds = 60, startedAt }: RebootLoaderProps) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsRemaining = useMemo(() => {
    if (!startedAt) return totalSeconds;
    const elapsed = Math.floor((now - startedAt) / 1000);
    return Math.max(totalSeconds - elapsed, 0);
  }, [now, startedAt, totalSeconds]);

  const progress = useMemo(() => {
    const spent = totalSeconds - secondsRemaining;
    return Math.min(100, Math.max(0, (spent / totalSeconds) * 100));
  }, [secondsRemaining, totalSeconds]);

  return (
    <div className="w-full flex justify-center mt-2 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <div className="flex flex-col min-w-[240px]">
          <div className="text-sm font-medium text-foreground">Reiniciando seu roteador…</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Timer className="h-3 w-3" />
            {secondsRemaining > 0 ? `Aguarde ~${secondsRemaining}s` : 'Finalizando verificação…'}
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
