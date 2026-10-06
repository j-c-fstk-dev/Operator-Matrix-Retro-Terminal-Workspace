import React, { useState } from 'react';
import { Project, WorkspaceSettings } from '../types';
import { Plus, Search, Folder, CheckSquare, Terminal, Eye, Volume2, VolumeX, Trash2, SlidersHorizontal, BookOpen, Database, Cloud, User as UserIcon } from 'lucide-react';
import { sound } from '../utils/audio';
import { User } from '@supabase/supabase-js';

interface SidebarProps {
  projects: Project[];
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
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredProjects = projects.filter((p) => {
    const matchesQuery =
      p.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(filterQuery.toLowerCase());

    const isComplete = p.tasks.length > 0 && p.tasks.every((t) => t.done);

    if (statusFilter === 'active') return matchesQuery && !isComplete;
    if (statusFilter === 'completed') return matchesQuery && isComplete;
    return matchesQuery;
  });

  const totalTasks = projects.reduce((acc, p) => acc + p.tasks.length, 0);
  const doneTasks = projects.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.done).length,
    0
  );

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
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 md:w-80 bg-[#040a05] border-r border-[#14351a] flex flex-col shrink-0 transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Terminal Header */}
        <div className="p-4 border-b border-[#14351a] bg-[#061107]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#22c55e] inline-block shadow-[0_0_8px_#22c55e]"></span>
              <span className="font-mono font-bold text-sm tracking-wider text-[#22c55e] matrix-glow">
                OPERATOR // SYS
              </span>
            </div>
            <span className="text-[10px] text-[#15803d] font-mono tracking-widest">
              V.01.NODE
            </span>
          </div>

          <div className="mt-2 text-[11px] text-[#4ade80]/80 font-mono flex items-center justify-between">
            <span>TERMINAL DE PROJETOS</span>
            <span className="text-[#15803d] font-mono text-[10px]">// DEV</span>
          </div>

          {/* Auth / Cloud Status Indicator */}
          <button
            onClick={() => {
              onOpenAuth?.();
              sound.playClick(650);
            }}
            className="mt-3 w-full flex items-center justify-between px-2.5 py-1.5 bg-[#020502] border border-[#14351a] hover:border-[#22c55e] text-[10px] font-mono transition-colors group cursor-pointer"
            title={user ? `Conectado como ${user.email} (Supabase Cloud)` : 'Clique para fazer login ou criar conta no Supabase'}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-[#22c55e] shadow-[0_0_6px_#22c55e]' : 'bg-[#15803d]'}`} />
              <span className="truncate text-[#86efac] group-hover:text-white">
                {user ? user.email : 'MODO LOCAL (OFFLINE)'}
              </span>
            </div>
            <span className="text-[#22c55e] shrink-0 font-bold ml-1">
              {user ? '[NUVEM]' : '[ENTRAR]'}
            </span>
          </button>
        </div>

        {/* Quick Search & Command Bar Trigger */}
        <div className="p-3 border-b border-[#0e2413] space-y-2">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-2.5 text-[#15803d]" size={13} />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrar projetos..."
              className="w-full bg-[#030704] border border-[#14351a] pl-8 pr-7 py-1.5 text-xs text-[#22c55e] placeholder-[#15803d] font-mono focus:outline-hidden focus:border-[#22c55e]"
            />
            {filterQuery ? (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-2 text-[10px] text-[#15803d] hover:text-[#4ade80]"
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
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-mono bg-[#071309] hover:bg-[#0c2210] border border-[#14351a] hover:border-[#1e5828] text-[#86efac] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Terminal size={12} className="text-[#22c55e]" />
              <span>Prompt de Comandos</span>
            </div>
            <span className="text-[10px] text-[#15803d]">Ctrl+K</span>
          </button>
        </div>

        {/* Status Filters */}
        <div className="px-3 pt-2.5 pb-1 flex items-center gap-1 border-b border-[#0e2413]">
          {(['all', 'active', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setStatusFilter(filter);
                sound.playClick(700);
              }}
              className={`flex-1 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                statusFilter === filter
                  ? 'bg-[#0f2e15] text-[#22c55e] border-b border-[#22c55e]'
                  : 'text-[#166534] hover:text-[#4ade80]'
              }`}
            >
              {filter === 'all' ? 'Todos' : filter === 'active' ? 'Ativos' : 'Concluídos'}
            </button>
          ))}
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-[#15803d] uppercase tracking-wider">
            <span>Diretório ({filteredProjects.length})</span>
            <button
              onClick={() => {
                sound.playClick(800);
                onNewProject();
              }}
              className="text-[#22c55e] hover:text-[#86efac] flex items-center gap-0.5"
            >
              <Plus size={11} />
              <span>Novo</span>
            </button>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-[#15803d] border border-dashed border-[#14351a] my-2">
              Nenhum projeto encontrado.
            </div>
          ) : (
            filteredProjects.map((p) => {
              const isSelected = p.id === activeProjectId;
              const total = p.tasks.length;
              const done = p.tasks.filter((t) => t.done).length;
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
                      ? 'bg-[#091a0c] border-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.12)]'
                      : 'bg-[#030704] border-[#102914] hover:border-[#1b4b23] hover:bg-[#061208]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span
                        className={`text-xs ${
                          isSelected ? 'text-[#22c55e]' : 'text-[#15803d] group-hover:text-[#4ade80]'
                        }`}
                      >
                        {isSelected ? '▶' : '▷'}
                      </span>
                      <h4
                        className={`text-xs font-medium truncate ${
                          isSelected ? 'text-[#22c55e] font-semibold' : 'text-[#86efac]'
                        }`}
                      >
                        {p.title}
                      </h4>
                    </div>

                    {projects.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Excluir o projeto "${p.title}"?`)) {
                            onDeleteProject(p.id);
                            sound.playClick(400);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[#15803d] hover:text-red-400 p-0.5 transition-opacity"
                        title="Excluir projeto"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>

                  {/* Metadata and Mini Progress */}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-[#166534]">
                    <span className="truncate max-w-[120px]">{p.category}</span>
                    <span className="tabular-nums">
                      {done}/{total} done ({percent}%)
                    </span>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="mt-1.5 w-full bg-[#051107] h-1 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        percent === 100 ? 'bg-[#22c55e]' : 'bg-[#15803d]'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Global System Stats */}
        <div className="p-3 border-t border-[#14351a] bg-[#030704] text-[10px] font-mono space-y-2">
          <div className="flex items-center justify-between text-[#15803d]">
            <span>STATUS DO SISTEMA</span>
            <span className="text-[#22c55e] flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
              NOMINAL
            </span>
          </div>

          <div className="flex items-center justify-between text-[#86efac]/70">
            <span>TAREFAS GLOBAIS</span>
            <span className="tabular-nums text-[#22c55e] font-semibold">
              {doneTasks}/{totalTasks} ({totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%)
            </span>
          </div>

          {/* Quick Control Toggles */}
          <div className="pt-2 border-t border-[#0d2212] flex items-center justify-between text-[#15803d]">
            <button
              onClick={() => {
                onToggleRain();
                sound.playClick(600);
              }}
              className={`flex items-center gap-1 hover:text-[#4ade80] transition-colors ${
                settings.rainEnabled ? 'text-[#22c55e]' : ''
              }`}
              title="Ativar/Desativar chuva digital"
            >
              <Eye size={12} />
              <span>RAIN</span>
            </button>

            <button
              onClick={() => {
                onToggleSound();
                sound.playClick(700);
              }}
              className={`flex items-center gap-1 hover:text-[#4ade80] transition-colors ${
                settings.soundEnabled ? 'text-[#22c55e]' : ''
              }`}
              title="Som terminal"
            >
              {settings.soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              <span>{settings.soundEnabled ? 'AUDIO' : 'MUTE'}</span>
            </button>

            <button
              onClick={() => {
                onOpenBackup?.();
                sound.playClick(600);
              }}
              className="flex items-center gap-1 text-[#22c55e] hover:text-white transition-colors"
              title="Central de Backup JSON e Migração de Dispositivo"
            >
              <Database size={12} />
              <span>BACKUP</span>
            </button>

            <button
              onClick={() => {
                onOpenManual?.();
                sound.playClick(600);
              }}
              className="flex items-center gap-1 hover:text-[#4ade80] transition-colors"
              title="Manual do Sistema e Teclas de Atalho [?]"
            >
              <BookOpen size={12} />
              <span>MAN [?]</span>
            </button>

            <button
              onClick={() => {
                onOpenSettings();
                sound.playClick(600);
              }}
              className="flex items-center gap-1 hover:text-[#4ade80] transition-colors"
              title="Configurações e Backup"
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
