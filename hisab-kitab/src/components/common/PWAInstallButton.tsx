import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { DownloadAppModal } from './DownloadAppModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'mobile' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already installed as standalone PWA, hide ambient button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (!res) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center ${className}`}
          title="Download & Install App"
          aria-label="Download & Install App"
        >
          <Download className="w-5 h-5 text-[#6558D3] dark:text-[#8174f7]" />
        </button>
        <DownloadAppModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#6558D3] dark:text-[#8174f7] bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl transition shadow-xs cursor-pointer ${className}`}
        title="Download / Install Ledgerly App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
      <DownloadAppModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
