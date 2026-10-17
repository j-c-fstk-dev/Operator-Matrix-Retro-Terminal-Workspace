import React, { useState, useRef } from 'react';
import { Project, WorkspaceSettings } from '../types';
import { X, Download, Upload, Copy, Check, FileText, Database, ArrowRightLeft, ShieldCheck, AlertTriangle } from 'lucide-react';
import { sound } from '../utils/audio';
import { useT } from '../i18n';
import { Rich } from '../i18n/Rich';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  settings: WorkspaceSettings;
  onImportProjects: (importedProjects: Project[], importedSettings?: WorkspaceSettings, merge?: boolean) => void;
  onShowToast: (msg: string) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  projects,
  settings,
  onImportProjects,
  onShowToast,
}) => {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Stats calculation
  const totalProjects = projects.length;
  const totalTasks = projects.reduce((acc, p) => acc + p.tasks.length, 0);
  const totalDoneTasks = projects.reduce((acc, p) => acc + p.tasks.filter((task) => task.done).length, 0);
  const totalObservations = projects.reduce((acc, p) => acc + p.observations.length, 0);
  const totalSnippets = projects.reduce((acc, p) => acc + p.codeSnippets.length, 0);
  const allTags = Array.from(new Set(projects.flatMap((p) => p.tasks.flatMap((task) => task.tags || []))));

  const currentPayload = {
    version: 1,
    app: 'operator-matrix-workspace',
    exportedAt: new Date().toISOString(),
    totalProjects,
    projects,
    settings,
  };

  const jsonString = JSON.stringify(currentPayload, null, 2);
  const approximateSizeKb = (new Blob([jsonString]).size / 1024).toFixed(1);

  // Download JSON file
  const handleDownloadFile = () => {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.href = url;
      link.download = `operator_backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      sound.playCommand();
      onShowToast(t.backup.downloaded(totalProjects, approximateSizeKb));
    } catch {
      onShowToast(t.backup.downloadFailed);
    }
  };

  // Copy JSON directly
  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    sound.playClick(900);
    onShowToast(t.backup.copiedToast);
    setTimeout(() => setCopied(false), 2000);
  };

  // Process and validate imported JSON
  const processImportContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      let targetProjects: Project[] = [];
      let targetSettings: WorkspaceSettings | undefined = undefined;

      if (Array.isArray(parsed)) {
        targetProjects = parsed;
      } else if (parsed && Array.isArray(parsed.projects)) {
        targetProjects = parsed.projects;
        if (parsed.settings) targetSettings = parsed.settings;
      } else {
        onShowToast(t.backup.noProjects);
        return;
      }

      if (targetProjects.length === 0) {
        onShowToast(t.backup.zeroProjects);
        return;
      }

      onImportProjects(targetProjects, targetSettings, importMode === 'merge');
      sound.playCommand();
      onClose();
    } catch {
      onShowToast(t.backup.invalidJson);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processImportContent(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processImportContent(content);
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-xs font-mono text-xs text-[color:var(--t-86efac)]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-[color:var(--t-030704)] border border-[color:var(--t-22c55e)] shadow-[0_0_35px_color-mix(in_srgb,var(--t-00ff66)_25%,transparent)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[color:var(--t-061508)] border-b border-[color:var(--t-14351a)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[color:var(--t-22c55e)] shadow-[0_0_8px_var(--t-22c55e)]"></span>
            <span className="font-bold text-[color:var(--t-22c55e)] tracking-wider text-xs">
              {t.backup.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[color:var(--t-15803d)] hover:text-[color:var(--t-22c55e)] p-1"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
          {/* Summary Dashboard of Current Workspace */}
          <div className="bg-[color:var(--t-051107)] border border-[color:var(--t-14351a)] p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-[color:var(--t-0d2612)] pb-1.5 text-[11px] text-[color:var(--t-22c55e)] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Database size={13} />
                <span>{t.backup.current}</span>
              </span>
              <span className="text-[10px] text-[color:var(--t-15803d)]">{t.backup.size(approximateSizeKb)}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="bg-[color:var(--t-020502)] p-2 border border-[color:var(--t-0d2212)]">
                <div className="text-[10px] text-[color:var(--t-15803d)]">{t.backup.statProjects}</div>
                <div className="text-base font-bold text-[color:var(--t-22c55e)]">{totalProjects}</div>
              </div>
              <div className="bg-[color:var(--t-020502)] p-2 border border-[color:var(--t-0d2212)]">
                <div className="text-[10px] text-[color:var(--t-15803d)]">{t.backup.statTasks}</div>
                <div className="text-base font-bold text-[color:var(--t-22c55e)]">
                  {totalTasks} <span className="text-[10px] font-normal text-[color:var(--t-15803d)]">{t.backup.statDone(totalDoneTasks)}</span>
                </div>
              </div>
              <div className="bg-[color:var(--t-020502)] p-2 border border-[color:var(--t-0d2212)]">
                <div className="text-[10px] text-[color:var(--t-15803d)]">{t.backup.statTags}</div>
                <div className="text-base font-bold text-[color:var(--t-22c55e)]">{allTags.length}</div>
              </div>
              <div className="bg-[color:var(--t-020502)] p-2 border border-[color:var(--t-0d2212)]">
                <div className="text-[10px] text-[color:var(--t-15803d)]">{t.backup.statNotes}</div>
                <div className="text-base font-bold text-[color:var(--t-22c55e)]">{totalObservations + totalSnippets}</div>
              </div>
            </div>
          </div>

          {/* Section 1: DOWNLOAD / EXPORT */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[color:var(--t-22c55e)] uppercase tracking-wider border-b border-[color:var(--t-14351a)] pb-1">
              <Download size={13} />
              <span>{t.backup.step1}</span>
            </div>

            <p className="text-[11px] text-[color:var(--t-86efac)]/80 leading-relaxed">
              <Rich text={t.backup.step1Body} slots={{ json: <code className="text-[color:var(--t-22c55e)]">.json</code> }} />
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleDownloadFile}
                className="flex-1 py-2.5 px-4 bg-[color:var(--t-0e2c14)] hover:bg-[color:var(--t-14421d)] border border-[color:var(--t-22c55e)] text-xs font-bold text-[color:var(--t-22c55e)] hover:text-white flex items-center justify-center gap-2 shadow-[0_0_10px_color-mix(in_srgb,var(--t-22c55e)_20%,transparent)] transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>{t.backup.downloadButton}</span>
              </button>

              <button
                onClick={handleCopyClipboard}
                className="py-2.5 px-3 bg-[color:var(--t-051107)] hover:bg-[color:var(--t-091f0e)] border border-[color:var(--t-14351a)] hover:border-[color:var(--t-22c55e)] text-xs text-[color:var(--t-86efac)] flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                title={t.backup.copyTitle}
              >
                {copied ? <Check size={13} className="text-[color:var(--t-22c55e)]" /> : <Copy size={13} />}
                <span>{copied ? t.backup.copied : t.backup.copyText}</span>
              </button>
            </div>
          </div>

          {/* Section 2: UPLOAD / RESTORE */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between border-b border-[color:var(--t-14351a)] pb-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[color:var(--t-22c55e)] uppercase tracking-wider">
                <Upload size={13} />
                <span>{t.backup.step2}</span>
              </span>
            </div>

            <p className="text-[11px] text-[color:var(--t-86efac)]/80 leading-relaxed">
              {t.backup.step2Body}
            </p>

            {/* Mode selection: Replace or Merge */}
            <div className="flex items-center gap-3 pt-1 text-[11px]">
              <span className="text-[color:var(--t-15803d)]">{t.backup.importMode}</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="accent-[color:var(--t-22c55e)]"
                />
                <span className={importMode === 'replace' ? 'text-[color:var(--t-22c55e)] font-bold' : 'text-[color:var(--t-86efac)]'}>
                  {t.backup.replace}
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="accent-[color:var(--t-22c55e)]"
                />
                <span className={importMode === 'merge' ? 'text-[color:var(--t-22c55e)] font-bold' : 'text-[color:var(--t-86efac)]'}>
                  {t.backup.merge}
                </span>
              </label>
            </div>

            {/* Drag & Drop File Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-[color:var(--t-22c55e)] bg-[color:var(--t-0c2e14)]'
                  : 'border-[color:var(--t-14351a)] bg-[color:var(--t-030904)] hover:border-[color:var(--t-22c55e)] hover:bg-[color:var(--t-051307)]'
              }`}
            >
              <Upload size={24} className="mx-auto mb-2 text-[color:var(--t-22c55e)]" />
              <div className="text-xs font-bold text-[color:var(--t-22c55e)]">
                {t.backup.pickFile}
              </div>
              <div className="text-[10px] text-[color:var(--t-15803d)] mt-1">
                {t.backup.dropHint}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Section 3: DIRECT PASTE TEXT FALLBACK */}
          <div className="pt-2 border-t border-[color:var(--t-0e2513)]">
            <button
              onClick={() => setPasteMode(!pasteMode)}
              className="text-[11px] text-[color:var(--t-15803d)] hover:text-[color:var(--t-22c55e)] flex items-center gap-1 transition-colors"
            >
              <span>{pasteMode ? t.backup.pasteHide : t.backup.pasteShow}</span>
            </button>

            {pasteMode && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  placeholder={t.backup.pastePlaceholder}
                  rows={4}
                  className="w-full bg-[color:var(--t-020502)] border border-[color:var(--t-14351a)] text-xs font-mono text-[color:var(--t-86efac)] p-2 focus:outline-hidden focus:border-[color:var(--t-22c55e)] resize-y"
                />
                <button
                  onClick={() => {
                    if (pastedJson.trim()) {
                      processImportContent(pastedJson.trim());
                    }
                  }}
                  className="px-3 py-1.5 bg-[color:var(--t-092211)] hover:bg-[color:var(--t-0e2c14)] border border-[color:var(--t-22c55e)] text-xs text-[color:var(--t-22c55e)] transition-colors"
                >
                  {t.backup.applyPaste}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[color:var(--t-020502)] border-t border-[color:var(--t-14351a)] flex items-center justify-between text-[10px] text-[color:var(--t-15803d)] shrink-0">
          <div className="flex items-center gap-1.5 text-[color:var(--t-22c55e)]">
            <ShieldCheck size={13} />
            <span>{t.backup.footer}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[color:var(--t-051107)] border border-[color:var(--t-14351a)] text-[color:var(--t-86efac)] hover:text-white hover:border-[color:var(--t-22c55e)] transition-colors"
          >
            {t.common.closeEsc}
          </button>
        </div>
      </div>
    </div>
  );
};
