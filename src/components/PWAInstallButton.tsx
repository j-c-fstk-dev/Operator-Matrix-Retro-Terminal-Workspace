import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle, Terminal } from 'lucide-react';
import { sound } from '../utils/audio';
import { useT } from '../i18n';
import { Rich } from '../i18n/Rich';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'sidebar' | 'header';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const t = useT();
  const { isInstallable, isInstalled, isIOS, browserKind, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If app is already running standalone as an installed PWA, render a clean badge or hide
  if (isInstalled) {
    if (variant === 'sidebar') {
      return (
        <div className="px-3 py-1.5 bg-[color:var(--t-030a05)] border border-[color:var(--t-14351a)] text-[10px] text-[color:var(--t-22c55e)] flex items-center justify-between font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--t-22c55e)] shadow-[0_0_6px_var(--t-22c55e)]"></span>
            <span>{t.pwa.installed}</span>
          </span>
          <span className="text-[color:var(--t-21a04d)]">STANDALONE</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    sound.playClick(750);
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          onClick={handleInstallClick}
          className={`w-full py-2 px-3 bg-[color:var(--t-041207)] hover:bg-[color:var(--t-09240e)] border border-[color:var(--t-1e6f36)] hover:border-[color:var(--t-22c55e)] text-[color:var(--t-86efac)] hover:text-white flex items-center justify-between text-xs font-mono transition-colors group cursor-pointer shadow-[0_0_12px_color-mix(in_srgb,var(--t-22c55e)_12%,transparent)] ${className}`}
          title={t.pwa.sidebarTitle}
          data-pwa-install="sidebar"
        >
          <div className="flex items-center gap-2">
            <Download size={13} className="text-[color:var(--t-22c55e)] animate-bounce" />
            <span className="font-bold">{t.pwa.sidebarLabel}</span>
          </div>
          <span className="text-[10px] text-[color:var(--t-22c55e)] font-mono group-hover:translate-x-0.5 transition-transform">
            [PWA]
          </span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[color:var(--t-041307)] hover:bg-[color:var(--t-0a2610)] border border-[color:var(--t-1b6b33)] hover:border-[color:var(--t-22c55e)] text-[color:var(--t-4ade80)] hover:text-white transition-all shadow-[0_0_10px_color-mix(in_srgb,var(--t-22c55e)_15%,transparent)] cursor-pointer ${className}`}
          title={t.pwa.headerTitle}
          data-pwa-install="header"
        >
          <Download size={12} className="text-[color:var(--t-22c55e)]" />
          <span className="hidden sm:inline font-bold">{t.pwa.headerLabel}</span>
        </button>
      )}

      {/* Guide Modal for iOS Safari / Manual Installation */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-xs font-mono text-xs text-[color:var(--t-86efac)]"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md bg-[color:var(--t-040a05)] border border-[color:var(--t-22c55e)] shadow-[0_0_35px_color-mix(in_srgb,var(--t-00ff66)_25%,transparent)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[color:var(--t-08180c)] border-b border-[color:var(--t-14351a)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[color:var(--t-22c55e)] animate-pulse shadow-[0_0_8px_var(--t-22c55e)]"></span>
                <span className="font-bold text-[color:var(--t-22c55e)] tracking-wider text-xs">
                  {t.pwa.modalTitle}
                </span>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-[color:var(--t-21a04d)] hover:text-[color:var(--t-22c55e)] p-1"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-[color:var(--t-051408)] border border-[color:var(--t-14351a)] p-3 text-xs leading-relaxed space-y-1.5">
                <div className="text-[color:var(--t-22c55e)] font-bold flex items-center gap-1.5">
                  <Smartphone size={14} />
                  <span>{t.pwa.introTitle}</span>
                </div>
                <p className="text-[11px] text-[color:var(--t-86efac)]/90">
                  {t.pwa.introBody}
                </p>
              </div>

              {browserKind === 'in-app' && (
                <div className="bg-[#120803] border border-amber-600/90 text-amber-400 p-3 text-[11px] leading-relaxed">
                  <Rich text={t.pwa.inApp} slots={{ ios: isIOS ? t.pwa.inAppIos : '' }} />
                </div>
              )}

              {isIOS ? (
                /* iOS Safari instructions */
                <div className="space-y-3 bg-[color:var(--t-020703)] border border-[color:var(--t-14351a)] p-3.5">
                  <div className="text-[color:var(--t-22c55e)] font-bold text-xs uppercase tracking-wider">
                    {browserKind === 'ios-other' ? t.pwa.iosTitleOther : t.pwa.iosTitleSafari}
                  </div>
                  <div className="space-y-2.5 text-[11px] text-[color:var(--t-86efac)]">
                    <div className="flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 bg-[color:var(--t-0b2712)] border border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)] font-bold shrink-0">1</span>
                      <p>
                        <Rich text={t.pwa.iosStep1} strongClassName="text-white" slots={{ share: <Share2 size={12} className="inline mx-1 text-[color:var(--t-22c55e)]" aria-hidden="true" /> }} />
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 bg-[color:var(--t-0b2712)] border border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)] font-bold shrink-0">2</span>
                      <p>
                        <Rich text={t.pwa.iosStep2} strongClassName="text-white" />
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 bg-[color:var(--t-0b2712)] border border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)] font-bold shrink-0">3</span>
                      <p>
                        <Rich text={t.pwa.iosStep3} strongClassName="text-white" />
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Android / Desktop Chrome / Edge instructions */
                <div className="space-y-3 bg-[color:var(--t-020703)] border border-[color:var(--t-14351a)] p-3.5">
                  <div className="text-[color:var(--t-22c55e)] font-bold text-xs uppercase tracking-wider">
                    {browserKind === 'samsung' ? t.pwa.samsungTitle : browserKind === 'firefox-android' ? t.pwa.firefoxTitle : t.pwa.chromeTitle}
                  </div>
                  <div className="space-y-2 text-[11px] text-[color:var(--t-86efac)]">
                    {browserKind === 'samsung' ? (
                      <p>
                        <Rich text={t.pwa.samsungStep} strongClassName="text-white" />
                      </p>
                    ) : browserKind === 'firefox-android' ? (
                      <p>
                        <Rich text={t.pwa.firefoxStep} strongClassName="text-white" />
                      </p>
                    ) : (
                      <>
                        <p>
                          <Rich text={t.pwa.chromeStep1} strongClassName="text-white" />
                        </p>
                        <p>
                          <Rich text={t.pwa.chromeStep2} strongClassName="text-white" />
                        </p>
                        <p>
                          {t.pwa.chromeStep3}
                        </p>
                      </>
                    )}
                  </div>

                  {isInstallable && (
                    <button
                      onClick={async () => {
                        setShowGuideModal(false);
                        await install();
                      }}
                      className="w-full mt-2 py-2 px-3 bg-[color:var(--t-0c2e15)] hover:bg-[color:var(--t-12421e)] border border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)] hover:text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download size={13} />
                      <span>{t.pwa.autoInstall}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Data Safety Notice */}
              <div className="border border-[color:var(--t-166534)] bg-[color:var(--t-020703)] p-3 text-[11px] text-[color:var(--t-4ade80)] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-[color:var(--t-22c55e)]" />
                  <span>{t.pwa.safetyTitle}</span>
                </div>
                <p className="text-[10px] text-[color:var(--t-21a04d)] leading-relaxed">
                  <Rich text={t.pwa.safetyBody} slots={{ ls: <code className="text-[color:var(--t-86efac)]">localStorage</code> }} />
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 bg-[color:var(--t-020502)] border-t border-[color:var(--t-14351a)] flex items-center justify-between text-[10px] text-[color:var(--t-21a04d)]">
              <span>PWA STANDALONE // VITE AUTO-UPDATE</span>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-[color:var(--t-22c55e)] hover:underline"
              >
                {t.common.closeTag}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
