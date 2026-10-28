import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mapProjectToRow, mapRowToProject } from '../services/supabaseService';
import { Project, Team, TeamMember, TeamRole } from '../types';

// Chamadas ao banco para times e projetos de time (ver supabase/teams.sql).
// Projetos de time não passam pela fila offline: são salvos direto no servidor.

export type AddMemberResult = 'added' | 'already_member' | 'not_found';

function db() {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase not configured');
  return supabase;
}

function check<T>({ data, error }: { data: T; error: any }): T {
  if (error) throw error;
  return data;
}

export const teamService = {
  async listMyTeams(userId: string): Promise<Team[]> {
    const rows = check(
      await db().from('team_members').select('role, teams(id, name)').eq('user_id', userId)
    ) as any[];
    return (rows || [])
      .filter((r) => r.teams)
      .map((r) => ({ id: r.teams.id, name: r.teams.name, role: r.role as TeamRole }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async createTeam(name: string): Promise<string> {
    return check(await db().rpc('create_team', { p_name: name })) as string;
  },

  async addMember(teamId: string, email: string): Promise<AddMemberResult> {
    return check(await db().rpc('add_team_member', { p_team: teamId, p_email: email })) as AddMemberResult;
  },

  async listMembers(teamId: string): Promise<TeamMember[]> {
    const rows = check(await db().rpc('list_team_members', { p_team: teamId })) as any[];
    return (rows || []).map((r) => ({ userId: r.user_id, email: r.email, role: r.role }));
  },

  /** Remove um membro (dona) ou sai do time (o próprio membro). */
  async removeMember(teamId: string, userId: string): Promise<boolean> {
    const rows = check(
      await db().from('team_members').delete().eq('team_id', teamId).eq('user_id', userId).select('user_id')
    ) as any[];
    return (rows || []).length > 0;
  },

  async renameTeam(teamId: string, name: string): Promise<void> {
    check(await db().from('teams').update({ name: name.trim() }).eq('id', teamId));
  },

  async deleteTeam(teamId: string): Promise<boolean> {
    const rows = check(await db().from('teams').delete().eq('id', teamId).select('id')) as any[];
    return (rows || []).length > 0;
  },

  /** Projetos de todos os meus times (as regras do banco devolvem só os que posso ver). */
  async fetchTeamProjects(): Promise<Project[]> {
    const rows = check(await db().from('projects').select('*').not('team_id', 'is', null)) as any[];
    return (rows || []).map(mapRowToProject);
  },

  async fetchTeamProject(ownerId: string, id: string): Promise<Project | null> {
    const rows = check(
      await db().from('projects').select('*').eq('user_id', ownerId).eq('id', id).limit(1)
    ) as any[];
    return rows && rows[0] && rows[0].team_id ? mapRowToProject(rows[0]) : null;
  },

  /**
   * Salva só se o servidor ainda estiver na versão que eu tinha (baseVersion).
   * Devolve a versão salva, ou null se outra pessoa salvou antes (conflito).
   */
  async saveTeamProject(project: Project, baseVersion: number): Promise<Project | null> {
    const { id: _id, user_id: _owner, created_at: _created, ...fields } = mapProjectToRow(project.ownerId!, project, true);
    const rows = check(
      await db()
        .from('projects')
        .update(fields)
        .eq('user_id', project.ownerId!)
        .eq('id', project.id)
        .eq('version', baseVersion)
        .select('*')
    ) as any[];
    return rows && rows[0] ? mapRowToProject(rows[0]) : null;
  },

  /** Compartilha (teamId) ou descompartilha (null) um projeto meu. Devolve a linha atualizada. */
  async setProjectTeam(ownerId: string, id: string, teamId: string | null): Promise<Project | null> {
    const rows = check(
      await db().from('projects').update({ team_id: teamId }).eq('user_id', ownerId).eq('id', id).select('*')
    ) as any[];
    return rows && rows[0] ? mapRowToProject(rows[0]) : null;
  },

  async deleteTeamProject(ownerId: string, id: string): Promise<boolean> {
    const rows = check(
      await db().from('projects').delete().eq('user_id', ownerId).eq('id', id).select('id')
    ) as any[];
    return (rows || []).length > 0;
  },
};
