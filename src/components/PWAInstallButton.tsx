import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle, Terminal } from 'lucide-react';
import { sound } from '../utils/audio';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'sidebar' | 'header';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, browserKind, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If app is already running standalone as an installed PWA, render a clean badge or hide
  if (isInstalled) {
    if (variant === 'sidebar') {
      return (
        <div className="px-3 py-1.5 bg-[#030a05] border border-[#14351a] text-[10px] text-[#22c55e] flex items-center justify-between font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e]"></span>
            <span>APP INSTALADO</span>
          </span>
          <span className="text-[#15803d]">STANDALONE</span>
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
          className={`w-full py-2 px-3 bg-[#041207] hover:bg-[#09240e] border border-[#1e6f36] hover:border-[#22c55e] text-[#86efac] hover:text-white flex items-center justify-between text-xs font-mono transition-colors group cursor-pointer shadow-[0_0_12px_rgba(34,197,94,0.12)] ${className}`}
          title="Instalar o Operator como aplicativo no seu celular ou computador"
        >
          <div className="flex items-center gap-2">
            <Download size={13} className="text-[#22c55e] animate-bounce" />
            <span className="font-bold">INSTALAR APLICATIVO</span>
          </div>
          <span className="text-[10px] text-[#22c55e] font-mono group-hover:translate-x-0.5 transition-transform">
            [PWA]
          </span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[#041307] hover:bg-[#0a2610] border border-[#1b6b33] hover:border-[#22c55e] text-[#4ade80] hover:text-white transition-all shadow-[0_0_10px_rgba(34,197,94,0.15)] cursor-pointer ${className}`}
          title="Instalar este sistema como aplicativo nativo no seu dispositivo"
        >
          <Download size={12} className="text-[#22c55e]" />
          <span className="hidden sm:inline font-bold">Instalar App</span>
        </button>
      )}

      {/* Guide Modal for iOS Safari / Manual Installation */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-xs font-mono text-xs text-[#86efac]"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#040a05] border border-[#22c55e] shadow-[0_0_35px_rgba(0,255,102,0.25)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#08180c] border-b border-[#14351a]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                <span className="font-bold text-[#22c55e] tracking-wider text-xs">
                  OPERATOR // INSTALAÇÃO PWA
                </span>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-[#15803d] hover:text-[#22c55e] p-1"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-[#051408] border border-[#14351a] p-3 text-xs leading-relaxed space-y-1.5">
                <div className="text-[#22c55e] font-bold flex items-center gap-1.5">
                  <Smartphone size={14} />
                  <span>Transformar em App Instalável</span>
                </div>
                <p className="text-[11px] text-[#86efac]/90">
                  O Operator funciona como um aplicativo nativo completo (PWA): sem barra de endereços do navegador, com abertura instantânea na tela de início e acesso offline!
                </p>
              </div>

              {browserKind === 'in-app' && (
                <div className="bg-[#120803] border border-amber-600/90 text-amber-400 p-3 text-[11px] leading-relaxed">
                  <strong>Navegador interno detectado.</strong> Apps como Instagram, Facebook e TikTok abrem links num navegador próprio que não instala PWA.
                  Toque no menu <strong>(⋮ ou ···)</strong> e escolha <strong>"Abrir no Chrome"</strong> ou <strong>"Abrir no navegador"</strong>{isIOS ? ' (no iPhone, abra no Safari)' : ''} e tente de novo.
                </div>
              )}

              {isIOS ? (
                /* iOS Safari instructions */
                <div className="space-y-3 bg-[#020703] border border-[#14351a] p-3.5">
                  <div className="text-[#22c55e] font-bold text-xs uppercase tracking-wider">
                    Como instalar no iPhone / iPad{browserKind === 'ios-other' ? ' (Safari ou Chrome no iOS 16.4+)' : ' (Safari)'}:
                  </div>
                  <div className="space-y-2.5 text-[11px] text-[#86efac]">
                    <div className="flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 bg-[#0b2712] border border-[#22c55e] text-[#22c55e] font-bold shrink-0">1</span>
                      <p>
                        Toque no botão <strong className="text-white">Compartilhar</strong> (ícone <Share2 size={12} className="inline mx-1 text-[#22c55e]" /> na barra do navegador).
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 bg-[#0b2712] border border-[#22c55e] text-[#22c55e] font-bold shrink-0">2</span>
                      <p>
                        Role a lista e selecione <strong className="text-white">Adicionar à Tela de Início</strong> (Add to Home Screen).
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 bg-[#0b2712] border border-[#22c55e] text-[#22c55e] font-bold shrink-0">3</span>
                      <p>
                        Toque em <strong className="text-white">Adicionar</strong> no canto superior direito.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Android / Desktop Chrome / Edge instructions */
                <div className="space-y-3 bg-[#020703] border border-[#14351a] p-3.5">
                  <div className="text-[#22c55e] font-bold text-xs uppercase tracking-wider">
                    {browserKind === 'samsung' ? 'No Samsung Internet:' : browserKind === 'firefox-android' ? 'No Firefox para Android:' : 'No Android, Chrome ou Edge:'}
                  </div>
                  <div className="space-y-2 text-[11px] text-[#86efac]">
                    {browserKind === 'samsung' ? (
                      <p>
                        Toque no menu <strong className="text-white">(≡)</strong> e escolha <strong className="text-white">"Adicionar página a"</strong> &gt; <strong className="text-white">"Tela de início"</strong>.
                      </p>
                    ) : browserKind === 'firefox-android' ? (
                      <p>
                        Toque no menu <strong className="text-white">(⋮)</strong> e escolha <strong className="text-white">"Instalar"</strong>. Para a melhor experiência, prefira o Chrome.
                      </p>
                    ) : (
                      <>
                        <p>
                          1. Toque no menu de três pontos <strong className="text-white">(⋮)</strong> e escolha <strong className="text-white">"Instalar app"</strong>.
                        </p>
                        <p>
                          2. Se só aparecer <strong className="text-white">"Adicionar à tela inicial"</strong>, escolha essa opção e depois <strong className="text-white">"Instalar"</strong> (não "Criar atalho"). O atalho abre no navegador e não vira app.
                        </p>
                        <p>
                          3. No computador, use o ícone de instalar na barra de endereço.
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
                      className="w-full mt-2 py-2 px-3 bg-[#0c2e15] hover:bg-[#12421e] border border-[#22c55e] text-[#22c55e] hover:text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download size={13} />
                      <span>DISPARAR INSTALAÇÃO AUTOMÁTICA</span>
                    </button>
                  )}
                </div>
              )}

              {/* Data Safety Notice */}
              <div className="border border-[#166534] bg-[#020703] p-3 text-[11px] text-[#4ade80] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-[#22c55e]" />
                  <span>Segurança dos seus Dados:</span>
                </div>
                <p className="text-[10px] text-[#15803d] leading-relaxed">
                  O aplicativo instalado compartilha o mesmo banco de dados local (<code className="text-[#86efac]">localStorage</code>) e a sincronização na nuvem com o Supabase. Atualizar o repositório ou seu site no Netlify nunca apagará seus projetos!
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 bg-[#020502] border-t border-[#14351a] flex items-center justify-between text-[10px] text-[#15803d]">
              <span>PWA STANDALONE // VITE AUTO-UPDATE</span>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-[#22c55e] hover:underline"
              >
                [FECHAR]
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
