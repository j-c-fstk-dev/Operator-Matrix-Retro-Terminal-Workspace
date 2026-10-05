import React, { useState, useEffect, useRef } from 'react';
import { Project, WorkspaceSettings, Task } from '../types';
import { Search, FolderPlus, Terminal, Volume2, VolumeX, Eye, FileDown, FileUp, Copy, Check, BookOpen, ArrowRight, CheckSquare, Square, Tag as TagIcon, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';
import { getTerminalTagStyle } from '../utils/tagColors';

interface TaskSearchResult {
  project: Project;
  task: Task;
  matchedBy: 'title' | 'tag' | 'subtask';
  matchedTag?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onSelectTask?: (projectId: string, taskId: string) => void;
  onNewProject: (customTitle?: string) => void;
  onQuickAddTask: (text: string) => void;
  settings: WorkspaceSettings;
  onUpdateSettings: (settings: Partial<WorkspaceSettings>) => void;
  onExportData: () => void;
  onImportClick: () => void;
  onCopyMarkdown: () => void;
  onOpenManual: () => void;
  onShowToast: (msg: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onSelectTask,
  onNewProject,
  onQuickAddTask,
  settings,
  onUpdateSettings,
  onExportData,
  onImportClick,
  onCopyMarkdown,
  onOpenManual,
  onShowToast,
}) => {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      sound.playCommand();
    } else {
      setQuery('');
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  // Recognize Git & Linux commands
  const isHelpCommand = lower === 'man' || lower === 'help' || lower === ':help' || lower === '?';
  const isGitCommit = lower === 'git commit' || lower === 'export' || lower === 'md';
  const isGitStatus = lower === 'git status' || lower === 'status';
  const isGitCheckout = lower.startsWith('git checkout ') || lower.startsWith('switch ');
  const isGitInit = lower.startsWith('git init ') || lower.startsWith('new ');

  const isAddTaskCommand = query.startsWith('+') || lower.startsWith('task:');
  const taskText = isAddTaskCommand 
    ? (query.startsWith('+') ? query.slice(1).trim() : query.slice(5).trim())
    : '';

  // QUICK-FIND: Search across all task titles and tags simultaneously across all projects
  const isTagQuery = lower.startsWith('#');
  const targetTagQuery = isTagQuery ? lower.slice(1) : lower;

  const matchingTasks: TaskSearchResult[] = [];
  if (lower.length > 0 && !isAddTaskCommand && !isGitCheckout && !isGitInit) {
    for (const proj of projects) {
      for (const t of proj.tasks) {
        const titleMatch = t.text.toLowerCase().includes(lower);
        const matchedTag = (t.tags || []).find((tg) =>
          tg.toLowerCase().includes(targetTagQuery)
        );
        const subtaskMatch = (t.subtasks || []).some((s) =>
          s.text.toLowerCase().includes(lower)
        );

        if (titleMatch) {
          matchingTasks.push({ project: proj, task: t, matchedBy: 'title' });
        } else if (matchedTag) {
          matchingTasks.push({ project: proj, task: t, matchedBy: 'tag', matchedTag });
        } else if (subtaskMatch) {
          matchingTasks.push({ project: proj, task: t, matchedBy: 'subtask' });
        }
      }
    }
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower)
  );

  const handleExecuteAddTask = () => {
    if (taskText) {
      onQuickAddTask(taskText);
      sound.playClick(750);
      onClose();
    }
  };

  const handleCopyMd = () => {
    onCopyMarkdown();
    setCopied(true);
    sound.playClick(900);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 800);
  };

  const handleSelectTaskResult = (projectId: string, taskId: string, projTitle: string) => {
    if (onSelectTask) {
      onSelectTask(projectId, taskId);
    } else {
      onSelectProject(projectId);
    }
    sound.playClick(750);
    onShowToast(`Pular para projeto "${projTitle}"`);
    onClose();
  };

  const handleCommandSubmit = () => {
    if (isHelpCommand) {
      onClose();
      onOpenManual();
      return;
    }

    if (isGitCommit) {
      handleCopyMd();
      return;
    }

    if (isGitStatus) {
      const active = projects.find((p) => p.id === activeProjectId);
      if (active) {
        const done = active.tasks.filter((t) => t.done).length;
        onShowToast(`STATUS [${active.title}]: ${done}/${active.tasks.length} tarefas concluídas`);
      }
      onClose();
      return;
    }

    if (isGitCheckout) {
      const targetName = trimmed.replace(/^(git checkout|switch)\s+/i, '').toLowerCase();
      const match = projects.find((p) => p.title.toLowerCase().includes(targetName));
      if (match) {
        onSelectProject(match.id);
        onShowToast(`Switched to project "${match.title}"`);
        sound.playClick(700);
        onClose();
        return;
      }
    }

    if (isGitInit) {
      const title = trimmed.replace(/^(git init|new)\s+/i, '').trim();
      onNewProject(title || undefined);
      onClose();
      return;
    }

    if (isAddTaskCommand && taskText) {
      handleExecuteAddTask();
      return;
    }

    // If quick-find matched tasks, jump directly to the first matched task
    if (matchingTasks.length > 0) {
      const first = matchingTasks[0];
      handleSelectTaskResult(first.project.id, first.task.id, first.project.title);
      return;
    }

    if (filteredProjects.length > 0) {
      onSelectProject(filteredProjects[0].id);
      onClose();
      return;
    }

    // Default fallback if typed text has no match: offer quick task add
    if (trimmed) {
      onQuickAddTask(trimmed);
      sound.playClick(750);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-20 px-3 md:px-4 bg-black/85 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#040a05] border border-[#22c55e] rounded-none shadow-[0_0_35px_rgba(0,255,102,0.22)] text-[#86efac] overflow-hidden flex flex-col font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#08190c] border-b border-[#14351a] text-[11px] tracking-wider text-[#4ade80]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-[#22c55e] animate-pulse"></span>
            <span className="font-bold text-[#22c55e]">
              OPERATOR // QUICK-FIND & COMANDOS
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-[#16a34a]">
            <span>[ENTER PULA / EXECUTA]</span>
            <span>[ESC SAIR]</span>
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#14351a] bg-[#051107]">
          <span className="text-[#22c55e] font-mono text-sm font-bold">&gt;</span>
          <div className="flex-1 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCommandSubmit();
                }
              }}
              placeholder="Quick-Find: busque por tarefas, #tags ou projetos..."
              className="w-full bg-transparent text-[#22c55e] placeholder-[#15803d] font-mono text-xs focus:outline-hidden"
            />
            <span className="terminal-block-cursor"></span>
          </div>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[10px] text-[#15803d] hover:text-[#22c55e] px-1 font-mono transition-colors"
            >
              [LIMPAR]
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[65vh] overflow-y-auto p-2 divide-y divide-[#0c2211]">
          {/* If user is typing a new task explicitly */}
          {isAddTaskCommand && taskText && (
            <button
              onClick={handleExecuteAddTask}
              className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#0c2612] text-[#4ade80] group transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#22c55e] font-mono">[+]</span>
                <span>Adicionar Tarefa: <strong className="text-white">"{taskText}"</strong></span>
              </div>
              <span className="text-[10px] text-[#15803d] group-hover:text-[#22c55e] font-mono">ENTER</span>
            </button>
          )}

          {/* Quick-Find: Task and Tag Matches */}
          {matchingTasks.length > 0 && (
            <div className="py-1">
              <div className="text-[10px] font-mono text-[#15803d] px-2 py-1 uppercase tracking-widest flex items-center justify-between">
                <span className="text-[#22c55e] font-bold">
                  Tarefas & Tags Encontradas ({matchingTasks.length})
                </span>
                <span className="text-[#16a34a]">Pressione ENTER para pular para a 1ª</span>
              </div>

              <div className="space-y-1 mt-1">
                {matchingTasks.slice(0, 12).map(({ project, task, matchedBy, matchedTag }) => (
                  <button
                    key={`${project.id}-${task.id}`}
                    onClick={() => handleSelectTaskResult(project.id, task.id, project.title)}
                    className="w-full text-left p-2.5 hover:bg-[#0b2411] border border-[#0d2212] hover:border-[#22c55e] transition-all group flex items-start justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`mt-0.5 shrink-0 text-xs font-mono font-bold ${task.done ? 'text-[#16a34a]' : 'text-[#22c55e]'}`}>
                        {task.done ? '[x]' : '[ ]'}
                      </span>
                      <div className="min-w-0">
                        <div className={`text-xs font-mono font-medium truncate ${task.done ? 'line-through text-[#15803d]' : 'text-[#86efac] group-hover:text-white'}`}>
                          {task.text}
                        </div>
                        {/* Parent project indicator and tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] font-mono text-[#22c55e] bg-[#020703] border border-[#14351a] px-1.5 py-0.2">
                            → {project.title}
                          </span>

                          {(task.tags || []).map((t) => {
                            const style = getTerminalTagStyle(t);
                            const isMatch = matchedBy === 'tag' && t.toLowerCase() === matchedTag?.toLowerCase();
                            return (
                              <span
                                key={t}
                                className={`text-[9px] font-mono px-1.5 py-0.2 border ${
                                  isMatch
                                    ? 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e] font-bold shadow-[0_0_6px_rgba(34,197,94,0.3)]'
                                    : `${style.bg} ${style.text} ${style.border}`
                                }`}
                              >
                                #{t}
                              </span>
                            );
                          })}

                          {task.priority === 'high' && (
                            <span className="text-[9px] font-mono text-emerald-300 bg-[#072410] border border-[#1b5e2b] px-1 py-0.2">
                              CRIT
                            </span>
                          )}

                          {task.subtasks.length > 0 && (
                            <span className="text-[9px] font-mono text-[#15803d]">
                              [{task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} sub]
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-[#15803d] group-hover:text-[#22c55e] font-mono shrink-0 flex items-center gap-1 pt-1">
                      <span className="hidden sm:inline">PULAR</span>
                      <ArrowRight size={11} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions (only when query is empty) */}
          {lower.length === 0 && (
            <div className="py-1">
              <div className="text-[10px] font-mono text-[#15803d] px-2 py-1 uppercase tracking-widest flex items-center justify-between">
                <span>Comandos do Sistema & Manual</span>
                <span className="text-[#22c55e]">Tecle '?' para manual</span>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenManual();
                }}
                className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#0c2612] text-[#22c55e] font-semibold transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={13} className="text-[#22c55e]" />
                  <span>MAN OPERATOR(1) - Manual & Guia de Atalhos</span>
                </div>
                <span className="text-[10px] text-[#16a34a] font-mono">[?]</span>
              </button>

              <button
                onClick={() => {
                  onNewProject();
                  onClose();
                }}
                className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#0c2612] text-[#86efac] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderPlus size={13} className="text-[#22c55e]" />
                  <span>Criar Novo Projeto (git init)</span>
                </div>
                <span className="text-[10px] text-[#16a34a] font-mono">[N]</span>
              </button>

              <button
                onClick={handleCopyMd}
                className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#0c2612] text-[#86efac] transition-colors"
              >
                <div className="flex items-center gap-2">
                  {copied ? <Check size={13} className="text-[#22c55e]" /> : <Copy size={13} className="text-[#22c55e]" />}
                  <span>{copied ? 'Copiado em Markdown!' : 'Exportar Projeto como Markdown (git commit)'}</span>
                </div>
                <span className="text-[10px] text-[#16a34a] font-mono">[M]</span>
              </button>

              <button
                onClick={() => {
                  onUpdateSettings({ rainEnabled: !settings.rainEnabled });
                  sound.playClick(650);
                }}
                className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#0c2612] text-[#86efac] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Eye size={13} className="text-[#22c55e]" />
                  <span>Chuva Digital (Matrix Rain): {settings.rainEnabled ? 'ATIVADA' : 'DESATIVADA'}</span>
                </div>
                <span className="text-[10px] text-[#16a34a] font-mono">[B]</span>
              </button>

              <button
                onClick={() => {
                  const nextSound = !settings.soundEnabled;
                  onUpdateSettings({ soundEnabled: nextSound });
                  sound.setEnabled(nextSound);
                  if (nextSound) sound.playClick(800);
                }}
                className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#0c2612] text-[#86efac] transition-colors"
              >
                <div className="flex items-center gap-2">
                  {settings.soundEnabled ? <Volume2 size={13} className="text-[#22c55e]" /> : <VolumeX size={13} className="text-[#15803d]" />}
                  <span>Efeitos Sonoros (Terminal Audio): {settings.soundEnabled ? 'LIGADO' : 'MUTADO'}</span>
                </div>
                <span className="text-[10px] text-[#16a34a] font-mono">[S]</span>
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5">
                <button
                  onClick={() => {
                    onExportData();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-xs text-[#86efac] hover:text-[#22c55e] transition-colors"
                >
                  <FileDown size={13} />
                  <span>Exportar Backup JSON</span>
                </button>
                <span className="text-[#14351a]">·</span>
                <button
                  onClick={() => {
                    onImportClick();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-xs text-[#86efac] hover:text-[#22c55e] transition-colors"
                >
                  <FileUp size={13} />
                  <span>Importar JSON</span>
                </button>
              </div>
            </div>
          )}

          {/* Projects Navigation */}
          {(filteredProjects.length > 0 || lower.length === 0) && (
            <div className="py-1">
              <div className="text-[10px] font-mono text-[#15803d] px-2 py-1 uppercase tracking-widest">
                Projetos ({filteredProjects.length})
              </div>

              {filteredProjects.map((proj) => {
                const totalTasks = proj.tasks.length;
                const doneTasks = proj.tasks.filter((t) => t.done).length;
                const isCurrent = proj.id === activeProjectId;

                return (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj.id);
                      sound.playClick(700);
                      onClose();
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                      isCurrent ? 'bg-[#0e2c14] text-[#22c55e]' : 'hover:bg-[#091a0d] text-[#86efac]'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[10px] text-[#15803d] shrink-0 font-mono">
                        {isCurrent ? '&gt;' : '·'}
                      </span>
                      <span className="truncate">{proj.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#16a34a] font-mono shrink-0">
                      <span>{proj.category}</span>
                      <span>{doneTasks}/{totalTasks}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state when nothing matched */}
          {lower.length > 0 && matchingTasks.length === 0 && filteredProjects.length === 0 && (
            <div className="p-6 text-center text-xs font-mono space-y-2">
              <div className="text-[#15803d]">
                Nenhuma tarefa, tag ou projeto encontrado para: <strong className="text-[#86efac]">"{query}"</strong>
              </div>
              <div className="text-[11px] text-[#166534]">
                Pressione <kbd className="text-[#22c55e]">Enter</kbd> para adicionar como nova tarefa no projeto ativo.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


