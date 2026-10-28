import React, { useEffect, useState } from 'react';
import { X, Users, UserPlus, LogOut, Trash2, Plus } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { sound } from '../utils/audio';
import { useT } from '../i18n';
import { Team, TeamMember } from '../types';
import { teamService } from '../teams/teamService';

interface TeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  teams: Team[];
  members: Record<string, TeamMember[]>;
  /** Recarrega times, membros e projetos depois de uma mudança. */
  onChanged: () => Promise<void> | void;
  onShowToast: (msg: string) => void;
}

const field =
  'flex items-center gap-2 bg-[color:var(--t-020502)] border border-[color:var(--t-14351a)] px-2.5 py-1.5 focus-within:border-[color:var(--t-22c55e)]';
const input =
  'w-full bg-transparent text-xs font-mono text-[color:var(--t-86efac)] placeholder-[color:var(--t-21a04d)] focus:outline-hidden';
const primaryButton =
  'shrink-0 px-3 py-1.5 bg-[color:var(--t-0a2612)] hover:bg-[color:var(--t-0e3318)] border border-[color:var(--t-22c55e)] text-[11px] font-bold text-[color:var(--t-22c55e)] hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50';
const label = 'text-[10px] text-[color:var(--t-21a04d)] uppercase tracking-wider';

