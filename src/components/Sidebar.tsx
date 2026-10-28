import React, { useState } from 'react';
import { Project, Team, WorkspaceSettings } from '../types';
import { Plus, Search, Folder, CheckSquare, Terminal, Eye, Volume2, VolumeX, Trash2, SlidersHorizontal, BookOpen, Database, Cloud, User as UserIcon, Users } from 'lucide-react';
import { sound } from '../utils/audio';
import { User } from '@supabase/supabase-js';
import { PWAInstallButton } from './PWAInstallButton';
import { useT } from '../i18n';

interface SidebarProps {
  projects: Project[];
  /** Times do usuário e projetos compartilhados com eles (só aparecem para quem está em um time). */
  teams?: Team[];
  teamProjects?: Project[];
  userId?: string;
  onOpenTeams?: () => void;
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  settings: WorkspaceSettings;
  onToggleSound: () => void;
  onToggleRain: () => void;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
  onOpenManual?: () => void;
  onOpenBackup?: () => void;
  onOpenAuth?: () => void;
  user?: User | null;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  teams = [],
  teamProjects = [],
  userId,
  onOpenTeams,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  settings,
  onToggleSound,
  onToggleRain,
  onOpenSettings,
  onOpenCommandPalette,
  onOpenManual,
  onOpenBackup,
  onOpenAuth,
  user,
  isMobileOpen,
  onCloseMobile,
}) => {
  const t = useT();
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  const matchesFilters = (p: Project) => {
    const matchesQuery =
      p.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(filterQuery.toLowerCase());

    const isComplete = p.tasks.length > 0 && p.tasks.every((task) => task.done);

    if (statusFilter === 'active') return matchesQuery && !isComplete;
    if (statusFilter === 'completed') return matchesQuery && isComplete;
    return matchesQuery;
  };
  const filteredProjects = projects.filter(matchesFilters);
  const teamGroups = teams
    .map((team) => ({ team, projects: teamProjects.filter((p) => p.teamId === team.id && matchesFilters(p)) }))
    .filter((group) => group.projects.length > 0 || !filterQuery);

  const everyProject = [...projects, ...teamProjects];
  const totalTasks = everyProject.reduce((acc, p) => acc + p.tasks.length, 0);
  const doneTasks = everyProject.reduce(
    (acc, p) => acc + p.tasks.filter((task) => task.done).length,
    0
  );

  const renderProject = (p: Project, canDelete: boolean) => {
    const isSelected = p.id === activeProjectId;
    const total = p.tasks.length;
    const done = p.tasks.filter((task) => task.done).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
      <div
        key={p.id}
        onClick={() => {
          onSelectProject(p.id);
          sound.playClick(650);
          onCloseMobile();
        }}
        className={`group relative p-2.5 cursor-pointer font-mono border transition-all ${
          isSelected
            ? 'bg-[color:var(--t-091a0c)] border-[color:var(--t-22c55e)] shadow-[0_0_12px_color-mix(in_srgb,var(--t-22c55e)_12%,transparent)]'
            : 'bg-[color:var(--t-030704)] border-[color:var(--t-102914)] hover:border-[color:var(--t-1b4b23)] hover:bg-[color:var(--t-061208)]'
        }`}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span
              className={`text-xs ${
                isSelected ? 'text-[color:var(--t-22c55e)]' : 'text-[color:var(--t-21a04d)] group-hover:text-[color:var(--t-4ade80)]'
              }`}
            >
              {isSelected ? '▶' : '▷'}
            </span>
            <h4
              className={`text-xs font-medium truncate ${
                isSelected ? 'text-[color:var(--t-22c55e)] font-semibold' : 'text-[color:var(--t-86efac)]'
              }`}
            >
              {p.title}
            </h4>
          </div>

          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(t.sidebar.confirmDelete(p.title))) {
                  onDeleteProject(p.id);
                  sound.playClick(400);
                }
              }}
              className="opacity-0 group-hover:opacity-100 text-[color:var(--t-21a04d)] hover:text-red-400 p-0.5 transition-opacity"
              title={t.sidebar.deleteProject}
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>

        {/* Metadata and Mini Progress */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-[color:var(--t-21a04d)]">
          <span className="truncate max-w-[120px]">{p.category}</span>
          <span className="tabular-nums">
            {t.sidebar.doneCount(done, total, percent)}
          </span>
        </div>

        {/* Mini Progress Bar */}
        <div className="mt-1.5 w-full bg-[color:var(--t-051107)] h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              percent === 100 ? 'bg-[color:var(--t-22c55e)]' : 'bg-[color:var(--t-21a04d)]'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/80 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 md:w-80 bg-[color:var(--t-040a05)] md:bg-[color:color-mix(in_srgb,var(--t-040a05)_55%,transparent)] border-r border-[color:var(--t-14351a)] flex flex-col shrink-0 transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Terminal Header */}
        <div className="p-4 border-b border-[color:var(--t-14351a)] bg-[color:var(--t-061107)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[color:var(--t-22c55e)] inline-block shadow-[0_0_8px_var(--t-22c55e)]"></span>
              <span className="font-mono font-bold text-sm tracking-wider text-[color:var(--t-22c55e)] matrix-glow">
                OPERATOR // SYS
              </span>
            </div>
            <span className="text-[10px] text-[color:var(--t-21a04d)] font-mono tracking-widest">
              V.01.NODE
            </span>
          </div>

          <div className="mt-2 text-[11px] text-[color:var(--t-4ade80)]/80 font-mono flex items-center justify-between">
            <span>{t.sidebar.terminalLabel}</span>
            <span className="text-[color:var(--t-21a04d)] font-mono text-[10px]">// DEV</span>
          </div>

          {/* Auth / Cloud Status Indicator */}
          <button
            onClick={() => {
              onOpenAuth?.();
              sound.playClick(650);
            }}
            className="mt-3 w-full flex items-center justify-between px-2.5 py-1.5 bg-[color:var(--t-020502)] border border-[color:var(--t-14351a)] hover:border-[color:var(--t-22c55e)] text-[10px] font-mono transition-colors group cursor-pointer"
            title={user ? t.sidebar.signedInAs(user.email ?? '') : t.sidebar.signInHint}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-[color:var(--t-22c55e)] shadow-[0_0_6px_var(--t-22c55e)]' : 'bg-[color:var(--t-21a04d)]'}`} />
              <span className="truncate text-[color:var(--t-86efac)] group-hover:text-white">
                {user ? user.email : t.sidebar.localMode}
              </span>
            </div>
            <span className="text-[color:var(--t-22c55e)] shrink-0 font-bold ml-1">
              {user ? t.sidebar.cloudTag : t.sidebar.signInTag}
            </span>
          </button>
        </div>

        {/* Quick Search & Command Bar Trigger */}
        <div className="p-3 border-b border-[color:var(--t-0e2413)] space-y-2">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-2.5 text-[color:var(--t-21a04d)]" size={13} />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t.sidebar.filterPlaceholder}
              className="w-full bg-[color:var(--t-030704)] border border-[color:var(--t-14351a)] pl-8 pr-7 py-1.5 text-xs text-[color:var(--t-22c55e)] placeholder-[color:var(--t-21a04d)] font-mono focus:outline-hidden focus:border-[color:var(--t-22c55e)]"
            />
            {filterQuery ? (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-2 text-[10px] text-[color:var(--t-21a04d)] hover:text-[color:var(--t-4ade80)]"
              >
                ×
              </button>
            ) : (
              <span className="absolute right-2 top-2.5 terminal-block-cursor" style={{ width: '0.45em', height: '0.95em' }}></span>
            )}
          </div>

          {/* Command Prompt Button */}
          <button
            onClick={() => {
              sound.playClick(600);
              onOpenCommandPalette();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-mono bg-[color:var(--t-071309)] hover:bg-[color:var(--t-0c2210)] border border-[color:var(--t-14351a)] hover:border-[color:var(--t-1e5828)] text-[color:var(--t-86efac)] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Terminal size={12} className="text-[color:var(--t-22c55e)]" />
              <span>{t.sidebar.commandPrompt}</span>
            </div>
            <span className="text-[10px] text-[color:var(--t-21a04d)]">Ctrl+K</span>
          </button>
        </div>

        {/* Status Filters */}
        <div className="px-3 pt-2.5 pb-1 flex items-center gap-1 border-b border-[color:var(--t-0e2413)]">
          {(['all', 'active', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setStatusFilter(filter);
                sound.playClick(700);
              }}
              className={`flex-1 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                statusFilter === filter
                  ? 'bg-[color:var(--t-0f2e15)] text-[color:var(--t-22c55e)] border-b border-[color:var(--t-22c55e)]'
                  : 'text-[color:var(--t-21a04d)] hover:text-[color:var(--t-4ade80)]'
              }`}
            >
              {t.sidebar.filters[filter]}
            </button>
          ))}
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-[color:var(--t-21a04d)] uppercase tracking-wider">
            <span>{t.sidebar.directory(filteredProjects.length)}</span>
            <button
              onClick={() => {
                sound.playClick(800);
                onNewProject();
              }}
              className="text-[color:var(--t-22c55e)] hover:text-[color:var(--t-86efac)] flex items-center gap-0.5"
            >
              <Plus size={11} />
              <span>{t.sidebar.new}</span>
            </button>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-[color:var(--t-21a04d)] border border-dashed border-[color:var(--t-14351a)] my-2">
              {t.sidebar.noProjects}
            </div>
          ) : (
            filteredProjects.map((p) => renderProject(p, projects.length > 1))
          )}

          {teamGroups.map(({ team, projects: list }) => (
            <div key={team.id} className="pt-3 space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-[color:var(--t-21a04d)] uppercase tracking-wider">
                <span className="flex items-center gap-1 truncate">
                  <Users size={10} className="shrink-0 text-[color:var(--t-22c55e)]" />
                  <span className="truncate">{t.teams.sectionTitle(team.name)}</span>
                </span>
                {onOpenTeams && (
                  <button onClick={onOpenTeams} className="text-[color:var(--t-22c55e)] hover:text-[color:var(--t-86efac)] shrink-0">
                    {t.teams.sidebarManage}
                  </button>
                )}
              </div>
              {list.map((p) => renderProject(p, p.ownerId === userId))}
            </div>
          ))}
        </div>

        {/* Global System Stats */}
        <div className="p-3 border-t border-[color:var(--t-14351a)] bg-[color:var(--t-030704)] text-[10px] font-mono space-y-2">
          <div className="flex items-center justify-between text-[color:var(--t-21a04d)]">
            <span>{t.sidebar.systemStatus}</span>
            <span className="text-[color:var(--t-22c55e)] flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--t-22c55e)]"></span>
              NOMINAL
            </span>
          </div>

          <div className="flex items-center justify-between text-[color:var(--t-86efac)]/70">
            <span>{t.sidebar.globalTasks}</span>
            <span className="tabular-nums text-[color:var(--t-22c55e)] font-semibold">
              {doneTasks}/{totalTasks} ({totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%)
            </span>
          </div>

          {/* PWA Install Action */}
          <div className="pt-2 border-t border-[color:var(--t-0d2212)]">
            <PWAInstallButton variant="sidebar" />
          </div>

          {/* Quick Control Toggles */}
          <div className="pt-2 border-t border-[color:var(--t-0d2212)] flex items-center justify-between text-[color:var(--t-21a04d)]">
            <button
              onClick={() => {
                onToggleRain();
                sound.playClick(600);
              }}
              className={`flex items-center gap-1 hover:text-[color:var(--t-4ade80)] transition-colors ${
                settings.rainEnabled ? 'text-[color:var(--t-22c55e)]' : ''
              }`}
              title={t.sidebar.rainTitle}
            >
              <Eye size={12} />
              <span>RAIN</span>
            </button>

            <button
              onClick={() => {
                onToggleSound();
                sound.playClick(700);
              }}
              className={`flex items-center gap-1 hover:text-[color:var(--t-4ade80)] transition-colors ${
                settings.soundEnabled ? 'text-[color:var(--t-22c55e)]' : ''
              }`}
              title={t.sidebar.soundTitle}
            >
              {settings.soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              <span>{settings.soundEnabled ? 'AUDIO' : 'MUTE'}</span>
            </button>

            <button
              onClick={() => {
                onOpenBackup?.();
                sound.playClick(600);
              }}
              className="flex items-center gap-1 text-[color:var(--t-22c55e)] hover:text-white transition-colors"
              title={t.sidebar.backupTitle}
            >
              <Database size={12} />
              <span>BACKUP</span>
            </button>

            <button
              onClick={() => {
                onOpenManual?.();
                sound.playClick(600);
              }}
              className="flex items-center gap-1 hover:text-[color:var(--t-4ade80)] transition-colors"
              title={t.sidebar.manualTitle}
            >
              <BookOpen size={12} />
              <span>MAN [?]</span>
            </button>

            <button
              onClick={() => {
                onOpenSettings();
                sound.playClick(600);
              }}
              className="flex items-center gap-1 hover:text-[color:var(--t-4ade80)] transition-colors"
              title={t.sidebar.settingsTitle}
            >
              <SlidersHorizontal size={12} />
              <span>CONFIG</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
