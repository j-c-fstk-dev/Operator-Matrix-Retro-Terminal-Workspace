import React, { useRef } from 'react';
import { WorkspaceSettings, Project } from '../types';
import { X, Volume2, VolumeX, Eye, Download, Upload, RotateCcw, Monitor } from 'lucide-react';
import { sound } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WorkspaceSettings;
  onUpdateSettings: (settings: Partial<WorkspaceSettings>) => void;
  onExportData: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetData: () => void;
  totalProjects: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onExportData,
  onImportFile,
  onResetData,
  totalProjects,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmReset, setConfirmReset] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#040a05] border border-[#166534] shadow-[0_0_30px_rgba(0,255,102,0.2)] text-[#86efac] font-mono text-xs overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#091a0c] border-b border-[#166534]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#22c55e]"></span>
            <span className="font-bold text-[#22c55e] tracking-wider">
              OPERATOR // PREFERÊNCIAS & BACKUP
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#15803d] hover:text-[#22c55e] p-1"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Aesthetic Controls */}
          <div className="space-y-3">
            <div className="text-[10px] text-[#15803d] uppercase tracking-widest border-b border-[#0f2a13] pb-1">
              Estética & Som
            </div>

            {/* Matrix Rain */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-[#86efac]">Chuva Digital (Matrix Rain)</div>
                <div className="text-[10px] text-[#15803d]">Caracteres caindo em segundo plano</div>
              </div>
              <button
                onClick={() => {
                  onUpdateSettings({ rainEnabled: !settings.rainEnabled });
                  sound.playClick(600);
                }}
                className={`px-3 py-1 text-xs border ${
                  settings.rainEnabled
                    ? 'bg-[#0e2c14] border-[#22c55e] text-[#22c55e]'
                    : 'border-[#14351a] text-[#15803d]'
                }`}
              >
                {settings.rainEnabled ? '[ATIVADO]' : '[DESLIGADO]'}
              </button>
            </div>

            {/* Rain Opacity */}
            {settings.rainEnabled && (
              <div className="flex items-center justify-between py-1 pl-3 border-l-2 border-[#103016]">
                <div className="text-[11px] text-[#86efac]">Opacidade da Chuva</div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.02"
                    max="0.25"
                    step="0.01"
                    value={settings.rainOpacity}
                    onChange={(e) =>
                      onUpdateSettings({ rainOpacity: parseFloat(e.target.value) })
                    }
                    className="w-24 accent-[#22c55e]"
                  />
                  <span className="text-[10px] text-[#22c55e] w-8 tabular-nums">
                    {Math.round(settings.rainOpacity * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* CRT Scanlines */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-[#86efac]">Linhas de Varredura (Scanlines CRT)</div>
                <div className="text-[10px] text-[#15803d]">Efeito visual de monitor vintage</div>
              </div>
              <button
                onClick={() => {
                  onUpdateSettings({ scanlines: !settings.scanlines });
                  sound.playClick(600);
                }}
                className={`px-3 py-1 text-xs border ${
                  settings.scanlines
                    ? 'bg-[#0e2c14] border-[#22c55e] text-[#22c55e]'
                    : 'border-[#14351a] text-[#15803d]'
                }`}
              >
                {settings.scanlines ? '[ATIVADO]' : '[DESLIGADO]'}
              </button>
            </div>

            {/* Sound Feedback */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-[#86efac]">Feedback Sonoro Terminal</div>
                <div className="text-[10px] text-[#15803d]">Clicks e beeps via Web Audio sintetizado</div>
              </div>
              <button
                onClick={() => {
                  const nextVal = !settings.soundEnabled;
                  onUpdateSettings({ soundEnabled: nextVal });
                  sound.setEnabled(nextVal);
                  if (nextVal) sound.playClick(800);
                }}
                className={`px-3 py-1 text-xs border ${
                  settings.soundEnabled
                    ? 'bg-[#0e2c14] border-[#22c55e] text-[#22c55e]'
                    : 'border-[#14351a] text-[#15803d]'
                }`}
              >
                {settings.soundEnabled ? '[LIGADO]' : '[MUTADO]'}
              </button>
            </div>
          </div>

          {/* Backup & Persistence */}
          <div className="space-y-3 pt-2">
            <div className="text-[10px] text-[#15803d] uppercase tracking-widest border-b border-[#0f2a13] pb-1">
              Persistência & Backup ({totalProjects} Projetos)
            </div>

            <p className="text-[11px] text-[#15803d] leading-normal">
              Seus dados são salvos automaticamente no armazenamento local (localStorage) deste navegador.
              Você pode exportar um arquivo JSON de backup ou importá-lo em outro dispositivo a qualquer momento.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={onExportData}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#071609] hover:bg-[#0e2e14] border border-[#22c55e] text-[#22c55e] transition-colors"
              >
                <Download size={13} />
                <span>Exportar Backup (JSON)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#071609] hover:bg-[#0e2e14] border border-[#14351a] text-[#86efac] transition-colors"
              >
                <Upload size={13} />
                <span>Importar Backup (JSON)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImportFile}
                className="hidden"
              />
            </div>

            <div className="pt-3 border-t border-[#0e2413]">
              {confirmReset ? (
                <div className="p-2.5 bg-[#170a0a] border border-red-800 text-red-400 space-y-2">
                  <div className="text-[11px] font-bold">
                    ATENÇÃO: Deseja redefinir para os projetos padrão iniciais?
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onResetData();
                        setConfirmReset(false);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-red-950 border border-red-500 hover:bg-red-900 text-white text-[11px] font-bold"
                    >
                      SIM, REDEFINIR TUDO
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-2.5 py-1 bg-[#061408] border border-[#14351a] text-[#86efac] text-[11px]"
                    >
                      CANCELAR
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="text-[11px] text-[#15803d] hover:text-red-400 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>Restaurar dados de exemplo iniciais</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#020603] border-t border-[#0d2212] flex items-center justify-between text-[10px] text-[#15803d]">
          <span>OPERATOR WORKSPACE // LOCAL STORAGE SYNC</span>
          <button
            onClick={onClose}
            className="text-[#22c55e] hover:underline"
          >
            [FECHAR]
          </button>
        </div>
      </div>
    </div>
  );
};
