import React, { useRef } from 'react';
import { WorkspaceSettings, Project } from '../types';
import { X, Volume2, VolumeX, Eye, Download, Upload, RotateCcw, Monitor } from 'lucide-react';
import { sound } from '../utils/audio';
import { SOURCE_CODE_URL, LICENSE_NAME, APP_VERSION } from '../lib/appInfo';
import { useT, useLang, LANGS } from '../i18n';
import { ACCENT_THEMES, resolveAccentTheme, themeColor } from '../theme/themes';

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
  const t = useT();
  const lang = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmReset, setConfirmReset] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[color:var(--t-040a05)] border border-[color:var(--t-166534)] shadow-[0_0_30px_color-mix(in_srgb,var(--t-00ff66)_20%,transparent)] text-[color:var(--t-86efac)] font-mono text-xs overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[color:var(--t-091a0c)] border-b border-[color:var(--t-166534)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[color:var(--t-22c55e)]"></span>
            <span className="font-bold text-[color:var(--t-22c55e)] tracking-wider">
              {t.settings.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[color:var(--t-15803d)] hover:text-[color:var(--t-22c55e)] p-1"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Aesthetic Controls */}
          <div className="space-y-3">
            <div className="text-[10px] text-[color:var(--t-15803d)] uppercase tracking-widest border-b border-[color:var(--t-0f2a13)] pb-1">
              {t.settings.aestheticsSection}
            </div>

            {/* Accent Color Theme */}
            <div className="py-1">
              <div className="font-medium text-[color:var(--t-86efac)]">{t.settings.colorTitle}</div>
              <div className="text-[10px] text-[color:var(--t-15803d)] mb-2">{t.settings.colorHint}</div>
              <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={t.settings.colorTitle}>
                {ACCENT_THEMES.map((theme) => {
                  const active = resolveAccentTheme(settings.accentTheme) === theme.id;
                  return (
                    <button
                      key={theme.id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        onUpdateSettings({ accentTheme: theme.id });
                        sound.playClick(700);
                      }}
                      className={`flex flex-col items-center gap-1 px-1 py-1.5 text-[10px] border transition-colors ${
                        active
                          ? 'border-[color:var(--t-22c55e)] bg-[color:var(--t-0e2c14)] text-[color:var(--t-22c55e)]'
                          : 'border-[color:var(--t-14351a)] text-[color:var(--t-15803d)] hover:border-[color:var(--t-15803d)]'
                      }`}
                    >
                      <span
                        className="w-4 h-4 border"
                        style={{
                          backgroundColor: themeColor('22c55e', theme.id),
                          borderColor: themeColor('14351a', theme.id),
                          boxShadow: `0 0 8px ${themeColor('22c55e', theme.id)}66`,
                        }}
                      />
                      <span className="truncate max-w-full">{t.themes[theme.id]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language */}
            <div className="py-1">
              <div className="font-medium text-[color:var(--t-86efac)]">{t.settings.languageTitle}</div>
              <div className="text-[10px] text-[color:var(--t-15803d)] mb-2">{t.settings.languageHint}</div>
              <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={t.settings.languageTitle}>
                {LANGS.map((l) => {
                  const active = lang === l.id;
                  return (
                    <button
                      key={l.id}
                      role="radio"
                      aria-checked={active}
                      lang={l.id === 'pt' ? 'pt-BR' : 'en'}
                      onClick={() => {
                        onUpdateSettings({ language: l.id });
                        sound.playClick(700);
                      }}
                      className={`px-2 py-1.5 text-[11px] border transition-colors ${
                        active
                          ? 'border-[color:var(--t-22c55e)] bg-[color:var(--t-0e2c14)] text-[color:var(--t-22c55e)]'
                          : 'border-[color:var(--t-14351a)] text-[color:var(--t-15803d)] hover:border-[color:var(--t-15803d)]'
                      }`}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matrix Rain */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-[color:var(--t-86efac)]">{t.settings.rainTitle}</div>
                <div className="text-[10px] text-[color:var(--t-15803d)]">{t.settings.rainHint}</div>
              </div>
              <button
                onClick={() => {
                  onUpdateSettings({ rainEnabled: !settings.rainEnabled });
                  sound.playClick(600);
                }}
                className={`px-3 py-1 text-xs border ${
                  settings.rainEnabled
                    ? 'bg-[color:var(--t-0e2c14)] border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)]'
                    : 'border-[color:var(--t-14351a)] text-[color:var(--t-15803d)]'
                }`}
              >
                {settings.rainEnabled ? t.settings.on : t.settings.off}
              </button>
            </div>

            {/* Rain Opacity */}
            {settings.rainEnabled && (
              <div className="flex items-center justify-between py-1 pl-3 border-l-2 border-[color:var(--t-103016)]">
                <div className="text-[11px] text-[color:var(--t-86efac)]">{t.settings.rainOpacity}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={settings.rainOpacity}
                    onChange={(e) =>
                      onUpdateSettings({ rainOpacity: parseFloat(e.target.value) })
                    }
                    className="w-24 accent-[color:var(--t-22c55e)]"
                  />
                  <span className="text-[10px] text-[color:var(--t-22c55e)] w-8 tabular-nums">
                    {Math.round(settings.rainOpacity * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* CRT Scanlines */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-[color:var(--t-86efac)]">{t.settings.scanlinesTitle}</div>
                <div className="text-[10px] text-[color:var(--t-15803d)]">{t.settings.scanlinesHint}</div>
              </div>
              <button
                onClick={() => {
                  onUpdateSettings({ scanlines: !settings.scanlines });
                  sound.playClick(600);
                }}
                className={`px-3 py-1 text-xs border ${
                  settings.scanlines
                    ? 'bg-[color:var(--t-0e2c14)] border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)]'
                    : 'border-[color:var(--t-14351a)] text-[color:var(--t-15803d)]'
                }`}
              >
                {settings.scanlines ? t.settings.on : t.settings.off}
              </button>
            </div>

            {/* Sound Feedback */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-[color:var(--t-86efac)]">{t.settings.soundTitle}</div>
                <div className="text-[10px] text-[color:var(--t-15803d)]">{t.settings.soundHint}</div>
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
                    ? 'bg-[color:var(--t-0e2c14)] border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)]'
                    : 'border-[color:var(--t-14351a)] text-[color:var(--t-15803d)]'
                }`}
              >
                {settings.soundEnabled ? t.settings.soundOn : t.settings.soundOff}
              </button>
            </div>
          </div>

          {/* Backup & Persistence */}
          <div className="space-y-3 pt-2">
            <div className="text-[10px] text-[color:var(--t-15803d)] uppercase tracking-widest border-b border-[color:var(--t-0f2a13)] pb-1">
              {t.settings.backupSection(totalProjects)}
            </div>

            <p className="text-[11px] text-[color:var(--t-15803d)] leading-normal">
              {t.settings.backupHint}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={onExportData}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[color:var(--t-071609)] hover:bg-[color:var(--t-0e2e14)] border border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)] transition-colors"
              >
                <Download size={13} />
                <span>{t.settings.exportBackup}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[color:var(--t-071609)] hover:bg-[color:var(--t-0e2e14)] border border-[color:var(--t-14351a)] text-[color:var(--t-86efac)] transition-colors"
              >
                <Upload size={13} />
                <span>{t.settings.importBackup}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImportFile}
                className="hidden"
              />
            </div>

            <div className="pt-3 border-t border-[color:var(--t-0e2413)]">
              {confirmReset ? (
                <div className="p-2.5 bg-[#170a0a] border border-red-800 text-red-400 space-y-2">
                  <div className="text-[11px] font-bold">
                    {t.settings.resetConfirm}
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
                      {t.settings.resetYes}
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-2.5 py-1 bg-[color:var(--t-061408)] border border-[color:var(--t-14351a)] text-[color:var(--t-86efac)] text-[11px]"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="text-[11px] text-[color:var(--t-15803d)] hover:text-red-400 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>{t.settings.resetButton}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[color:var(--t-020603)] border-t border-[color:var(--t-0d2212)] flex items-center justify-between text-[10px] text-[color:var(--t-15803d)]">
          <a
            href={SOURCE_CODE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[color:var(--t-22c55e)] hover:underline"
            title={t.common.sourceTitle}
          >
            {t.common.sourceLink(LICENSE_NAME)}
          </a>
          <span className="opacity-70" title={t.common.versionTitle}>v{APP_VERSION}</span>
          <button
            onClick={onClose}
            className="text-[color:var(--t-22c55e)] hover:underline"
          >
            {t.common.closeTag}
          </button>
        </div>
      </div>
    </div>
  );
};
