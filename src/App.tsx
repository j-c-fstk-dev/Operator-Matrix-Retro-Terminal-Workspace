/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Project, WorkspaceSettings, Task } from './types';
import { INITIAL_PROJECTS, DEFAULT_SETTINGS } from './data/initialData';
import { MatrixRainCanvas } from './components/MatrixRainCanvas';
import { Sidebar } from './components/Sidebar';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import { ManualModal } from './components/ManualModal';
import { BackupModal } from './components/BackupModal';
import { AuthModal } from './components/AuthModal';
import { sound } from './utils/audio';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { supabaseService } from './services/supabaseService';
import { User } from '@supabase/supabase-js';

const STORAGE_PROJECTS_KEY = 'operator_matrix_projects_v1';
const STORAGE_SETTINGS_KEY = 'operator_matrix_settings_v1';

export default function App() {
  // Load initial state
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
    return INITIAL_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return projects[0]?.id || 'proj-nebu-relay';
  });

  const [settings, setSettings] = useState<WorkspaceSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const hiddenImportRef = useRef<HTMLInputElement>(null);

  // Sync sounds setting
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Load cloud projects for user or seed cloud from local if empty
  const loadCloudProjects = async (userId: string) => {
    try {
      const cloudProjects = await supabaseService.fetchUserProjects(userId);
      if (cloudProjects.length > 0) {
        setProjects(cloudProjects);
        setActiveProjectId((prev) => {
          return cloudProjects.some((p) => p.id === prev) ? prev : cloudProjects[0].id;
        });
        localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(cloudProjects));
        showToast(`[NUVEM] ${cloudProjects.length} projetos sincronizados via Supabase!`);
      } else {
        // Cloud is currently empty: migrate existing local projects to the user's cloud account!
        const localData = localStorage.getItem(STORAGE_PROJECTS_KEY);
        if (localData) {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await supabaseService.upsertAllProjects(userId, parsed);
            showToast(`[NUVEM] ${parsed.length} projetos locais sincronizados para sua conta!`);
          }
        }
      }
    } catch (err: any) {
      console.error('[Supabase] Erro ao sincronizar projetos:', err);
    }
  };

  // Listen to Supabase auth session
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadCloudProjects(currentUser.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          loadCloudProjects(currentUser.id);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSyncLocalToCloud = async () => {
    if (!user) {
      showToast('Faça login primeiro para sincronizar com a nuvem.');
      return;
    }
    try {
      await supabaseService.upsertAllProjects(user.id, projects);
      showToast(`Sucesso: ${projects.length} projetos enviados para o Supabase!`);
    } catch (err: any) {
      showToast(`Falha ao sincronizar: ${err.message || 'Erro'}`);
      throw err;
    }
  };

  // Persist projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Falha ao salvar projetos no localStorage', e);
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
          showToast('[GIT SYNC] Cache local validado e sincronizado.');
        } catch {
          showToast('Erro ao sincronizar com o localStorage.');
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Active Project resolution
  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || INITIAL_PROJECTS[0];

  const handleUpdateProject = (updated: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    if (user) {
      supabaseService.upsertProject(user.id, updated).catch((err) => {
        console.error('[Supabase] Falha ao atualizar projeto:', err);
      });
    }
  };

  const handleCreateNewProject = (customTitle?: string) => {
    const newId = `proj-${Date.now()}`;
    const newProject: Project = {
      id: newId,
      title: customTitle || 'Novo Projeto Pessoal',
      slug: (customTitle || 'novo-projeto').toLowerCase().replace(/\s+/g, '-'),
      category: 'DEV',
      description: 'Defina aqui o escopo e objetivos deste projeto...',
      status: 'active',
      tasks: [
        {
          id: `task-${Date.now()}`,
          text: 'Definir escopo inicial do projeto',
          done: false,
          priority: 'high',
          tags: ['planejamento'],
          subtasks: [
            { id: `sub-${Date.now()}`, text: 'Listar requisitos essenciais', done: false, createdAt: Date.now() },
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
    if (user) {
      supabaseService.upsertProject(user.id, newProject).catch((err) => {
        console.error('[Supabase] Falha ao criar projeto na nuvem:', err);
      });
    }
    sound.playCommand();
    showToast(`Projeto "${newProject.title}" inicializado (git init).`);
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      showToast('O workspace precisa ter pelo menos um projeto ativo.');
      return;
    }
    const filtered = projects.filter((p) => p.id !== id);
    setProjects(filtered);
    if (activeProjectId === id) {
      setActiveProjectId(filtered[0].id);
    }
    if (user) {
      supabaseService.deleteProject(user.id, id).catch((err) => {
        console.error('[Supabase] Falha ao deletar projeto na nuvem:', err);
      });
    }
    showToast('Projeto removido.');
  };

  const handleQuickAddTask = (text: string) => {
    if (!text.trim() || !activeProject) return;

    const hashtags = (text.match(/#([a-zA-Z0-9_-]+)/g) || []).map((t) =>
      t.slice(1).toLowerCase()
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
    showToast(`Tarefa adicionada em "${activeProject.title}"`);
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
    md += `> ${activeProject.description || 'Sem descrição'}\n\n`;
    md += `**Status:** ${activeProject.status.toUpperCase()} | **Categoria:** ${activeProject.category}\n\n`;

    md += `## Tarefas\n\n`;
    if (activeProject.tasks.length === 0) {
      md += `*Nenhuma tarefa registrada.*\n\n`;
    } else {
      activeProject.tasks.forEach((t) => {
        const tagStr = t.tags && t.tags.length > 0 ? ` [${t.tags.map((tg) => `#${tg}`).join(' ')}]` : '';
        md += `- [${t.done ? 'x' : ' '}] **${t.text}**${t.priority === 'high' ? ' [CRIT]' : ''}${tagStr}\n`;
        if (t.notes) md += `  - *Nota:* ${t.notes}\n`;
        t.subtasks.forEach((sub) => {
          md += `  - [${sub.done ? 'x' : ' '}] ${sub.text}\n`;
        });
      });
      md += `\n`;
    }

    if (activeProject.observations.length > 0) {
      md += `## Observações & Anotações\n\n`;
      activeProject.observations.forEach((obs) => {
        md += `### ${obs.title} [${obs.tag || 'GERAL'}]\n\n`;
        md += `${obs.content}\n\n`;
      });
    }

    if (activeProject.codeSnippets.length > 0) {
      md += `## Snippets & Configurações\n\n`;
      activeProject.codeSnippets.forEach((snip) => {
        md += `### ${snip.title}\n\n`;
        md += `\`\`\`${snip.language}\n${snip.code}\n\`\`\`\n\n`;
      });
    }

    navigator.clipboard.writeText(md);
    showToast('Projeto copiado para a área de transferência em Markdown!');
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
    showToast('Arquivo de backup baixado com sucesso!');
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
        title: p.title || 'Projeto Importado',
        slug: p.slug || (p.title || 'projeto').toLowerCase().replace(/\s+/g, '-'),
        category: p.category || 'GERAL',
        description: p.description || '',
        status: p.status || 'active',
        tasks: Array.isArray(p.tasks)
          ? p.tasks.map((t, tIdx) => ({
              id: t.id || `task-${Date.now()}-${tIdx}`,
              text: t.text || 'Tarefa sem título',
              done: Boolean(t.done),
              priority: t.priority || 'med',
              tags: Array.isArray(t.tags) ? t.tags : undefined,
              notes: t.notes || undefined,
              subtasks: Array.isArray(t.subtasks)
                ? t.subtasks.map((s, sIdx) => ({
                    id: s.id || `sub-${Date.now()}-${sIdx}`,
                    text: s.text || '',
                    done: Boolean(s.done),
                    createdAt: s.createdAt || Date.now(),
                  }))
                : [],
              createdAt: t.createdAt || Date.now(),
            }))
          : [],
        observations: Array.isArray(p.observations)
          ? p.observations.map((o, oIdx) => ({
              id: o.id || `obs-${Date.now()}-${oIdx}`,
              title: o.title || 'Nota',
              content: o.content || '',
              tag: o.tag || 'GERAL',
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

      if (user) {
        supabaseService.upsertAllProjects(user.id, finalProjects).catch((err) => {
          console.error('[Supabase] Falha ao sincronizar projetos importados:', err);
        });
      }

      const totalTasksCount = finalProjects.reduce((acc, p) => acc + p.tasks.length, 0);
      showToast(`[RESTAURAÇÃO CONCLUÍDA] ${finalProjects.length} projetos e ${totalTasksCount} tarefas carregados!`);
    } catch (err) {
      console.error('Erro na importação', err);
      showToast('Falha ao processar e salvar projetos importados.');
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
          showToast('Formato de arquivo JSON inválido.');
        }
      } catch {
        showToast('Erro ao ler ou processar arquivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    setProjects(INITIAL_PROJECTS);
    setActiveProjectId(INITIAL_PROJECTS[0].id);
    setSettings(DEFAULT_SETTINGS);
    sound.playCommand();
    showToast('Workspace restaurado para os dados iniciais.');
  };

  return (
    <div className="relative w-screen h-screen flex overflow-hidden bg-[#030704] text-[#86efac] font-mono select-none">
      {/* Background Matrix Rain */}
      <MatrixRainCanvas
        enabled={settings.rainEnabled}
        opacity={settings.rainOpacity}
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
          highlightedTaskId={highlightedTaskId}
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
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        onSyncLocalToCloud={handleSyncLocalToCloud}
        onShowToast={showToast}
        localProjectsCount={projects.length}
      />

      {/* Feedback Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-9 right-5 z-50 bg-[#061408] border border-[#22c55e] text-[#22c55e] text-xs font-mono px-4 py-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center gap-2">
          <span className="w-2 h-2 bg-[#22c55e] animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

