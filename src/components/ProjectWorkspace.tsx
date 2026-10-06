import React, { useState } from 'react';
import { Project, Task, SubTask, Observation, CodeSnippet } from '../types';
import { 
  Check, 
  Square, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Code, 
  ListTodo, 
  Download, 
  Share2,
  AlertCircle,
  Menu,
  Terminal,
  ExternalLink,
  Tag,
  X,
  BookOpen,
  Database,
  Cloud
} from 'lucide-react';
import { sound } from '../utils/audio';
import { getTerminalTagStyle } from '../utils/tagColors';
import { User } from '@supabase/supabase-js';

interface ProjectWorkspaceProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onOpenMobileMenu: () => void;
  onCopyMarkdown: () => void;
  onOpenManual: () => void;
  onOpenBackup: () => void;
  onOpenAuth?: () => void;
  user?: User | null;
  highlightedTaskId?: string | null;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  onUpdateProject,
  onOpenMobileMenu,
  onCopyMarkdown,
  onOpenManual,
  onOpenBackup,
  onOpenAuth,
  user,
  highlightedTaskId,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'notes' | 'code'>('all');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTagsInput, setNewTaskTagsInput] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'med' | 'high'>('med');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});
  const [tagInputTaskId, setTagInputTaskId] = useState<string | null>(null);
  const [newTagInputVal, setNewTagInputVal] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(project.description);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const newTaskInputRef = React.useRef<HTMLInputElement>(null);

  // Sync title & description when project changes
  React.useEffect(() => {
    setTitleInput(project.title);
    setDescInput(project.description);
  }, [project.id, project.title, project.description]);

  // Jump and scroll to task when selected from Quick-Find
  React.useEffect(() => {
    if (highlightedTaskId) {
      setSelectedTaskId(highlightedTaskId);
      setActiveTab('tasks');
      setTaskFilter('all');
      setSelectedTagFilter(null);
      setTimeout(() => {
        const el = document.getElementById(`task-item-${highlightedTaskId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [highlightedTaskId, project.id]);

  // Tasks math
  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t) => t.done).length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Task Operations
  const handleToggleTask = (taskId: string) => {
    const updatedTasks = project.tasks.map((t) => {
      if (t.id === taskId) {
        const nextDone = !t.done;
        sound.playCheck(nextDone);
        // Also toggle all subtasks if marking complete
        const updatedSubtasks = nextDone
          ? t.subtasks.map((s) => ({ ...s, done: true }))
          : t.subtasks;
        return { ...t, done: nextDone, subtasks: updatedSubtasks };
      }
      return t;
    });
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const updatedTasks = project.tasks.map((t) => {
      if (t.id === taskId) {
        const updatedSubs = t.subtasks.map((s) => {
          if (s.id === subtaskId) {
            const nextDone = !s.done;
            sound.playCheck(nextDone);
            return { ...s, done: nextDone };
          }
          return s;
        });
        const allSubsDone = updatedSubs.length > 0 && updatedSubs.every((s) => s.done);
        return {
          ...t,
          subtasks: updatedSubs,
          done: allSubsDone ? true : t.done,
        };
      }
      return t;
    });
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    // Extract hashtags from task text
    const textHashtags = (newTaskText.match(/#([a-zA-Z0-9_-]+)/g) || []).map((t) =>
      t.slice(1).toLowerCase()
    );

    // Extract tags from tags input field
    const explicitTags = newTaskTagsInput
      .split(/[,;\s]+/)
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    const mergedTags = Array.from(new Set([...textHashtags, ...explicitTags]));

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: newTaskText.trim(),
      done: false,
      priority: newTaskPriority,
      tags: mergedTags.length > 0 ? mergedTags : undefined,
      subtasks: [],
      createdAt: Date.now(),
    };

    sound.playClick(800);
    onUpdateProject({
      ...project,
      tasks: [newTask, ...project.tasks],
      updatedAt: Date.now(),
    });
    setNewTaskText('');
    setNewTaskTagsInput('');
  };

  const handleAddTagToTask = (taskId: string, rawTag?: string) => {
    const tag = (rawTag || newTagInputVal).trim().toLowerCase().replace(/^#/, '');
    if (!tag) return;

    const updatedTasks = project.tasks.map((t) => {
      if (t.id === taskId) {
        const current = t.tags || [];
        if (!current.includes(tag)) {
          return { ...t, tags: [...current, tag] };
        }
      }
      return t;
    });

    sound.playClick(750);
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
    setNewTagInputVal('');
    setTagInputTaskId(null);
  };

  const handleRemoveTag = (taskId: string, tagToRemove: string) => {
    const updatedTasks = project.tasks.map((t) => {
      if (t.id === taskId && t.tags) {
        const remaining = t.tags.filter((tg) => tg !== tagToRemove);
        return { ...t, tags: remaining.length > 0 ? remaining : undefined };
      }
      return t;
    });

    sound.playClick(450);
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleDeleteTask = (taskId: string) => {
    sound.playClick(400);
    const updatedTasks = project.tasks.filter((t) => t.id !== taskId);
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleAddSubtask = (taskId: string) => {
    const text = newSubtaskInputs[taskId]?.trim();
    if (!text) return;

    const updatedTasks = project.tasks.map((t) => {
      if (t.id === taskId) {
        const newSub: SubTask = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          text,
          done: false,
          createdAt: Date.now(),
        };
        return {
          ...t,
          done: false, // If adding a subtask, task is not 100% complete
          subtasks: [...t.subtasks, newSub],
        };
      }
      return t;
    });

    sound.playClick(750);
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
    setNewSubtaskInputs((prev) => ({ ...prev, [taskId]: '' }));
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: true }));
  };

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    sound.playClick(450);
    const updatedTasks = project.tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
        };
      }
      return t;
    });
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleUpdateTaskText = (taskId: string, newText: string) => {
    const updatedTasks = project.tasks.map((t) =>
      t.id === taskId ? { ...t, text: newText } : t
    );
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleUpdateSubtaskText = (taskId: string, subId: string, newText: string) => {
    const updatedTasks = project.tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, text: newText } : s)),
        };
      }
      return t;
    });
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  // Observations Operations
  const handleAddObservation = () => {
    const newObs: Observation = {
      id: `obs-${Date.now()}`,
      title: 'Nova Observação Técnica',
      content: 'Descreva aqui anotações, decisões tomadas, URLs de documentação ou logs de execução...',
      tag: 'NOTAS',
      updatedAt: Date.now(),
    };
    sound.playClick(750);
    onUpdateProject({
      ...project,
      observations: [newObs, ...project.observations],
      updatedAt: Date.now(),
    });
    setEditingNoteId(newObs.id);
  };

  const handleUpdateObservation = (obsId: string, updates: Partial<Observation>) => {
    const updatedObs = project.observations.map((o) =>
      o.id === obsId ? { ...o, ...updates, updatedAt: Date.now() } : o
    );
    onUpdateProject({ ...project, observations: updatedObs, updatedAt: Date.now() });
  };

  const handleDeleteObservation = (obsId: string) => {
    sound.playClick(400);
    const updatedObs = project.observations.filter((o) => o.id !== obsId);
    onUpdateProject({ ...project, observations: updatedObs, updatedAt: Date.now() });
  };

  // Code Snippet Operations
  const handleAddSnippet = () => {
    const newSnip: CodeSnippet = {
      id: `snip-${Date.now()}`,
      title: 'script-util.sh',
      language: 'bash',
      code: '#!/usr/bin/env bash\n# Script de automacao\necho "Running operator job..."\n',
      updatedAt: Date.now(),
    };
    sound.playClick(750);
    onUpdateProject({
      ...project,
      codeSnippets: [newSnip, ...project.codeSnippets],
      updatedAt: Date.now(),
    });
  };

  const handleUpdateSnippet = (snipId: string, updates: Partial<CodeSnippet>) => {
    const updatedSnips = project.codeSnippets.map((s) =>
      s.id === snipId ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    onUpdateProject({ ...project, codeSnippets: updatedSnips, updatedAt: Date.now() });
  };

  const handleDeleteSnippet = (snipId: string) => {
    sound.playClick(400);
    const updatedSnips = project.codeSnippets.filter((s) => s.id !== snipId);
    onUpdateProject({ ...project, codeSnippets: updatedSnips, updatedAt: Date.now() });
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    sound.playClick(900);
    setTimeout(() => setCopiedCodeId(null), 1200);
  };

  // Collect all distinct tags in the active project
  const allProjectTags = Array.from(
    new Set(project.tasks.flatMap((t) => t.tags || []))
  ).sort();

  // Filter tasks based on status and selected tag
  const visibleTasks = project.tasks.filter((t) => {
    if (taskFilter === 'pending' && t.done) return false;
    if (taskFilter === 'done' && !t.done) return false;
    if (selectedTagFilter && (!t.tags || !t.tags.includes(selectedTagFilter))) return false;
    return true;
  });

  // Global Linux & Git keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (isInput) {
        if (e.key === 'Escape') {
          (activeEl as HTMLElement).blur();
        }
        return;
      }

      // Open manual
      if (e.key === '?' || e.key === 'F1') {
        e.preventDefault();
        onOpenManual();
        return;
      }

      // Jump to task input
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        newTaskInputRef.current?.focus();
        sound.playClick(600);
        return;
      }

      // Tab switching 1..4
      if (e.key === '1') {
        setActiveTab('all');
        sound.playClick(650);
        return;
      }
      if (e.key === '2') {
        setActiveTab('tasks');
        sound.playClick(650);
        return;
      }
      if (e.key === '3') {
        setActiveTab('notes');
        sound.playClick(650);
        return;
      }
      if (e.key === '4') {
        setActiveTab('code');
        sound.playClick(650);
        return;
      }

      // Task list navigation (Vim j/k)
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (visibleTasks.length === 0) return;
        const currentIndex = visibleTasks.findIndex((t) => t.id === selectedTaskId);
        const nextIndex = currentIndex < visibleTasks.length - 1 ? currentIndex + 1 : 0;
        setSelectedTaskId(visibleTasks[nextIndex].id);
        sound.playClick(500);
        return;
      }

      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (visibleTasks.length === 0) return;
        const currentIndex = visibleTasks.findIndex((t) => t.id === selectedTaskId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : visibleTasks.length - 1;
        setSelectedTaskId(visibleTasks[prevIndex].id);
        sound.playClick(500);
        return;
      }

      // Toggle selected task (x or Space)
      if ((e.key === 'x' || e.key === ' ') && selectedTaskId) {
        e.preventDefault();
        handleToggleTask(selectedTaskId);
        return;
      }

      // Delete selected task
      if (e.key === 'Delete' && selectedTaskId) {
        e.preventDefault();
        handleDeleteTask(selectedTaskId);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, visibleTasks, onOpenManual]);

  return (
    <main className="flex-1 flex flex-col h-full bg-[#030704] text-[#86efac] overflow-hidden">
      {/* Top Breadcrumb & Actions Bar */}
      <header className="px-4 py-3 bg-[#050e06] border-b border-[#14351a] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden text-[#22c55e] hover:text-white p-1"
          >
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#166534] truncate">
            <span>OPERATOR</span>
            <span>&gt;</span>
            <span>PROJETOS</span>
            <span>&gt;</span>
            <span className="text-[#22c55e] font-semibold truncate">{project.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              onOpenAuth?.();
              sound.playClick(750);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono transition-colors border ${
              user
                ? 'bg-[#081a0b] border-[#22c55e] text-[#22c55e]'
                : 'bg-[#07170a] border-[#14351a] hover:border-[#22c55e] text-[#86efac]'
            }`}
            title={user ? `Sincronização em nuvem ativa (${user.email})` : 'Conectar com Supabase'}
          >
            <Cloud size={12} className={user ? 'text-[#22c55e]' : 'text-[#15803d]'} />
            <span className="hidden md:inline">{user ? 'Nuvem OK' : 'Login / Nuvem'}</span>
          </button>

          <button
            onClick={() => {
              onOpenBackup();
              sound.playClick(750);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[#07170a] hover:bg-[#0e2c14] border border-[#14351a] hover:border-[#22c55e] text-[#86efac] transition-colors"
            title="Baixar ou Subir arquivo de Backup JSON para sincronizar com outro aparelho"
          >
            <Database size={12} className="text-[#22c55e]" />
            <span className="hidden sm:inline">Backup JSON</span>
          </button>

          <button
            onClick={() => {
              onOpenManual();
              sound.playClick(750);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[#07170a] hover:bg-[#0e2c14] border border-[#22c55e] text-[#22c55e] transition-colors"
            title="Abrir Manual de Comandos e Teclas de Atalho [?]"
          >
            <BookOpen size={12} />
            <span className="hidden sm:inline">Manual [?]</span>
          </button>

          <button
            onClick={() => {
              onCopyMarkdown();
              sound.playClick(850);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[#07170a] hover:bg-[#0e2c14] border border-[#14351a] text-[#86efac] transition-colors"
            title="Copiar todo o projeto formatado em Markdown"
          >
            <Copy size={12} className="text-[#22c55e]" />
            <span className="hidden sm:inline">Exportar MD</span>
          </button>

          <select
            value={project.status}
            onChange={(e) =>
              onUpdateProject({
                ...project,
                status: e.target.value as Project['status'],
                updatedAt: Date.now(),
              })
            }
            className="bg-[#030704] border border-[#14351a] text-[11px] font-mono text-[#22c55e] px-2 py-1 focus:outline-hidden cursor-pointer"
          >
            <option value="active">ATIVO</option>
            <option value="in_progress">EM PROGRESSO</option>
            <option value="standby">STANDBY</option>
            <option value="completed">CONCLUÍDO</option>
          </select>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Project Header Info */}
        <section className="border border-[#14351a] bg-[#050f07] p-4 md:p-5 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 space-y-1">
              {/* Category tag */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <input
                    type="text"
                    value={project.category}
                    onChange={(e) =>
                      onUpdateProject({ ...project, category: e.target.value.toUpperCase() })
                    }
                    className="text-[10px] font-mono tracking-widest text-[#15803d] uppercase bg-transparent border-b border-transparent hover:border-[#14351a] focus:border-[#22c55e] focus:outline-hidden w-36"
                    placeholder="CATEGORIA"
                  />
                  <span className="terminal-underscore-cursor"></span>
                </div>
                <span className="text-[10px] text-[#15803d]">·</span>
                <span className="text-[10px] font-mono text-[#15803d]">
                  ÚLTIMA ATUALIZAÇÃO: {new Date(project.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Title */}
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-[#030704] border border-[#22c55e] px-2 py-1">
                    <input
                      type="text"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onBlur={() => {
                        setEditingTitle(false);
                        if (titleInput.trim()) {
                          onUpdateProject({ ...project, title: titleInput.trim(), updatedAt: Date.now() });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEditingTitle(false);
                          if (titleInput.trim()) {
                            onUpdateProject({ ...project, title: titleInput.trim(), updatedAt: Date.now() });
                          }
                        }
                      }}
                      autoFocus
                      className="w-full text-lg md:text-xl font-mono font-bold bg-transparent text-[#22c55e] focus:outline-hidden"
                    />
                    <span className="terminal-block-cursor"></span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-lg md:text-xl font-mono font-bold text-[#22c55e] matrix-glow">
                    {project.title}
                  </h1>
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="opacity-0 group-hover:opacity-100 text-[#15803d] hover:text-[#22c55e] transition-opacity"
                    title="Editar título"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              )}

              {/* Description */}
              {editingDesc ? (
                <div className="pt-1">
                  <textarea
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    onBlur={() => {
                      setEditingDesc(false);
                      onUpdateProject({ ...project, description: descInput.trim(), updatedAt: Date.now() });
                    }}
                    rows={2}
                    autoFocus
                    className="w-full text-xs font-mono bg-[#030704] border border-[#22c55e] text-[#86efac] p-2 focus:outline-hidden resize-none"
                  />
                </div>
              ) : (
                <p
                  onClick={() => setEditingDesc(true)}
                  className="text-xs font-mono text-[#86efac]/80 hover:text-white cursor-pointer transition-colors"
                  title="Clique para editar descrição"
                >
                  {project.description || 'Clique para adicionar uma descrição técnica a este projeto...'}
                </p>
              )}
            </div>

            {/* ASCII / Segmented Progress Meter */}
            <div className="bg-[#030704] border border-[#14351a] p-3 shrink-0 md:w-60 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-[#166534] mb-1">
                <span>CONCLUÍDO</span>
                <span className="text-[#22c55e] tabular-nums font-bold">
                  {doneTasks}/{totalTasks} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-[#08150a] h-2 border border-[#0e2513] overflow-hidden">
                <div
                  className="h-full bg-[#22c55e] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-[#15803d] text-right">
                {totalTasks - doneTasks} tarefas pendentes
              </div>
            </div>
          </div>

          {/* Section Filter Tabs */}
          <div className="mt-4 pt-3 border-t border-[#0e2413] flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 text-xs font-mono transition-colors ${
                activeTab === 'all'
                  ? 'bg-[#0f2c15] text-[#22c55e] border border-[#22c55e]'
                  : 'text-[#166534] hover:text-[#86efac] border border-transparent'
              }`}
            >
              [ TODOS OS BLOCOS ]
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-1 text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'bg-[#0f2c15] text-[#22c55e] border border-[#22c55e]'
                  : 'text-[#166534] hover:text-[#86efac] border border-transparent'
              }`}
            >
              <ListTodo size={12} />
              <span>TAREFAS ({project.tasks.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1 text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'bg-[#0f2c15] text-[#22c55e] border border-[#22c55e]'
                  : 'text-[#166534] hover:text-[#86efac] border border-transparent'
              }`}
            >
              <FileText size={12} />
              <span>OBSERVAÇÕES ({project.observations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'code'
                  ? 'bg-[#0f2c15] text-[#22c55e] border border-[#22c55e]'
                  : 'text-[#166534] hover:text-[#86efac] border border-transparent'
              }`}
            >
              <Code size={12} />
              <span>SNIPPETS ({project.codeSnippets.length})</span>
            </button>
          </div>
        </section>

        {/* 1. TASKS & SUBTASKS SECTION */}
        {(activeTab === 'all' || activeTab === 'tasks') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#14351a] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[#22c55e] font-mono text-sm">#01</span>
                <h2 className="text-sm font-mono font-bold tracking-wider text-[#22c55e]">
                  TAREFAS E SUBTAREFAS
                </h2>
              </div>

              {/* Task Status Filters */}
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {(['all', 'pending', 'done'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTaskFilter(filter)}
                    className={`px-2 py-0.5 transition-colors ${
                      taskFilter === filter
                        ? 'bg-[#103417] text-[#22c55e] border border-[#22c55e]'
                        : 'text-[#15803d] hover:text-[#4ade80]'
                    }`}
                  >
                    {filter === 'all' ? 'Todas' : filter === 'pending' ? 'Pendentes' : 'Concluídas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Terminal Tag Filter Chips (if project has tags) */}
            {allProjectTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 py-1 px-1 bg-[#020703] border border-[#0d2212]">
                <span className="text-[10px] font-mono text-[#15803d] uppercase tracking-wider flex items-center gap-1 pl-1">
                  <Tag size={10} />
                  <span>Tags:</span>
                </span>
                {allProjectTags.map((tag) => {
                  const isSelected = selectedTagFilter === tag;
                  const style = getTerminalTagStyle(tag);
                  const count = project.tasks.filter((t) => t.tags?.includes(tag)).length;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        sound.playClick(700);
                        setSelectedTagFilter(isSelected ? null : tag);
                      }}
                      className={`px-1.5 py-0.5 text-[10px] font-mono border transition-all ${
                        style.border
                      } ${style.text} ${style.bg} ${
                        isSelected
                          ? 'ring-1 ring-[#22c55e] font-bold shadow-[0_0_8px_rgba(34,197,94,0.35)]'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      #{tag} <span className="text-[9px] opacity-70">({count})</span>
                    </button>
                  );
                })}
                {selectedTagFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(600);
                      setSelectedTagFilter(null);
                    }}
                    className="text-[10px] font-mono text-red-400 hover:text-red-300 underline flex items-center gap-0.5 ml-1"
                  >
                    <X size={10} />
                    <span>Limpar filtro</span>
                  </button>
                )}
              </div>
            )}

            {/* Quick Add Task Input with Optional Tags */}
            <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-[#050f07] border border-[#14351a] px-3 py-2 focus-within:border-[#22c55e]">
                <span className="text-[#22c55e] font-mono text-xs">&gt;</span>
                <input
                  ref={newTaskInputRef}
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Adicionar nova tarefa... (Pressione 'T' para focar, use #tags)"
                  className="w-full bg-transparent text-xs font-mono text-[#86efac] placeholder-[#15803d] focus:outline-hidden"
                />
                <span className="terminal-block-cursor"></span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-32 sm:w-36 flex items-center gap-1.5 bg-[#050f07] border border-[#14351a] px-2 py-2 focus-within:border-[#22c55e]">
                  <Tag size={11} className="text-[#15803d] shrink-0" />
                  <input
                    type="text"
                    value={newTaskTagsInput}
                    onChange={(e) => setNewTaskTagsInput(e.target.value)}
                    placeholder="tags (ex: api, db)"
                    className="w-full bg-transparent text-xs font-mono text-[#22c55e] placeholder-[#15803d] focus:outline-hidden"
                  />
                  <span className="terminal-underscore-cursor"></span>
                </div>

                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'med' | 'high')}
                  className="bg-[#050f07] border border-[#14351a] text-xs font-mono text-[#22c55e] px-2 py-2 focus:outline-hidden"
                >
                  <option value="low">PRIORIDADE BAIXA</option>
                  <option value="med">PRIORIDADE NORMAL</option>
                  <option value="high">ALTA PRIORIDADE [CRIT]</option>
                </select>

                <button
                  type="submit"
                  className="px-3 py-2 bg-[#0e2c14] hover:bg-[#14421d] border border-[#22c55e] text-xs font-mono text-[#22c55e] flex items-center gap-1 transition-colors shrink-0"
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">ADICIONAR</span>
                </button>
              </div>
            </form>

            {/* Task Items List */}
            <div className="space-y-2">
              {visibleTasks.length === 0 ? (
                <div className="p-4 text-center font-mono text-xs text-[#15803d] border border-dashed border-[#102a15] bg-[#030804]">
                  {selectedTagFilter
                    ? `Nenhuma tarefa com a tag #${selectedTagFilter}.`
                    : taskFilter === 'done'
                    ? 'Nenhuma tarefa marcada como concluída ainda.'
                    : 'Nenhuma tarefa pendente neste filtro.'}
                </div>
              ) : (
                visibleTasks.map((task) => {
                  const isExpanded = !!expandedTaskIds[task.id] || task.subtasks.length > 0;
                  const totalSubs = task.subtasks.length;
                  const doneSubs = task.subtasks.filter((s) => s.done).length;
                  const isSelected = selectedTaskId === task.id;
                  const isHighlighted = highlightedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      id={`task-item-${task.id}`}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`border transition-all cursor-pointer ${
                        isHighlighted
                          ? 'border-[#22c55e] ring-2 ring-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.4)] bg-[#0a2310]'
                          : isSelected
                          ? 'border-[#22c55e] ring-1 ring-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.2)] bg-[#07170a]'
                          : task.done
                          ? 'border-[#0c1f10] bg-[#030804]/90 opacity-80'
                          : 'border-[#14351a] bg-[#040c06] hover:border-[#1d4f26]'
                      }`}
                    >
                      {/* Main Task Row */}
                      <div className="p-3 flex items-start gap-2.5">
                        {/* Custom Matrix Checkbox */}
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className={`mt-0.5 w-4 h-4 rounded-none border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            task.done
                              ? 'bg-[#22c55e] border-[#22c55e] text-black shadow-[0_0_8px_#22c55e]'
                              : 'bg-[#030704] border-[#166534] hover:border-[#22c55e]'
                          }`}
                          title={task.done ? 'Desmarcar' : 'Marcar como concluída'}
                        >
                          {task.done && <Check size={11} strokeWidth={3} />}
                        </button>

                        {/* Task Text & Metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center flex-1">
                              <input
                                type="text"
                                value={task.text}
                                onChange={(e) => handleUpdateTaskText(task.id, e.target.value)}
                                className={`w-full bg-transparent text-xs font-mono focus:outline-hidden focus:bg-[#07170a] px-1 -mx-1 ${
                                  task.done
                                    ? 'line-through text-[#15803d]'
                                    : 'text-[#86efac] font-medium'
                                }`}
                              />
                              <span className="terminal-underscore-cursor"></span>
                            </div>
                            {task.priority === 'high' && (
                              <span className="text-[10px] font-mono text-emerald-400 bg-[#092211] border border-[#1b5e2b] px-1 py-0.2 shrink-0">
                                CRIT
                              </span>
                            )}
                          </div>

                          {/* Task Note if exists */}
                          {task.notes && (
                            <p className="mt-1 text-[11px] font-mono text-[#15803d]">
                              // {task.notes}
                            </p>
                          )}

                          {/* Color-Coded Terminal-Style Labels */}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {task.tags && task.tags.map((tag) => {
                              const style = getTerminalTagStyle(tag);
                              const isFiltered = selectedTagFilter === tag;
                              return (
                                <span
                                  key={tag}
                                  onClick={() => {
                                    sound.playClick(650);
                                    setSelectedTagFilter(isFiltered ? null : tag);
                                  }}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono border ${style.border} ${style.text} ${style.bg} cursor-pointer transition-all ${
                                    isFiltered ? 'ring-1 ring-[#22c55e] font-bold shadow-[0_0_6px_rgba(34,197,94,0.3)]' : ''
                                  }`}
                                  title={`Filtrar tarefas por #${tag}`}
                                >
                                  <span>#{tag}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTag(task.id, tag);
                                    }}
                                    className="hover:text-red-400 text-[10px] leading-none opacity-60 hover:opacity-100"
                                    title="Remover tag"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}

                            {/* Add Tag Inline Button/Input */}
                            {tagInputTaskId === task.id ? (
                              <div className="inline-flex items-center gap-1">
                                <div className="flex items-center bg-[#030704] border border-[#22c55e] px-1 py-0.5">
                                  <input
                                    type="text"
                                    value={newTagInputVal}
                                    onChange={(e) => setNewTagInputVal(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTagToTask(task.id);
                                      } else if (e.key === 'Escape') {
                                        setTagInputTaskId(null);
                                        setNewTagInputVal('');
                                      }
                                    }}
                                    autoFocus
                                    placeholder="tag..."
                                    className="w-16 bg-transparent text-[10px] font-mono text-[#22c55e] focus:outline-hidden"
                                  />
                                  <span className="terminal-block-cursor" style={{ width: '0.4em', height: '0.85em' }}></span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddTagToTask(task.id)}
                                  className="text-[10px] font-mono text-[#22c55e] hover:text-white px-1"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTagInputTaskId(null);
                                    setNewTagInputVal('');
                                  }}
                                  className="text-[10px] text-[#15803d] hover:text-red-400 px-0.5"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  sound.playClick(600);
                                  setTagInputTaskId(task.id);
                                  setNewTagInputVal('');
                                }}
                                className="inline-flex items-center gap-0.5 text-[10px] font-mono text-[#15803d] hover:text-[#4ade80] px-1.5 py-0.5 border border-dashed border-[#14351a] hover:border-[#22c55e] transition-colors"
                                title="Adicionar tag a esta tarefa"
                              >
                                <Plus size={9} />
                                <span>tag</span>
                              </button>
                            )}
                          </div>

                          {/* Subtask Status Info */}
                          {totalSubs > 0 && (
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-[#166534]">
                              <button
                                onClick={() =>
                                  setExpandedTaskIds((prev) => ({
                                    ...prev,
                                    [task.id]: !prev[task.id],
                                  }))
                                }
                                className="flex items-center gap-1 hover:text-[#4ade80]"
                              >
                                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                <span>
                                  {doneSubs}/{totalSubs} subtarefas
                                </span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() =>
                              setExpandedTaskIds((prev) => ({
                                ...prev,
                                [task.id]: !prev[task.id],
                              }))
                            }
                            className="p-1 text-[#15803d] hover:text-[#22c55e] transition-colors"
                            title="Expandir/recolher subtarefas"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-[#15803d] hover:text-red-400 transition-colors"
                            title="Excluir tarefa"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Subtasks Accordion Box */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-[#0b1c0e] bg-[#020603] space-y-1.5">
                          {/* Subtasks items */}
                          {task.subtasks.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center gap-2 pl-4 py-1 group/sub text-xs font-mono"
                            >
                              <span className="text-[#102b15] font-mono">├──</span>
                              <button
                                onClick={() => handleToggleSubtask(task.id, sub.id)}
                                className={`w-3.5 h-3.5 rounded-none border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                  sub.done
                                    ? 'bg-[#22c55e] border-[#22c55e] text-black shadow-[0_0_6px_#22c55e]'
                                    : 'bg-[#030704] border-[#166534] hover:border-[#22c55e]'
                                }`}
                              >
                                {sub.done && <Check size={10} strokeWidth={3} />}
                              </button>

                              <div className="flex items-center flex-1">
                                <input
                                  type="text"
                                  value={sub.text}
                                  onChange={(e) =>
                                    handleUpdateSubtaskText(task.id, sub.id, e.target.value)
                                  }
                                  className={`w-full bg-transparent text-xs font-mono focus:outline-hidden focus:bg-[#07170a] px-1 ${
                                    sub.done
                                      ? 'line-through text-[#15803d]'
                                      : 'text-[#86efac]/90'
                                  }`}
                                />
                                <span className="terminal-underscore-cursor"></span>
                              </div>

                              <button
                                onClick={() => handleDeleteSubtask(task.id, sub.id)}
                                className="opacity-0 group-hover/sub:opacity-100 text-[#15803d] hover:text-red-400 p-0.5 transition-opacity"
                                title="Excluir subtarefa"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}

                          {/* Add Subtask Input Form */}
                          <div className="flex items-center gap-2 pl-4 pt-1">
                            <span className="text-[#102b15] font-mono">└──</span>
                            <div className="flex-1 flex items-center bg-[#040d05] border border-[#102914] focus-within:border-[#22c55e] px-2 py-1">
                              <input
                                type="text"
                                value={newSubtaskInputs[task.id] || ''}
                                onChange={(e) =>
                                  setNewSubtaskInputs((prev) => ({
                                    ...prev,
                                    [task.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSubtask(task.id);
                                  }
                                }}
                                placeholder="+ Adicionar subtarefa... (Pressione Enter)"
                                className="w-full bg-transparent text-[11px] font-mono text-[#22c55e] placeholder-[#15803d] focus:outline-hidden"
                              />
                              <span className="terminal-block-cursor" style={{ width: '0.45em', height: '0.9em' }}></span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddSubtask(task.id)}
                              className="px-2 py-1 bg-[#091f0e] border border-[#14351a] hover:border-[#22c55e] text-[10px] font-mono text-[#22c55e]"
                            >
                              + SUB
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* 2. OBSERVATIONS & TECHNICAL NOTES SECTION */}
        {(activeTab === 'all' || activeTab === 'notes') && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[#14351a] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[#22c55e] font-mono text-sm">#02</span>
                <h2 className="text-sm font-mono font-bold tracking-wider text-[#22c55e]">
                  OBSERVAÇÕES E NOTAS TÉCNICAS
                </h2>
              </div>

              <button
                onClick={handleAddObservation}
                className="px-2.5 py-1 bg-[#08180b] hover:bg-[#0e2c14] border border-[#22c55e] text-xs font-mono text-[#22c55e] flex items-center gap-1 transition-colors"
              >
                <Plus size={12} />
                <span>NOVA OBSERVAÇÃO</span>
              </button>
            </div>

            {project.observations.length === 0 ? (
              <div className="p-4 text-center font-mono text-xs text-[#15803d] border border-dashed border-[#102a15] bg-[#030804]">
                Nenhuma observação técnica registrada ainda. Clique em "+ Nova Observação" para anotar decisões, links ou logs.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {project.observations.map((obs) => {
                  const isEditing = editingNoteId === obs.id;

                  return (
                    <div
                      key={obs.id}
                      className="border border-[#14351a] bg-[#040c06] hover:border-[#1d4f26] p-4 font-mono transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#0d2212]">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={obs.tag || 'NOTAS'}
                            onChange={(e) =>
                              handleUpdateObservation(obs.id, { tag: e.target.value.toUpperCase() })
                            }
                            className="text-[10px] text-[#15803d] font-mono bg-transparent border-b border-transparent hover:border-[#14351a] focus:border-[#22c55e] focus:outline-hidden w-24"
                          />
                          <span className="text-[#102b15]">·</span>
                          <div className="flex items-center flex-1">
                            <input
                              type="text"
                              value={obs.title}
                              onChange={(e) =>
                                handleUpdateObservation(obs.id, { title: e.target.value })
                              }
                              className="text-xs font-bold text-[#22c55e] bg-transparent focus:outline-hidden flex-1"
                            />
                            {isEditing && <span className="terminal-underscore-cursor"></span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setEditingNoteId(isEditing ? null : obs.id)}
                            className="text-[10px] text-[#15803d] hover:text-[#22c55e] px-1.5 py-0.5 border border-[#14351a]"
                          >
                            {isEditing ? 'VISUALIZAR' : 'EDITAR'}
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${obs.title}\n\n${obs.content}`);
                              sound.playClick(900);
                            }}
                            className="text-[#15803d] hover:text-[#22c55e] p-1"
                            title="Copiar texto da observação"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteObservation(obs.id)}
                            className="text-[#15803d] hover:text-red-400 p-1"
                            title="Excluir observação"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Content view / edit */}
                      <div className="mt-2.5">
                        {isEditing ? (
                          <textarea
                            value={obs.content}
                            onChange={(e) =>
                              handleUpdateObservation(obs.id, { content: e.target.value })
                            }
                            rows={6}
                            className="w-full bg-[#020502] border border-[#14351a] p-2 text-xs font-mono text-[#86efac] focus:outline-hidden focus:border-[#22c55e] resize-y"
                            placeholder="Digite suas observações ou copie logs aqui..."
                          />
                        ) : (
                          <div className="text-xs text-[#86efac]/90 whitespace-pre-wrap leading-relaxed">
                            {obs.content}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-[10px] text-[#15803d] text-right">
                        ATUALIZADO EM: {new Date(obs.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 3. CODE & CONFIG SNIPPETS SECTION */}
        {(activeTab === 'all' || activeTab === 'code') && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[#14351a] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[#22c55e] font-mono text-sm">#03</span>
                <h2 className="text-sm font-mono font-bold tracking-wider text-[#22c55e]">
                  SNIPPETS & SCRIPTS DO PROJETO
                </h2>
              </div>

              <button
                onClick={handleAddSnippet}
                className="px-2.5 py-1 bg-[#08180b] hover:bg-[#0e2c14] border border-[#22c55e] text-xs font-mono text-[#22c55e] flex items-center gap-1 transition-colors"
              >
                <Plus size={12} />
                <span>NOVO SNIPPET</span>
              </button>
            </div>

            {project.codeSnippets.length === 0 ? (
              <div className="p-4 text-center font-mono text-xs text-[#15803d] border border-dashed border-[#102a15] bg-[#030804]">
                Nenhum snippet ou arquivo de configuração registrado para este projeto.
              </div>
            ) : (
              <div className="space-y-3">
                {project.codeSnippets.map((snip) => (
                  <div
                    key={snip.id}
                    className="border border-[#14351a] bg-[#020502] overflow-hidden font-mono"
                  >
                    {/* Header */}
                    <div className="bg-[#051107] px-3 py-2 border-b border-[#102914] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Terminal size={13} className="text-[#22c55e]" />
                        <div className="flex items-center flex-1">
                          <input
                            type="text"
                            value={snip.title}
                            onChange={(e) =>
                              handleUpdateSnippet(snip.id, { title: e.target.value })
                            }
                            className="bg-transparent text-xs font-semibold text-[#22c55e] focus:outline-hidden flex-1"
                          />
                          <span className="terminal-underscore-cursor"></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={snip.language}
                          onChange={(e) =>
                            handleUpdateSnippet(snip.id, { language: e.target.value })
                          }
                          className="bg-[#030704] border border-[#14351a] text-[10px] font-mono text-[#86efac] px-2 py-0.5 focus:outline-hidden"
                        >
                          <option value="typescript">TypeScript</option>
                          <option value="javascript">JavaScript</option>
                          <option value="bash">Bash / Shell</option>
                          <option value="yaml">YAML / Docker</option>
                          <option value="json">JSON</option>
                          <option value="sql">SQL</option>
                          <option value="python">Python</option>
                          <option value="markdown">Markdown</option>
                        </select>

                        <button
                          onClick={() => handleCopyCode(snip.id, snip.code)}
                          className="flex items-center gap-1 text-[10px] text-[#22c55e] hover:text-white px-2 py-0.5 bg-[#092211] border border-[#1b5e2b] transition-colors"
                        >
                          {copiedCodeId === snip.id ? (
                            <>
                              <Check size={11} />
                              <span>COPIADO</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>COPIAR</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteSnippet(snip.id)}
                          className="text-[#15803d] hover:text-red-400 p-0.5"
                          title="Excluir snippet"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Code Editor Body */}
                    <div className="p-3">
                      <textarea
                        value={snip.code}
                        onChange={(e) =>
                          handleUpdateSnippet(snip.id, { code: e.target.value })
                        }
                        rows={Math.min(18, Math.max(5, snip.code.split('\n').length + 1))}
                        spellCheck={false}
                        className="w-full bg-transparent text-xs font-mono text-[#86efac] focus:outline-hidden resize-y leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Persistent Linux/Git Cheatsheet Status Bar */}
      <footer className="px-4 py-1.5 bg-[#020603] border-t border-[#102914] text-[10px] font-mono text-[#15803d] flex items-center justify-between overflow-x-auto shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenManual}
            className="text-[#22c55e] hover:underline flex items-center gap-1 font-semibold"
            title="Abrir Manual Completo (man operator)"
          >
            <span>[?] MANUAL COMPLETO</span>
          </button>
          <span className="text-[#0d2212]">|</span>
          <span className="hidden sm:inline">
            <kbd className="text-[#86efac]">T</kbd> nova tarefa
          </span>
          <span className="hidden sm:inline">
            <kbd className="text-[#86efac]">J/K</kbd> navegar
          </span>
          <span className="hidden sm:inline">
            <kbd className="text-[#86efac]">X</kbd> marcar/desmarcar
          </span>
          <span className="hidden md:inline">
            <kbd className="text-[#86efac]">1-4</kbd> alternar abas
          </span>
          <span className="hidden lg:inline">
            <kbd className="text-[#86efac]">Ctrl+K</kbd> terminal CLI
          </span>
        </div>

        <div className="text-[10px] text-[#166534] tabular-nums hidden sm:flex items-center gap-2">
          <span>{visibleTasks.length} TAREFAS VISÍVEIS</span>
        </div>
      </footer>
    </main>
  );
};