export const TeamsModal: React.FC<TeamsModalProps> = ({ isOpen, onClose, user, teams, members, onChanged, onShowToast }) => {
  const t = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMessage(null);
      setEmail('');
      setNewTeamName('');
      return;
    }
    sound.playCommand();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Mantém um time selecionado enquanto houver times.
  useEffect(() => {
    if (!teams.some((team) => team.id === selectedId)) setSelectedId(teams[0]?.id ?? null);
  }, [teams, selectedId]);

  if (!isOpen) return null;

  const selected = teams.find((team) => team.id === selectedId) || null;
  const isOwner = selected?.role === 'owner';
  const teamMembers = selected ? members[selected.id] || [] : [];

  const run = async (action: () => Promise<string | void>) => {
    if (!navigator.onLine) {
      setMessage({ kind: 'error', text: t.teams.offline });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const text = await action();
      await onChanged();
      if (text) setMessage({ kind: 'ok', text });
    } catch (err: any) {
      sound.playClick(300);
      setMessage({ kind: 'error', text: t.teams.error(err?.message || t.sync.error) });
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;
    run(async () => {
      const id = await teamService.createTeam(name);
      setSelectedId(id);
      setNewTeamName('');
      sound.playCommand();
      return t.teams.created(name);
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!selected || !address) return;
    run(async () => {
      const result = await teamService.addMember(selected.id, address);
      if (result === 'added') {
        setEmail('');
        sound.playCommand();
        return t.teams.added(address);
      }
      setMessage({ kind: 'error', text: result === 'already_member' ? t.teams.alreadyMember(address) : t.teams.notFound(address) });
    });
  };

  const handleRemove = (member: TeamMember) => {
    if (!selected || !window.confirm(t.teams.confirmRemove(member.email))) return;
    run(async () => {
      await teamService.removeMember(selected.id, member.userId);
      return t.teams.removed(member.email);
    });
  };

  const handleLeave = () => {
    if (!selected || !user || !window.confirm(t.teams.confirmLeave(selected.name))) return;
    const name = selected.name;
    run(async () => {
      await teamService.removeMember(selected.id, user.id);
      onShowToast(t.teams.left(name));
    });
  };

  const handleDelete = () => {
    if (!selected || !window.confirm(t.teams.confirmDelete(selected.name))) return;
    const name = selected.name;
    run(async () => {
      await teamService.deleteTeam(selected.id);
      onShowToast(t.teams.deleted(name));
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-xs font-mono text-xs text-[color:var(--t-86efac)]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teams-title"
        className="w-full max-w-lg bg-[color:var(--t-040a05)] border border-[color:var(--t-22c55e)] shadow-[0_0_35px_color-mix(in_srgb,var(--t-00ff66)_25%,transparent)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 bg-[color:var(--t-08180c)] border-b border-[color:var(--t-14351a)] shrink-0">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[color:var(--t-22c55e)]" />
            <span id="teams-title" className="font-bold text-[color:var(--t-22c55e)] tracking-wider text-xs">
              {t.teams.title}
            </span>
          </div>
          <button onClick={onClose} className="text-[color:var(--t-21a04d)] hover:text-[color:var(--t-22c55e)] p-1" aria-label={t.common.closeTag}>
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {!user ? (
            <p className="text-[11px] text-[color:var(--t-86efac)]/80">{t.teams.needLogin}</p>
          ) : (
            <>
              <p className="text-[11px] text-[color:var(--t-86efac)]/80 leading-relaxed">{t.teams.intro}</p>

              {/* Times */}
              <div className="space-y-1.5">
                <div className={label}>{t.teams.yourTeams}</div>
                {teams.length === 0 ? (
                  <p className="text-[11px] text-[color:var(--t-21a04d)]">{t.teams.noTeams}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5" role="tablist">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        role="tab"
                        aria-selected={team.id === selectedId}
                        onClick={() => {
                          setSelectedId(team.id);
                          setMessage(null);
                          sound.playClick(650);
                        }}
                        className={`px-2.5 py-1 border text-[11px] transition-colors ${
                          team.id === selectedId
                            ? 'bg-[color:var(--t-0b2411)] border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)] font-bold'
                            : 'border-[color:var(--t-14351a)] text-[color:var(--t-86efac)] hover:border-[color:var(--t-22c55e)]'
                        }`}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time selecionado */}
              {selected && (
                <div className="bg-[color:var(--t-030804)] border border-[color:var(--t-0e2513)] p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[color:var(--t-22c55e)] truncate">{selected.name}</span>
                    <span className="text-[10px] text-[color:var(--t-21a04d)]">{isOwner ? t.teams.owner : t.teams.member}</span>
                  </div>

                  <div className="space-y-1">
                    <div className={label}>{t.teams.members}</div>
                    <ul className="space-y-1">
                      {teamMembers.map((m) => (
                        <li key={m.userId} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate">
                            {m.email} {m.userId === user.id && <span className="text-[color:var(--t-21a04d)]">{t.teams.you}</span>}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-[color:var(--t-21a04d)]">{m.role === 'owner' ? t.teams.owner : t.teams.member}</span>
                            {isOwner && m.userId !== user.id && (
                              <button
                                onClick={() => handleRemove(m)}
                                disabled={busy}
                                className="text-[10px] text-red-400 hover:text-red-300"
                              >
                                {t.teams.remove}
                              </button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isOwner && (
                    <form onSubmit={handleAdd} className="space-y-1">
                      <label htmlFor="team-member-email" className={label}>
                        {t.teams.addLabel}
                      </label>
                      <div className="flex gap-2">
                        <div className={`${field} flex-1`}>
                          <span className="text-[color:var(--t-21a04d)]">&gt;</span>
                          <input
                            id="team-member-email"
                            type="email"
                            autoComplete="off"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t.teams.addPlaceholder}
                            className={input}
                          />
                        </div>
                        <button type="submit" disabled={busy || !email.trim()} className={primaryButton}>
                          <UserPlus size={12} />
                          <span>{t.teams.add}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="pt-2 border-t border-[color:var(--t-0e2513)] flex justify-end">
                    {isOwner ? (
                      <button
                        onClick={handleDelete}
                        disabled={busy}
                        className="px-2.5 py-1 bg-[#130707] hover:bg-[#200c0c] border border-red-800 text-[10px] font-bold text-red-400 flex items-center gap-1.5"
                      >
                        <Trash2 size={11} />
                        <span>{t.teams.deleteTeam}</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleLeave}
                        disabled={busy}
                        className="px-2.5 py-1 bg-[#130707] hover:bg-[#200c0c] border border-red-800 text-[10px] font-bold text-red-400 flex items-center gap-1.5"
                      >
                        <LogOut size={11} />
                        <span>{t.teams.leave}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {message && (
                <div
                  role={message.kind === 'error' ? 'alert' : 'status'}
                  className={`p-2 text-[11px] leading-snug border ${
                    message.kind === 'error'
                      ? 'bg-[#170808] border-red-800 text-red-400'
                      : 'bg-[color:var(--t-061509)] border-[color:var(--t-22c55e)] text-[color:var(--t-86efac)]'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Novo time */}
              <form onSubmit={handleCreate} className="space-y-1">
                <label htmlFor="team-new-name" className={label}>
                  {t.teams.createLabel}
                </label>
                <div className="flex gap-2">
                  <div className={`${field} flex-1`}>
                    <span className="text-[color:var(--t-21a04d)]">&gt;</span>
                    <input
                      id="team-new-name"
                      type="text"
                      maxLength={60}
                      autoComplete="off"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder={t.teams.createPlaceholder}
                      className={input}
                    />
                  </div>
                  <button type="submit" disabled={busy || !newTeamName.trim()} className={primaryButton}>
                    <Plus size={12} />
                    <span>{t.teams.create}</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="px-4 py-2 bg-[color:var(--t-020502)] border-t border-[color:var(--t-14351a)] flex items-center justify-between text-[10px] text-[color:var(--t-21a04d)] shrink-0">
          <span>OPERATOR TEAMS // SUPABASE</span>
          <button onClick={onClose} className="text-[color:var(--t-22c55e)] hover:underline">
            {t.common.closeTag}
          </button>
        </div>
      </div>
    </div>
  );
};
