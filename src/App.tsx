/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useState, useEffect, useRef } from 'react';
import { Project, WorkspaceSettings, Task } from './types';
import { getInitialProjects, localizeSeedProjects, DEFAULT_SETTINGS } from './data/initialData';
import { I18nProvider, DICTS, resolveLang } from './i18n';
import { MatrixRainCanvas } from './components/MatrixRainCanvas';
import { Sidebar } from './components/Sidebar';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import { ManualModal } from './components/ManualModal';
import { BackupModal } from './components/BackupModal';
import { AuthModal } from './components/AuthModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { sound } from './utils/audio';
import { applyAccentTheme, resolveAccentTheme } from './theme/themes';
import { supabase, isSupabaseConfigured, openedFromRecoveryLink, authLinkError } from './lib/supabase';
import { useCloudSync } from './sync/useCloudSync';
import { User } from '@supabase/supabase-js';

const STORAGE_PROJECTS_KEY = 'operator_matrix_projects_v1';
const STORAGE_SETTINGS_KEY = 'operator_matrix_settings_v1';

export default function App() {
  // Load initial state
  const [settings, setSettings] = useState<WorkspaceSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Escala antiga (2%–25%): a chuva ficava escondida atrás dos painéis; adota o novo padrão.
        if (parsed.rainScale !== 2) {
          parsed.rainOpacity = DEFAULT_SETTINGS.rainOpacity;
          parsed.rainScale = 2;
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return getInitialProjects(resolveLang(settings.language));
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return projects[0]?.id || 'proj-nebu-relay';
  });

  const lang = resolveLang(settings.language);
  const t = DICTS[lang];

  const [user, setUser] = useState<User | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(openedFromRecoveryLink && isSupabaseConfigured);
  // Link de e-mail expirado: o modal de login abre mostrando o motivo.
  const [authLinkErrorMsg, setAuthLinkErrorMsg] = useState(isSupabaseConfigured ? authLinkError : null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState((openedFromRecoveryLink || Boolean(authLinkError)) && isSupabaseConfigured);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const hiddenImportRef = useRef<HTMLInputElement>(null);
  const storageWarnedRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Sincronização com a nuvem: fila offline, envio agrupado e merge sem sobrescrever.
  const cloudSync = useCloudSync({ user, projects, setProjects, showToast });

  // Exemplos nunca editados acompanham o idioma escolhido.
  useEffect(() => {
    setProjects((prev) => localizeSeedProjects(prev, lang));
  }, [lang]);

  const accentTheme = resolveAccentTheme(settings.accentTheme);
  useEffect(() => {
    applyAccentTheme(accentTheme);
  }, [accentTheme]);

  // Sync sounds setting
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Listen to Supabase auth session
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    if (authLinkError) window.history.replaceState(null, '', window.location.pathname);

    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          setIsAuthModalOpen(true);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSyncLocalToCloud = async () => {
    if (!user) {
      showToast(t.app.loginToSync);
      return;
    }
    try {
      await cloudSync.syncAllNow();
      showToast(t.app.syncedAll(projects.length));
    } catch (err: any) {
      showToast(t.app.syncFailed(err.message || t.app.error));
      throw err;
    }
  };

  // Persist projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
      storageWarnedRef.current = false;
    } catch (e) {
      console.error('Falha ao salvar projetos no localStorage', e);
      if (!storageWarnedRef.current) {
        storageWarnedRef.current = true;
        showToast(t.app.storageFull);
      }
    }
  }, [projects]);

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Falha ao salvar configurações', e);
    }
  }, [settings]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      // Ctrl+S / Cmd+S: Git-style manual sync to cache
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        try {
          localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
          localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
          sound.playCommand();
          showToast(t.app.cacheSaved);
        } catch {
          showToast(t.app.cacheFailed);
        }
        return;
      }

      // Ctrl+K or Cmd+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // If user is inside an input, don't trigger single-key actions
      if (isInput) return;

      // ? or F1: Open System Manual (man operator)
      if (e.key === '?' || e.key === 'F1') {
        e.preventDefault();
        setIsManualOpen(true);
        return;
      }

      // N: New project
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleCreateNewProject();
        return;
      }

      // M: Export Markdown
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleCopyMarkdown();
        return;
      }

      // B: Toggle Matrix Rain
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setSettings((s) => ({ ...s, rainEnabled: !s.rainEnabled }));
        sound.playClick(650);
        return;
      }

      // S: Toggle Sound
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        const nextVal = !settings.soundEnabled;
        setSettings((s) => ({ ...s, soundEnabled: nextVal }));
        sound.setEnabled(nextVal);
        if (nextVal) sound.playClick(800);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projects, settings]);

  // Active Project resolution
  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || getInitialProjects(lang)[0];

  const handleUpdateProject = (updated: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    cloudSync.queueUpsert(updated.id);
  };

  const handleCreateNewProject = (customTitle?: string) => {
    const newId = `proj-${Date.now()}`;
    const newProject: Project = {
      id: newId,
      title: customTitle || t.app.newProject.title,
      slug: (customTitle || t.app.newProject.slug).toLowerCase().replace(/\s+/g, '-'),
      category: 'DEV',
      description: t.app.newProject.description,
      status: 'active',
      tasks: [
        {
          id: `task-${Date.now()}`,
          text: t.app.newProject.task,
          done: false,
          priority: 'high',
          tags: [t.app.newProject.tag],
          subtasks: [
            { id: `sub-${Date.now()}`, text: t.app.newProject.subtask, done: false, createdAt: Date.now() },
          ],
          createdAt: Date.now(),
        },
      ],
      observations: [],
      codeSnippets: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newId);
    cloudSync.queueUpsert(newId);
    sound.playCommand();
    showToast(t.app.projectCreated(newProject.title));
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      showToast(t.app.needOneProject);
      return;
    }
    const filtered = projects.filter((p) => p.id !== id);
    setProjects(filtered);
    if (activeProjectId === id) {
      setActiveProjectId(filtered[0].id);
    }
    cloudSync.queueDelete(id);
    showToast(t.app.projectDeleted);
  };

  const handleQuickAddTask = (text: string) => {
    if (!text.trim() || !activeProject) return;

    const hashtags = (text.match(/#([a-zA-Z0-9_-]+)/g) || []).map((tg) =>
      tg.slice(1).toLowerCase()
    );

    const newTask: Task = {
      id: `task-${Date.now()}`,
      text: text.trim(),
      done: false,
      priority: 'med',
      tags: hashtags.length > 0 ? hashtags : undefined,
      subtasks: [],
      createdAt: Date.now(),
    };
    const updated = {
      ...activeProject,
      tasks: [newTask, ...activeProject.tasks],
      updatedAt: Date.now(),
    };
    handleUpdateProject(updated);
    showToast(t.app.taskAdded(activeProject.title));
  };

  const handleSelectTaskFromQuickFind = (projectId: string, taskId: string) => {
    setActiveProjectId(projectId);
    setHighlightedTaskId(taskId);
    setTimeout(() => {
      setHighlightedTaskId(null);
    }, 4000);
  };

  // Export current project as Markdown
  const handleCopyMarkdown = () => {
    if (!activeProject) return;

    let md = `# ${activeProject.title}\n\n`;
    md += `> ${activeProject.description || t.app.md.noDescription}\n\n`;
    md += `**Status:** ${activeProject.status.toUpperCase()} | **${t.app.md.category}:** ${activeProject.category}\n\n`;

    md += `## ${t.app.md.tasks}\n\n`;
    if (activeProject.tasks.length === 0) {
      md += `*${t.app.md.noTasks}*\n\n`;
    } else {
      activeProject.tasks.forEach((task) => {
        const tagStr = task.tags && task.tags.length > 0 ? ` [${task.tags.map((tg) => `#${tg}`).join(' ')}]` : '';
        md += `- [${task.done ? 'x' : ' '}] **${task.text}**${task.priority === 'high' ? ' [CRIT]' : ''}${tagStr}\n`;
        if (task.notes) md += `  - *${t.app.md.note}:* ${task.notes}\n`;
        task.subtasks.forEach((sub) => {
          md += `  - [${sub.done ? 'x' : ' '}] ${sub.text}\n`;
        });
      });
      md += `\n`;
    }

    if (activeProject.observations.length > 0) {
      md += `## ${t.app.md.notes}\n\n`;
      activeProject.observations.forEach((obs) => {
        md += `### ${obs.title} [${obs.tag || t.app.md.general}]\n\n`;
        md += `${obs.content}\n\n`;
      });
    }

    if (activeProject.codeSnippets.length > 0) {
      md += `## ${t.app.md.snippets}\n\n`;
      activeProject.codeSnippets.forEach((snip) => {
        md += `### ${snip.title}\n\n`;
        md += `\`\`\`${snip.language}\n${snip.code}\n\`\`\`\n\n`;
      });
    }

    navigator.clipboard.writeText(md);
    showToast(t.app.mdCopied);
  };

  // Full JSON Workspace Export
  const handleExportJSON = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
      settings,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matrix_operator_workspace_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    sound.playCommand();
    showToast(t.app.backupDownloaded);
  };

  // Robust JSON Workspace Import with sanitization and immediate persistence
  const handleImportProjects = (
    importedProjects: Project[],
    importedSettings?: WorkspaceSettings,
    merge?: boolean
  ) => {
    try {
      const validated: Project[] = importedProjects.map((p, idx) => ({
        id: p.id || `proj-imported-${Date.now()}-${idx}`,
        title: p.title || t.app.import.project,
        slug: p.slug || (p.title || t.app.import.slug).toLowerCase().replace(/\s+/g, '-'),
        category: p.category || t.app.md.general,
        description: p.description || '',
        status: p.status || 'active',
        tasks: Array.isArray(p.tasks)
          ? p.tasks.map((task, tIdx) => ({
              id: task.id || `task-${Date.now()}-${tIdx}`,
              text: task.text || t.app.import.task,
              done: Boolean(task.done),
              priority: task.priority || 'med',
              tags: Array.isArray(task.tags) ? task.tags : undefined,
              notes: task.notes || undefined,
              subtasks: Array.isArray(task.subtasks)
                ? task.subtasks.map((s, sIdx) => ({
                    id: s.id || `sub-${Date.now()}-${sIdx}`,
                    text: s.text || '',
                    done: Boolean(s.done),
                    createdAt: s.createdAt || Date.now(),
                  }))
                : [],
              createdAt: task.createdAt || Date.now(),
            }))
          : [],
        observations: Array.isArray(p.observations)
          ? p.observations.map((o, oIdx) => ({
              id: o.id || `obs-${Date.now()}-${oIdx}`,
              title: o.title || t.app.md.note,
              content: o.content || '',
              tag: o.tag || t.app.md.general,
              updatedAt: o.updatedAt || Date.now(),
            }))
          : [],
        codeSnippets: Array.isArray(p.codeSnippets)
          ? p.codeSnippets.map((c, cIdx) => ({
              id: c.id || `snip-${Date.now()}-${cIdx}`,
              title: c.title || 'script',
              language: c.language || 'typescript',
              code: c.code || '',
              updatedAt: c.updatedAt || Date.now(),
            }))
          : [],
        attachments: Array.isArray(p.attachments)
          ? p.attachments.map((a, aIdx) => ({
              id: a.id || `att-${Date.now()}-${aIdx}`,
              name: a.name || t.app.import.file,
              type: a.type || 'other',
              mimeType: a.mimeType || 'application/octet-stream',
              size: Number(a.size) || 0,
              url: a.url || '',
              storagePath: a.storagePath,
              createdAt: a.createdAt || Date.now(),
              description: a.description,
              textContent: a.textContent,
            }))
          : [],
        createdAt: p.createdAt || Date.now(),
        updatedAt: Date.now(),
      }));

      let finalProjects: Project[] = [];
      if (merge) {
        const existingIds = new Set(projects.map((p) => p.id));
        const mergedList = [...projects];
        validated.forEach((vp) => {
          if (!existingIds.has(vp.id)) {
            mergedList.push(vp);
          } else {
            const index = mergedList.findIndex((p) => p.id === vp.id);
            if (index !== -1) mergedList[index] = vp;
          }
        });
        finalProjects = mergedList;
      } else {
        finalProjects = validated;
      }

      setProjects(finalProjects);
      if (finalProjects.length > 0) {
        setActiveProjectId(finalProjects[0].id);
      }

      if (importedSettings) {
        setSettings((prev) => ({ ...prev, ...importedSettings }));
      }

      // Synchronous LocalStorage Save
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(finalProjects));
      if (importedSettings) {
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify({ ...settings, ...importedSettings }));
      }

      // No modo "Substituir Tudo", projetos que sumiram também são removidos da nuvem.
      if (!merge) {
        const keptIds = new Set(finalProjects.map((p) => p.id));
        cloudSync.queueDeletes(projects.filter((p) => !keptIds.has(p.id)).map((p) => p.id));
      }
      cloudSync.queueUpserts(validated.map((p) => p.id));

      const totalTasksCount = finalProjects.reduce((acc, p) => acc + p.tasks.length, 0);
      showToast(t.app.importDone(finalProjects.length, totalTasksCount));
    } catch (err) {
      console.error('Erro na importação', err);
      showToast(t.app.importFailed);
    }
  };

  // Full JSON Workspace Import (via file input)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          handleImportProjects(parsed);
        } else if (parsed && Array.isArray(parsed.projects)) {
          handleImportProjects(parsed.projects, parsed.settings);
        } else {
          showToast(t.app.invalidJson);
        }
      } catch {
        showToast(t.app.readJsonFailed);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    const seeds = getInitialProjects(lang);
    setProjects(seeds);
    setActiveProjectId(seeds[0].id);
    // Mantém o idioma escolhido ao restaurar o resto das preferências.
    setSettings({ ...DEFAULT_SETTINGS, language: settings.language });
    sound.playCommand();
    showToast(t.app.resetDone);
  };

  return (
    <I18nProvider lang={lang}>
      <div className="relative w-screen h-screen flex overflow-hidden bg-[color:var(--t-030704)] text-[color:var(--t-86efac)] font-mono select-none">
        {/* Background Matrix Rain */}
        <MatrixRainCanvas
          enabled={settings.rainEnabled}
          opacity={settings.rainOpacity}
          accentTheme={accentTheme}
        />

        {/* CRT Scanline Overlay */}
        {settings.scanlines && (
          <div className="crt-scanlines fixed inset-0 pointer-events-none z-50 opacity-60" />
        )}

        {/* Top Level App Container */}
        <div className="relative z-10 flex w-full h-full">
          {/* Left Sidebar */}
          <Sidebar
            projects={projects}
            activeProjectId={activeProject.id}
            onSelectProject={(id) => setActiveProjectId(id)}
            onNewProject={() => handleCreateNewProject()}
            onDeleteProject={handleDeleteProject}
            settings={settings}
            onToggleSound={() =>
              setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))
            }
            onToggleRain={() =>
              setSettings((s) => ({ ...s, rainEnabled: !s.rainEnabled }))
            }
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenManual={() => setIsManualOpen(true)}
            onOpenBackup={() => setIsBackupModalOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            user={user}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Central Workspace Area */}
          <ProjectWorkspace
            project={activeProject}
            onUpdateProject={handleUpdateProject}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onCopyMarkdown={handleCopyMarkdown}
            onOpenManual={() => setIsManualOpen(true)}
            onOpenBackup={() => setIsBackupModalOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            user={user}
            onShowToast={showToast}
            highlightedTaskId={highlightedTaskId}
            syncStatus={cloudSync.status}
            pendingSyncCount={cloudSync.pendingCount}
          />
        </div>

        {/* Hidden File Input for Import */}
        <input
          ref={hiddenImportRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />

        {/* Command Palette Modal */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          projects={projects}
          activeProjectId={activeProject.id}
          onSelectProject={(id) => setActiveProjectId(id)}
          onSelectTask={handleSelectTaskFromQuickFind}
          onNewProject={handleCreateNewProject}
          onQuickAddTask={handleQuickAddTask}
          settings={settings}
          onUpdateSettings={(newSet) => setSettings((s) => ({ ...s, ...newSet }))}
          onExportData={() => setIsBackupModalOpen(true)}
          onImportClick={() => setIsBackupModalOpen(true)}
          onCopyMarkdown={handleCopyMarkdown}
          onOpenManual={() => setIsManualOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onShowToast={showToast}
        />

        {/* Settings & Backup Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={(newSet) => setSettings((s) => ({ ...s, ...newSet }))}
          onExportData={() => setIsBackupModalOpen(true)}
          onImportFile={handleImportFile}
          onResetData={handleResetData}
          totalProjects={projects.length}
        />

        {/* System Manual Modal (man operator) */}
        <ManualModal
          isOpen={isManualOpen}
          onClose={() => setIsManualOpen(false)}
        />

        {/* Dedicated Backup & Cross-Device Migration Modal */}
        <BackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          projects={projects}
          settings={settings}
          onImportProjects={handleImportProjects}
          onShowToast={showToast}
        />

        {/* Retro Matrix Auth Modal (Supabase Cloud) */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthLinkErrorMsg(null);
          }}
          user={user}
          onSyncLocalToCloud={handleSyncLocalToCloud}
          onShowToast={showToast}
          localProjectsCount={projects.length}
          isPasswordRecovery={isPasswordRecovery}
          linkError={authLinkErrorMsg ? t.app.authLinkError(authLinkErrorMsg) : null}
          onPasswordRecoveryDone={() => setIsPasswordRecovery(false)}
        />

        {/* Offline Connectivity Indicator */}
        <OfflineIndicator />

        {/* Feedback Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-9 right-5 z-50 bg-[color:var(--t-061408)] border border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)] text-xs font-mono px-4 py-2 shadow-[0_0_15px_color-mix(in_srgb,var(--t-22c55e)_30%,transparent)] flex items-center gap-2">
            <span className="w-2 h-2 bg-[color:var(--t-22c55e)] animate-ping"></span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </I18nProvider>
  );
}

