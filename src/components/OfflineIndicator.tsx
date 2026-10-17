import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';
import { useT } from '../i18n';

export const OfflineIndicator: React.FC = () => {
  const t = useT();
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-3 left-4 z-50 flex items-center gap-2 bg-[#120803] border border-amber-600/90 text-amber-400 px-3 py-1.5 text-xs font-mono shadow-[0_0_15px_rgba(217,119,6,0.25)]">
      <WifiOff size={13} className="text-amber-500 animate-pulse" />
      <span>{t.offline.banner}</span>
    </div>
  );
};
