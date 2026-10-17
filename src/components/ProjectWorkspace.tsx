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
  Cloud,
  HardDrive
} from 'lucide-react';
import { sound } from '../utils/audio';
import { getTerminalTagStyle } from '../utils/tagColors';
import { User } from '@supabase/supabase-js';
import { PWAInstallButton } from './PWAInstallButton';
import { SyncStatus } from '../sync/useCloudSync';
import { useT, useLang, localeOf } from '../i18n';
import { ProjectAttachments } from './ProjectAttachments';

interface ProjectWorkspaceProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onOpenMobileMenu: () => void;
  onCopyMarkdown: () => void;
  onOpenManual: () => void;
  onOpenBackup: () => void;
  onOpenAuth?: () => void;
  user?: User | null;
  onShowToast?: (msg: string) => void;
  highlightedTaskId?: string | null;
  syncStatus?: SyncStatus;
  pendingSyncCount?: number;
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
  onShowToast,
  highlightedTaskId,
  syncStatus = 'local',
  pendingSyncCount = 0,
}) => {
  const t = useT();
  const lang = useLang();
  const syncLabel = (status: SyncStatus, n: number) => {
    const s = t.workspace.sync;
    return status === 'pending' ? s.pending(n) : status === 'error' ? s.error(n) : s[status];
  };
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'notes' | 'code' | 'files'>('all');
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
  const doneTasks = project.tasks.filter((task) => task.done).length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Task Operations
  const handleToggleTask = (taskId: string) => {
    const updatedTasks = project.tasks.map((task) => {
      if (task.id === taskId) {
        const nextDone = !task.done;
        sound.playCheck(nextDone);
        // Also toggle all subtasks if marking complete
        const updatedSubtasks = nextDone
          ? task.subtasks.map((s) => ({ ...s, done: true }))
          : task.subtasks;
        return { ...task, done: nextDone, subtasks: updatedSubtasks };
      }
      return task;
    });
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const updatedTasks = project.tasks.map((task) => {
      if (task.id === taskId) {
        const updatedSubs = task.subtasks.map((s) => {
          if (s.id === subtaskId) {
            const nextDone = !s.done;
            sound.playCheck(nextDone);
            return { ...s, done: nextDone };
          }
          return s;
        });
        const allSubsDone = updatedSubs.length > 0 && updatedSubs.every((s) => s.done);
        return {
          ...task,
          subtasks: updatedSubs,
          done: allSubsDone ? true : task.done,
        };
      }
      return task;
    });
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    // Extract hashtags from task text
    const textHashtags = (newTaskText.match(/#([a-zA-Z0-9_-]+)/g) || []).map((tg) =>
      tg.slice(1).toLowerCase()
    );

    // Extract tags from tags input field
    const explicitTags = newTaskTagsInput
      .split(/[,;\s]+/)
      .map((tg) => tg.trim().toLowerCase().replace(/^#/, ''))
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

    const updatedTasks = project.tasks.map((task) => {
      if (task.id === taskId) {
        const current = task.tags || [];
        if (!current.includes(tag)) {
          return { ...task, tags: [...current, tag] };
        }
      }
      return task;
    });

    sound.playClick(750);
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
    setNewTagInputVal('');
    setTagInputTaskId(null);
  };

  const handleRemoveTag = (taskId: string, tagToRemove: string) => {
    const updatedTasks = project.tasks.map((task) => {
      if (task.id === taskId && task.tags) {
        const remaining = task.tags.filter((tg) => tg !== tagToRemove);
        return { ...task, tags: remaining.length > 0 ? remaining : undefined };
      }
      return task;
    });

    sound.playClick(450);
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleDeleteTask = (taskId: string) => {
    sound.playClick(400);
    const updatedTasks = project.tasks.filter((task) => task.id !== taskId);
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleAddSubtask = (taskId: string) => {
    const text = newSubtaskInputs[taskId]?.trim();
    if (!text) return;

    const updatedTasks = project.tasks.map((task) => {
      if (task.id === taskId) {
        const newSub: SubTask = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          text,
          done: false,
          createdAt: Date.now(),
        };
        return {
          ...task,
          done: false, // If adding a subtask, task is not 100% complete
          subtasks: [...task.subtasks, newSub],
        };
      }
      return task;
    });

    sound.playClick(750);
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
    setNewSubtaskInputs((prev) => ({ ...prev, [taskId]: '' }));
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: true }));
  };

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    sound.playClick(450);
    const updatedTasks = project.tasks.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.filter((s) => s.id !== subtaskId),
        };
      }
      return task;
    });
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleUpdateTaskText = (taskId: string, newText: string) => {
    const updatedTasks = project.tasks.map((task) =>
      task.id === taskId ? { ...task, text: newText } : task
    );
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  const handleUpdateSubtaskText = (taskId: string, subId: string, newText: string) => {
    const updatedTasks = project.tasks.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.map((s) => (s.id === subId ? { ...s, text: newText } : s)),
        };
      }
      return task;
    });
    onUpdateProject({ ...project, tasks: updatedTasks, updatedAt: Date.now() });
  };

  // Observations Operations
  const handleAddObservation = () => {
    const newObs: Observation = {
      id: `obs-${Date.now()}`,
      title: t.workspace.newNoteTitle,
      content: t.workspace.newNoteContent,
      tag: t.workspace.notesTag,
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
      code: t.workspace.newSnippetCode,
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
    new Set(project.tasks.flatMap((task) => task.tags || []))
  ).sort();

  // Filter tasks based on status and selected tag
  const visibleTasks = project.tasks.filter((task) => {
    if (taskFilter === 'pending' && task.done) return false;
    if (taskFilter === 'done' && !task.done) return false;
    if (selectedTagFilter && (!task.tags || !task.tags.includes(selectedTagFilter))) return false;
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
      if (e.key === '5') {
        setActiveTab('files');
        sound.playClick(650);
        return;
      }

      // Task list navigation (Vim j/k)
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (visibleTasks.length === 0) return;
        const currentIndex = visibleTasks.findIndex((task) => task.id === selectedTaskId);
        const nextIndex = currentIndex < visibleTasks.length - 1 ? currentIndex + 1 : 0;
        setSelectedTaskId(visibleTasks[nextIndex].id);
        sound.playClick(500);
        return;
      }

      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (visibleTasks.length === 0) return;
        const currentIndex = visibleTasks.findIndex((task) => task.id === selectedTaskId);
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
    <main className="flex-1 flex flex-col h-full bg-transparent text-[color:var(--t-86efac)] overflow-hidden">
      {/* Top Breadcrumb & Actions Bar */}
      <header className="px-4 py-3 bg-[color:var(--t-050e06)] border-b border-[color:var(--t-14351a)] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden text-[color:var(--t-22c55e)] hover:text-white p-1"
          >
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[color:var(--t-21a04d)] truncate">
            <span>OPERATOR</span>
            <span>&gt;</span>
            <span>{t.workspace.breadcrumbProjects}</span>
            <span>&gt;</span>
            <span className="text-[color:var(--t-22c55e)] font-semibold truncate">{project.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              onOpenAuth?.();
              sound.playClick(750);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono transition-colors border ${
              syncStatus === 'error'
                ? 'bg-[#120803] border-amber-600/90 text-amber-400'
                : user
                ? 'bg-[color:var(--t-081a0b)] border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)]'
                : 'bg-[color:var(--t-07170a)] border-[color:var(--t-14351a)] hover:border-[color:var(--t-22c55e)] text-[color:var(--t-86efac)]'
            }`}
            title={
              !user
                ? t.workspace.connectTitle
                : syncStatus === 'error'
                  ? t.workspace.syncErrorTitle(pendingSyncCount, user.email || '')
                  : t.workspace.syncActiveTitle(user.email || '')
            }
          >
            <Cloud
              size={12}
              className={
                syncStatus === 'error'
                  ? 'text-amber-400'
                  : user
                    ? `text-[color:var(--t-22c55e)] ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`
                    : 'text-[color:var(--t-21a04d)]'
              }
            />
            <span className="hidden md:inline">{syncLabel(syncStatus, pendingSyncCount)}</span>
          </button>

          <PWAInstallButton variant="header" />

          <button
            onClick={() => {
              onOpenBackup();
              sound.playClick(750);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[color:var(--t-07170a)] hover:bg-[color:var(--t-0e2c14)] border border-[color:var(--t-14351a)] hover:border-[color:var(--t-22c55e)] text-[color:var(--t-86efac)] transition-colors"
            title={t.workspace.backupTitle}
          >
            <Database size={12} className="text-[color:var(--t-22c55e)]" />
            <span className="hidden sm:inline">Backup JSON</span>
          </button>

          <button
            onClick={() => {
              onOpenManual();
              sound.playClick(750);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[color:var(--t-07170a)] hover:bg-[color:var(--t-0e2c14)] border border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)] transition-colors"
            title={t.workspace.manualTitle}
          >
            <BookOpen size={12} />
            <span className="hidden sm:inline">Manual [?]</span>
          </button>

          <button
            onClick={() => {
              onCopyMarkdown();
              sound.playClick(850);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[color:var(--t-07170a)] hover:bg-[color:var(--t-0e2c14)] border border-[color:var(--t-14351a)] text-[color:var(--t-86efac)] transition-colors"
            title={t.workspace.exportTitle}
          >
            <Copy size={12} className="text-[color:var(--t-22c55e)]" />
            <span className="hidden sm:inline">{t.workspace.exportMd}</span>
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
            className="bg-[color:var(--t-030704)] border border-[color:var(--t-14351a)] text-[11px] font-mono text-[color:var(--t-22c55e)] px-2 py-1 focus:outline-hidden cursor-pointer"
          >
            <option value="active">{t.workspace.status.active}</option>
            <option value="in_progress">{t.workspace.status.in_progress}</option>
            <option value="standby">{t.workspace.status.standby}</option>
            <option value="completed">{t.workspace.status.completed}</option>
          </select>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Project Header Info */}
        <section className="border border-[color:var(--t-14351a)] bg-[color:var(--t-050f07)] p-4 md:p-5 relative">
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
                    className="text-[10px] font-mono tracking-widest text-[color:var(--t-21a04d)] uppercase bg-transparent border-b border-transparent hover:border-[color:var(--t-14351a)] focus:border-[color:var(--t-22c55e)] focus:outline-hidden w-36"
                    placeholder={t.workspace.categoryPlaceholder}
                  />
                  <span className="terminal-underscore-cursor"></span>
                </div>
                <span className="text-[10px] text-[color:var(--t-21a04d)]">·</span>
                <span className="text-[10px] font-mono text-[color:var(--t-21a04d)]">
                  {t.workspace.lastUpdate} {new Date(project.updatedAt).toLocaleTimeString(localeOf(lang), { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Title */}
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-[color:var(--t-030704)] border border-[color:var(--t-22c55e)] px-2 py-1">
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
                      className="w-full text-lg md:text-xl font-mono font-bold bg-transparent text-[color:var(--t-22c55e)] focus:outline-hidden"
                    />
                    <span className="terminal-block-cursor"></span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-lg md:text-xl font-mono font-bold text-[color:var(--t-22c55e)] matrix-glow">
                    {project.title}
                  </h1>
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="opacity-0 group-hover:opacity-100 text-[color:var(--t-21a04d)] hover:text-[color:var(--t-22c55e)] transition-opacity"
                    title={t.workspace.editTitle}
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
                    className="w-full text-xs font-mono bg-[color:var(--t-030704)] border border-[color:var(--t-22c55e)] text-[color:var(--t-86efac)] p-2 focus:outline-hidden resize-none"
                  />
                </div>
              ) : (
                <p
                  onClick={() => setEditingDesc(true)}
                  className="text-xs font-mono text-[color:var(--t-86efac)]/80 hover:text-white cursor-pointer transition-colors"
                  title={t.workspace.editDesc}
                >
                  {project.description || t.workspace.descPlaceholder}
                </p>
              )}
            </div>

            {/* ASCII / Segmented Progress Meter */}
            <div className="bg-[color:var(--t-030704)] border border-[color:var(--t-14351a)] p-3 shrink-0 md:w-60 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-[color:var(--t-21a04d)] mb-1">
                <span>{t.workspace.progress}</span>
                <span className="text-[color:var(--t-22c55e)] tabular-nums font-bold">
                  {doneTasks}/{totalTasks} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-[color:var(--t-08150a)] h-2 border border-[color:var(--t-0e2513)] overflow-hidden">
                <div
                  className="h-full bg-[color:var(--t-22c55e)] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-[color:var(--t-21a04d)] text-right">
                {t.workspace.pendingTasks(totalTasks - doneTasks)}
              </div>
            </div>
          </div>

          {/* Section Filter Tabs */}
          <div className="mt-4 pt-3 border-t border-[color:var(--t-0e2413)] flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 text-xs font-mono transition-colors ${
                activeTab === 'all'
                  ? 'bg-[color:var(--t-0f2c15)] text-[color:var(--t-22c55e)] border border-[color:var(--t-22c55e)]'
                  : 'text-[color:var(--t-21a04d)] hover:text-[color:var(--t-86efac)] border border-transparent'
              }`}
            >
              {t.workspace.tabs.all}
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-1 text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'bg-[color:var(--t-0f2c15)] text-[color:var(--t-22c55e)] border border-[color:var(--t-22c55e)]'
                  : 'text-[color:var(--t-21a04d)] hover:text-[color:var(--t-86efac)] border border-transparent'
              }`}
            >
              <ListTodo size={12} />
              <span>{t.workspace.tabs.tasks} ({project.tasks.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1 text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'bg-[color:var(--t-0f2c15)] text-[color:var(--t-22c55e)] border border-[color:var(--t-22c55e)]'
                  : 'text-[color:var(--t-21a04d)] hover:text-[color:var(--t-86efac)] border border-transparent'
              }`}
            >
              <FileText size={12} />
              <span>{t.workspace.tabs.notes} ({project.observations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'code'
                  ? 'bg-[color:var(--t-0f2c15)] text-[color:var(--t-22c55e)] border border-[color:var(--t-22c55e)]'
                  : 'text-[color:var(--t-21a04d)] hover:text-[color:var(--t-86efac)] border border-transparent'
              }`}
            >
              <Code size={12} />
              <span>{t.workspace.tabs.code} ({project.codeSnippets.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1 text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'files'
                  ? 'bg-[color:var(--t-0f2c15)] text-[color:var(--t-22c55e)] border border-[color:var(--t-22c55e)]'
                  : 'text-[color:var(--t-21a04d)] hover:text-[color:var(--t-86efac)] border border-transparent'
              }`}
            >
              <HardDrive size={12} />
              <span>{t.workspace.tabs.files} ({(project.attachments || []).length})</span>
            </button>
          </div>
        </section>

        {/* 1. TASKS & SUBTASKS SECTION */}
        {(activeTab === 'all' || activeTab === 'tasks') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[color:var(--t-14351a)] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--t-22c55e)] font-mono text-sm">#01</span>
                <h2 className="text-sm font-mono font-bold tracking-wider text-[color:var(--t-22c55e)]">
                  {t.workspace.tasksHeading}
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
                        ? 'bg-[color:var(--t-103417)] text-[color:var(--t-22c55e)] border border-[color:var(--t-22c55e)]'
                        : 'text-[color:var(--t-21a04d)] hover:text-[color:var(--t-4ade80)]'
                    }`}
                  >
                    {t.workspace.taskFilter[filter]}
                  </button>
                ))}
              </div>
            </div>

            {/* Terminal Tag Filter Chips (if project has tags) */}
            {allProjectTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 py-1 px-1 bg-[color:var(--t-020703)] border border-[color:var(--t-0d2212)]">
                <span className="text-[10px] font-mono text-[color:var(--t-21a04d)] uppercase tracking-wider flex items-center gap-1 pl-1">
                  <Tag size={10} />
                  <span>Tags:</span>
                </span>
                {allProjectTags.map((tag) => {
                  const isSelected = selectedTagFilter === tag;
                  const style = getTerminalTagStyle(tag);
                  const count = project.tasks.filter((task) => task.tags?.includes(tag)).length;
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
                          ? 'ring-1 ring-[color:var(--t-22c55e)] font-bold shadow-[0_0_8px_color-mix(in_srgb,var(--t-22c55e)_35%,transparent)]'
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
                    <span>{t.workspace.clearFilter}</span>
                  </button>
                )}
              </div>
            )}

            {/* Quick Add Task Input with Optional Tags */}
            <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-[color:var(--t-050f07)] border border-[color:var(--t-14351a)] px-3 py-2 focus-within:border-[color:var(--t-22c55e)]">
                <span className="text-[color:var(--t-22c55e)] font-mono text-xs">&gt;</span>
                <input
                  ref={newTaskInputRef}
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder={t.workspace.newTaskPlaceholder}
                  className="w-full bg-transparent text-xs font-mono text-[color:var(--t-86efac)] placeholder-[color:var(--t-21a04d)] focus:outline-hidden"
                />
                <span className="terminal-block-cursor"></span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-32 sm:w-36 flex items-center gap-1.5 bg-[color:var(--t-050f07)] border border-[color:var(--t-14351a)] px-2 py-2 focus-within:border-[color:var(--t-22c55e)]">
                  <Tag size={11} className="text-[color:var(--t-21a04d)] shrink-0" />
                  <input
                    type="text"
                    value={newTaskTagsInput}
                    onChange={(e) => setNewTaskTagsInput(e.target.value)}
                    placeholder={t.workspace.tagsPlaceholder}
                    className="w-full bg-transparent text-xs font-mono text-[color:var(--t-22c55e)] placeholder-[color:var(--t-21a04d)] focus:outline-hidden"
                  />
                  <span className="terminal-underscore-cursor"></span>
                </div>

                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'med' | 'high')}
                  className="bg-[color:var(--t-050f07)] border border-[color:var(--t-14351a)] text-xs font-mono text-[color:var(--t-22c55e)] px-2 py-2 focus:outline-hidden"
                >
                  <option value="low">{t.workspace.priority.low}</option>
                  <option value="med">{t.workspace.priority.med}</option>
                  <option value="high">{t.workspace.priority.high}</option>
                </select>

                <button
                  type="submit"
                  className="px-3 py-2 bg-[color:var(--t-0e2c14)] hover:bg-[color:var(--t-14421d)] border border-[color:var(--t-22c55e)] text-xs font-mono text-[color:var(--t-22c55e)] flex items-center gap-1 transition-colors shrink-0"
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">{t.workspace.add}</span>
                </button>
              </div>
            </form>

            {/* Task Items List */}
            <div className="space-y-2">
              {visibleTasks.length === 0 ? (
                <div className="p-4 text-center font-mono text-xs text-[color:var(--t-21a04d)] border border-dashed border-[color:var(--t-102a15)] bg-[color:var(--t-030804)]">
                  {selectedTagFilter
                    ? t.workspace.emptyTag(selectedTagFilter)
                    : taskFilter === 'done'
                    ? t.workspace.emptyDone
                    : t.workspace.emptyPending}
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
                          ? 'border-[color:var(--t-22c55e)] ring-2 ring-[color:var(--t-22c55e)] shadow-[0_0_20px_color-mix(in_srgb,var(--t-22c55e)_40%,transparent)] bg-[color:var(--t-0a2310)]'
                          : isSelected
                          ? 'border-[color:var(--t-22c55e)] ring-1 ring-[color:var(--t-22c55e)] shadow-[0_0_12px_color-mix(in_srgb,var(--t-22c55e)_20%,transparent)] bg-[color:var(--t-07170a)]'
                          : task.done
                          ? 'border-[color:var(--t-0c1f10)] bg-[color:var(--t-030804)]/90 opacity-80'
                          : 'border-[color:var(--t-14351a)] bg-[color:var(--t-040c06)] hover:border-[color:var(--t-1d4f26)]'
                      }`}
                    >
                      {/* Main Task Row */}
                      <div className="p-3 flex items-start gap-2.5">
                        {/* Custom Matrix Checkbox */}
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className={`mt-0.5 w-4 h-4 rounded-none border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            task.done
                              ? 'bg-[color:var(--t-22c55e)] border-[color:var(--t-22c55e)] text-black shadow-[0_0_8px_var(--t-22c55e)]'
                              : 'bg-[color:var(--t-030704)] border-[color:var(--t-166534)] hover:border-[color:var(--t-22c55e)]'
                          }`}
                          title={task.done ? t.workspace.uncheck : t.workspace.check}
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
                                className={`w-full bg-transparent text-xs font-mono focus:outline-hidden focus:bg-[color:var(--t-07170a)] px-1 -mx-1 ${
                                  task.done
                                    ? 'line-through text-[color:var(--t-21a04d)]'
                                    : 'text-[color:var(--t-86efac)] font-medium'
                                }`}
                              />
                              <span className="terminal-underscore-cursor"></span>
                            </div>
                            {task.priority === 'high' && (
                              <span className="text-[10px] font-mono text-emerald-400 bg-[color:var(--t-092211)] border border-[color:var(--t-1b5e2b)] px-1 py-0.2 shrink-0">
                                CRIT
                              </span>
                            )}
                          </div>

                          {/* Task Note if exists */}
                          {task.notes && (
                            <p className="mt-1 text-[11px] font-mono text-[color:var(--t-21a04d)]">
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
                                    isFiltered ? 'ring-1 ring-[color:var(--t-22c55e)] font-bold shadow-[0_0_6px_color-mix(in_srgb,var(--t-22c55e)_30%,transparent)]' : ''
                                  }`}
                                  title={t.workspace.filterByTag(tag)}
                                >
                                  <span>#{tag}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTag(task.id, tag);
                                    }}
                                    className="hover:text-red-400 text-[10px] leading-none opacity-60 hover:opacity-100"
                                    title={t.workspace.removeTag}
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}

                            {/* Add Tag Inline Button/Input */}
                            {tagInputTaskId === task.id ? (
                              <div className="inline-flex items-center gap-1">
                                <div className="flex items-center bg-[color:var(--t-030704)] border border-[color:var(--t-22c55e)] px-1 py-0.5">
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
                                    className="w-16 bg-transparent text-[10px] font-mono text-[color:var(--t-22c55e)] focus:outline-hidden"
                                  />
                                  <span className="terminal-block-cursor" style={{ width: '0.4em', height: '0.85em' }}></span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddTagToTask(task.id)}
                                  className="text-[10px] font-mono text-[color:var(--t-22c55e)] hover:text-white px-1"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTagInputTaskId(null);
                                    setNewTagInputVal('');
                                  }}
                                  className="text-[10px] text-[color:var(--t-21a04d)] hover:text-red-400 px-0.5"
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
                                className="inline-flex items-center gap-0.5 text-[10px] font-mono text-[color:var(--t-21a04d)] hover:text-[color:var(--t-4ade80)] px-1.5 py-0.5 border border-dashed border-[color:var(--t-14351a)] hover:border-[color:var(--t-22c55e)] transition-colors"
                                title={t.workspace.addTag}
                              >
                                <Plus size={9} />
                                <span>tag</span>
                              </button>
                            )}
                          </div>

                          {/* Subtask Status Info */}
                          {totalSubs > 0 && (
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-[color:var(--t-21a04d)]">
                              <button
                                onClick={() =>
                                  setExpandedTaskIds((prev) => ({
                                    ...prev,
                                    [task.id]: !prev[task.id],
                                  }))
                                }
                                className="flex items-center gap-1 hover:text-[color:var(--t-4ade80)]"
                              >
                                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                <span>
                                  {doneSubs}/{totalSubs} {t.workspace.subtasks}
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
                            className="p-1 text-[color:var(--t-21a04d)] hover:text-[color:var(--t-22c55e)] transition-colors"
                            title={t.workspace.toggleSubtasks}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-[color:var(--t-21a04d)] hover:text-red-400 transition-colors"
                            title={t.workspace.deleteTask}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Subtasks Accordion Box */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-[color:var(--t-0b1c0e)] bg-[color:var(--t-020603)] space-y-1.5">
                          {/* Subtasks items */}
                          {task.subtasks.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center gap-2 pl-4 py-1 group/sub text-xs font-mono"
                            >
                              <span className="text-[color:var(--t-102b15)] font-mono">├──</span>
                              <button
                                onClick={() => handleToggleSubtask(task.id, sub.id)}
                                className={`w-3.5 h-3.5 rounded-none border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                  sub.done
                                    ? 'bg-[color:var(--t-22c55e)] border-[color:var(--t-22c55e)] text-black shadow-[0_0_6px_var(--t-22c55e)]'
                                    : 'bg-[color:var(--t-030704)] border-[color:var(--t-166534)] hover:border-[color:var(--t-22c55e)]'
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
                                  className={`w-full bg-transparent text-xs font-mono focus:outline-hidden focus:bg-[color:var(--t-07170a)] px-1 ${
                                    sub.done
                                      ? 'line-through text-[color:var(--t-21a04d)]'
                                      : 'text-[color:var(--t-86efac)]/90'
                                  }`}
                                />
                                <span className="terminal-underscore-cursor"></span>
                              </div>

                              <button
                                onClick={() => handleDeleteSubtask(task.id, sub.id)}
                                className="opacity-0 group-hover/sub:opacity-100 text-[color:var(--t-21a04d)] hover:text-red-400 p-0.5 transition-opacity"
                                title={t.workspace.deleteSubtask}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}

                          {/* Add Subtask Input Form */}
                          <div className="flex items-center gap-2 pl-4 pt-1">
                            <span className="text-[color:var(--t-102b15)] font-mono">└──</span>
                            <div className="flex-1 flex items-center bg-[color:var(--t-040d05)] border border-[color:var(--t-102914)] focus-within:border-[color:var(--t-22c55e)] px-2 py-1">
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
                                placeholder={t.workspace.subtaskPlaceholder}
                                className="w-full bg-transparent text-[11px] font-mono text-[color:var(--t-22c55e)] placeholder-[color:var(--t-21a04d)] focus:outline-hidden"
                              />
                              <span className="terminal-block-cursor" style={{ width: '0.45em', height: '0.9em' }}></span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddSubtask(task.id)}
                              className="px-2 py-1 bg-[color:var(--t-091f0e)] border border-[color:var(--t-14351a)] hover:border-[color:var(--t-22c55e)] text-[10px] font-mono text-[color:var(--t-22c55e)]"
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
            <div className="flex items-center justify-between border-b border-[color:var(--t-14351a)] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--t-22c55e)] font-mono text-sm">#02</span>
                <h2 className="text-sm font-mono font-bold tracking-wider text-[color:var(--t-22c55e)]">
                  {t.workspace.notesHeading}
                </h2>
              </div>

              <button
                onClick={handleAddObservation}
                className="px-2.5 py-1 bg-[color:var(--t-08180b)] hover:bg-[color:var(--t-0e2c14)] border border-[color:var(--t-22c55e)] text-xs font-mono text-[color:var(--t-22c55e)] flex items-center gap-1 transition-colors"
              >
                <Plus size={12} />
                <span>{t.workspace.newNote}</span>
              </button>
            </div>

            {project.observations.length === 0 ? (
              <div className="p-4 text-center font-mono text-xs text-[color:var(--t-21a04d)] border border-dashed border-[color:var(--t-102a15)] bg-[color:var(--t-030804)]">
                {t.workspace.notesEmpty}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {project.observations.map((obs) => {
                  const isEditing = editingNoteId === obs.id;

                  return (
                    <div
                      key={obs.id}
                      className="border border-[color:var(--t-14351a)] bg-[color:var(--t-040c06)] hover:border-[color:var(--t-1d4f26)] p-4 font-mono transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[color:var(--t-0d2212)]">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={obs.tag || t.workspace.notesTag}
                            onChange={(e) =>
                              handleUpdateObservation(obs.id, { tag: e.target.value.toUpperCase() })
                            }
                            className="text-[10px] text-[color:var(--t-21a04d)] font-mono bg-transparent border-b border-transparent hover:border-[color:var(--t-14351a)] focus:border-[color:var(--t-22c55e)] focus:outline-hidden w-24"
                          />
                          <span className="text-[color:var(--t-102b15)]">·</span>
                          <div className="flex items-center flex-1">
                            <input
                              type="text"
                              value={obs.title}
                              onChange={(e) =>
                                handleUpdateObservation(obs.id, { title: e.target.value })
                              }
                              className="text-xs font-bold text-[color:var(--t-22c55e)] bg-transparent focus:outline-hidden flex-1"
                            />
                            {isEditing && <span className="terminal-underscore-cursor"></span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setEditingNoteId(isEditing ? null : obs.id)}
                            className="text-[10px] text-[color:var(--t-21a04d)] hover:text-[color:var(--t-22c55e)] px-1.5 py-0.5 border border-[color:var(--t-14351a)]"
                          >
                            {isEditing ? t.workspace.view : t.workspace.edit}
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${obs.title}\n\n${obs.content}`);
                              sound.playClick(900);
                            }}
                            className="text-[color:var(--t-21a04d)] hover:text-[color:var(--t-22c55e)] p-1"
                            title={t.workspace.copyNote}
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteObservation(obs.id)}
                            className="text-[color:var(--t-21a04d)] hover:text-red-400 p-1"
                            title={t.workspace.deleteNote}
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
                            className="w-full bg-[color:var(--t-020502)] border border-[color:var(--t-14351a)] p-2 text-xs font-mono text-[color:var(--t-86efac)] focus:outline-hidden focus:border-[color:var(--t-22c55e)] resize-y"
                            placeholder={t.workspace.notePlaceholder}
                          />
                        ) : (
                          <div className="text-xs text-[color:var(--t-86efac)]/90 whitespace-pre-wrap leading-relaxed">
                            {obs.content}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-[10px] text-[color:var(--t-21a04d)] text-right">
                        {t.workspace.updatedAt} {new Date(obs.updatedAt).toLocaleString(localeOf(lang))}
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
            <div className="flex items-center justify-between border-b border-[color:var(--t-14351a)] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--t-22c55e)] font-mono text-sm">#03</span>
                <h2 className="text-sm font-mono font-bold tracking-wider text-[color:var(--t-22c55e)]">
                  {t.workspace.snippetsHeading}
                </h2>
              </div>

              <button
                onClick={handleAddSnippet}
                className="px-2.5 py-1 bg-[color:var(--t-08180b)] hover:bg-[color:var(--t-0e2c14)] border border-[color:var(--t-22c55e)] text-xs font-mono text-[color:var(--t-22c55e)] flex items-center gap-1 transition-colors"
              >
                <Plus size={12} />
                <span>{t.workspace.newSnippet}</span>
              </button>
            </div>

            {project.codeSnippets.length === 0 ? (
              <div className="p-4 text-center font-mono text-xs text-[color:var(--t-21a04d)] border border-dashed border-[color:var(--t-102a15)] bg-[color:var(--t-030804)]">
                {t.workspace.snippetsEmpty}
              </div>
            ) : (
              <div className="space-y-3">
                {project.codeSnippets.map((snip) => (
                  <div
                    key={snip.id}
                    className="border border-[color:var(--t-14351a)] bg-[color:var(--t-020502)] overflow-hidden font-mono"
                  >
                    {/* Header */}
                    <div className="bg-[color:var(--t-051107)] px-3 py-2 border-b border-[color:var(--t-102914)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Terminal size={13} className="text-[color:var(--t-22c55e)]" />
                        <div className="flex items-center flex-1">
                          <input
                            type="text"
                            value={snip.title}
                            onChange={(e) =>
                              handleUpdateSnippet(snip.id, { title: e.target.value })
                            }
                            className="bg-transparent text-xs font-semibold text-[color:var(--t-22c55e)] focus:outline-hidden flex-1"
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
                          className="bg-[color:var(--t-030704)] border border-[color:var(--t-14351a)] text-[10px] font-mono text-[color:var(--t-86efac)] px-2 py-0.5 focus:outline-hidden"
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
                          className="flex items-center gap-1 text-[10px] text-[color:var(--t-22c55e)] hover:text-white px-2 py-0.5 bg-[color:var(--t-092211)] border border-[color:var(--t-1b5e2b)] transition-colors"
                        >
                          {copiedCodeId === snip.id ? (
                            <>
                              <Check size={11} />
                              <span>{t.workspace.copied}</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>{t.workspace.copy}</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteSnippet(snip.id)}
                          className="text-[color:var(--t-21a04d)] hover:text-red-400 p-0.5"
                          title={t.workspace.deleteSnippet}
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
                        className="w-full bg-transparent text-xs font-mono text-[color:var(--t-86efac)] focus:outline-hidden resize-y leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 4. ATTACHMENTS & MEDIA SECTION (FILES // ASSETS) */}
        {(activeTab === 'all' || activeTab === 'files') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[color:var(--t-14351a)] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--t-22c55e)] font-mono text-sm">#04</span>
                <h2 className="text-sm font-mono font-bold tracking-wider text-[color:var(--t-22c55e)]">
                  {t.workspace.filesHeading}
                </h2>
              </div>
              <span className="text-[10px] text-[color:var(--t-21a04d)] font-mono">
                {t.workspace.linkedFiles((project.attachments || []).length)}
              </span>
            </div>

            <ProjectAttachments
              project={project}
              onUpdateProject={onUpdateProject}
              user={user}
              onShowToast={onShowToast || (() => {})}
            />
          </section>
        )}
      </div>

      {/* Persistent Linux/Git Cheatsheet Status Bar */}
      <footer className="px-4 py-1.5 bg-[color:var(--t-020603)] border-t border-[color:var(--t-102914)] text-[10px] font-mono text-[color:var(--t-21a04d)] flex items-center justify-between overflow-x-auto shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenManual}
            className="text-[color:var(--t-22c55e)] hover:underline flex items-center gap-1 font-semibold"
            title={t.workspace.fullManualTitle}
          >
            <span>{t.workspace.fullManual}</span>
          </button>
          <span className="text-[color:var(--t-0d2212)]">|</span>
          <span className="hidden sm:inline">
            <kbd className="text-[color:var(--t-86efac)]">T</kbd> {t.workspace.footer.newTask}
          </span>
          <span className="hidden sm:inline">
            <kbd className="text-[color:var(--t-86efac)]">J/K</kbd> {t.workspace.footer.navigate}
          </span>
          <span className="hidden sm:inline">
            <kbd className="text-[color:var(--t-86efac)]">X</kbd> {t.workspace.footer.toggle}
          </span>
          <span className="hidden md:inline">
            <kbd className="text-[color:var(--t-86efac)]">1-5</kbd> {t.workspace.footer.tabs}
          </span>
          <span className="hidden lg:inline">
            <kbd className="text-[color:var(--t-86efac)]">Ctrl+K</kbd> {t.workspace.footer.cli}
          </span>
        </div>

        <div className="text-[10px] text-[color:var(--t-21a04d)] tabular-nums hidden sm:flex items-center gap-2">
          <span>{t.workspace.visibleTasks(visibleTasks.length)}</span>
        </div>
      </footer>
    </main>
  );
};
