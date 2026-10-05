import React, { useState, useRef } from 'react';
import { Project, WorkspaceSettings } from '../types';
import { X, Download, Upload, Copy, Check, FileText, Database, ArrowRightLeft, ShieldCheck, AlertTriangle } from 'lucide-react';
import { sound } from '../utils/audio';

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
  const totalDoneTasks = projects.reduce((acc, p) => acc + p.tasks.filter((t) => t.done).length, 0);
  const totalObservations = projects.reduce((acc, p) => acc + p.observations.length, 0);
  const totalSnippets = projects.reduce((acc, p) => acc + p.codeSnippets.length, 0);
  const allTags = Array.from(new Set(projects.flatMap((p) => p.tasks.flatMap((t) => t.tags || []))));

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
      onShowToast(`Backup baixado com sucesso: ${totalProjects} projetos (${approximateSizeKb} KB)`);
    } catch {
      onShowToast('Erro ao gerar o arquivo de download.');
    }
  };

  // Copy JSON directly
  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    sound.playClick(900);
    onShowToast('JSON completo copiado para a área de transferência!');
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
        onShowToast('Arquivo inválido: nenhum projeto encontrado no JSON.');
        return;
      }

      if (targetProjects.length === 0) {
        onShowToast('Aviso: o arquivo JSON continha 0 projetos.');
        return;
      }

      onImportProjects(targetProjects, targetSettings, importMode === 'merge');
      sound.playCommand();
      onClose();
    } catch {
      onShowToast('Erro: o conteúdo não é um JSON válido.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-xs font-mono text-xs text-[#86efac]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-[#030704] border border-[#22c55e] shadow-[0_0_35px_rgba(0,255,102,0.25)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#061508] border-b border-[#14351a] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#22c55e] shadow-[0_0_8px_#22c55e]"></span>
            <span className="font-bold text-[#22c55e] tracking-wider text-xs">
              SISTEMA // BACKUP & MIGRAÇÃO ENTRE DISPOSITIVOS (.JSON)
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#15803d] hover:text-[#22c55e] p-1"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
          {/* Summary Dashboard of Current Workspace */}
          <div className="bg-[#051107] border border-[#14351a] p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-[#0d2612] pb-1.5 text-[11px] text-[#22c55e] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Database size={13} />
                <span>Estado Atual do seu Workspace</span>
              </span>
              <span className="text-[10px] text-[#15803d]">TAMANHO: ~{approximateSizeKb} KB</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="bg-[#020502] p-2 border border-[#0d2212]">
                <div className="text-[10px] text-[#15803d]">PROJETOS</div>
                <div className="text-base font-bold text-[#22c55e]">{totalProjects}</div>
              </div>
              <div className="bg-[#020502] p-2 border border-[#0d2212]">
                <div className="text-[10px] text-[#15803d]">TAREFAS SALVAS</div>
                <div className="text-base font-bold text-[#22c55e]">
                  {totalTasks} <span className="text-[10px] font-normal text-[#15803d]">({totalDoneTasks} prontas)</span>
                </div>
              </div>
              <div className="bg-[#020502] p-2 border border-[#0d2212]">
                <div className="text-[10px] text-[#15803d]">TAGS DISTINTAS</div>
                <div className="text-base font-bold text-[#22c55e]">{allTags.length}</div>
              </div>
              <div className="bg-[#020502] p-2 border border-[#0d2212]">
                <div className="text-[10px] text-[#15803d]">NOTAS & SNIPPETS</div>
                <div className="text-base font-bold text-[#22c55e]">{totalObservations + totalSnippets}</div>
              </div>
            </div>
          </div>

          {/* Section 1: DOWNLOAD / EXPORT */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#22c55e] uppercase tracking-wider border-b border-[#14351a] pb-1">
              <Download size={13} />
              <span>1. Baixar Arquivo JSON (Salvar Backup)</span>
            </div>

            <p className="text-[11px] text-[#86efac]/80 leading-relaxed">
              Gera um arquivo <code className="text-[#22c55e]">.json</code> completo com todos os projetos, subtarefas, tags coloridas, notas e snippets. Você pode guardar esse arquivo no seu Google Drive, pen-drive ou enviá-lo para si mesmo.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleDownloadFile}
                className="flex-1 py-2.5 px-4 bg-[#0e2c14] hover:bg-[#14421d] border border-[#22c55e] text-xs font-bold text-[#22c55e] hover:text-white flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(34,197,94,0.2)] transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>BAIXAR ARQUIVO DE BACKUP (.JSON)</span>
              </button>

              <button
                onClick={handleCopyClipboard}
                className="py-2.5 px-3 bg-[#051107] hover:bg-[#091f0e] border border-[#14351a] hover:border-[#22c55e] text-xs text-[#86efac] flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                title="Copiar texto JSON para área de transferência"
              >
                {copied ? <Check size={13} className="text-[#22c55e]" /> : <Copy size={13} />}
                <span>{copied ? 'COPIADO!' : 'COPIAR TEXTO'}</span>
              </button>
            </div>
          </div>

          {/* Section 2: UPLOAD / RESTORE */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between border-b border-[#14351a] pb-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#22c55e] uppercase tracking-wider">
                <Upload size={13} />
                <span>2. Fazer Upload de Arquivo JSON (Restaurar em Outro Aparelho)</span>
              </span>
            </div>

            <p className="text-[11px] text-[#86efac]/80 leading-relaxed">
              Abra este site em outro computador ou navegador (ex: subindo pelo Netlify), clique neste botão e selecione o arquivo que você baixou. Tudo será reconstruído exatamente como você deixou.
            </p>

            {/* Mode selection: Replace or Merge */}
            <div className="flex items-center gap-3 pt-1 text-[11px]">
              <span className="text-[#15803d]">MODO DE IMPORTAÇÃO:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="accent-[#22c55e]"
                />
                <span className={importMode === 'replace' ? 'text-[#22c55e] font-bold' : 'text-[#86efac]'}>
                  Substituir Tudo (Recomendado)
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="accent-[#22c55e]"
                />
                <span className={importMode === 'merge' ? 'text-[#22c55e] font-bold' : 'text-[#86efac]'}>
                  Mesclar com Atuais
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
                  ? 'border-[#22c55e] bg-[#0c2e14]'
                  : 'border-[#14351a] bg-[#030904] hover:border-[#22c55e] hover:bg-[#051307]'
              }`}
            >
              <Upload size={24} className="mx-auto mb-2 text-[#22c55e]" />
              <div className="text-xs font-bold text-[#22c55e]">
                CLIQUE PARA ESCOLHER ARQUIVO .JSON
              </div>
              <div className="text-[10px] text-[#15803d] mt-1">
                ou arraste e solte o arquivo de backup aqui
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
          <div className="pt-2 border-t border-[#0e2513]">
            <button
              onClick={() => setPasteMode(!pasteMode)}
              className="text-[11px] text-[#15803d] hover:text-[#22c55e] flex items-center gap-1 transition-colors"
            >
              <span>{pasteMode ? '[-] Ocultar entrada de texto JSON' : '[+] Ou colar código JSON diretamente (sem arquivo)'}</span>
            </button>

            {pasteMode && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  placeholder="Cole aqui o conteúdo do seu arquivo .json..."
                  rows={4}
                  className="w-full bg-[#020502] border border-[#14351a] text-xs font-mono text-[#86efac] p-2 focus:outline-hidden focus:border-[#22c55e] resize-y"
                />
                <button
                  onClick={() => {
                    if (pastedJson.trim()) {
                      processImportContent(pastedJson.trim());
                    }
                  }}
                  className="px-3 py-1.5 bg-[#092211] hover:bg-[#0e2c14] border border-[#22c55e] text-xs text-[#22c55e] transition-colors"
                >
                  APLICAR JSON COLADO
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#020502] border-t border-[#14351a] flex items-center justify-between text-[10px] text-[#15803d] shrink-0">
          <div className="flex items-center gap-1.5 text-[#22c55e]">
            <ShieldCheck size={13} />
            <span>OPERATOR DATA VAULT // 100% OFFLINE & PRIVADO</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#051107] border border-[#14351a] text-[#86efac] hover:text-white hover:border-[#22c55e] transition-colors"
          >
            FECHAR [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
