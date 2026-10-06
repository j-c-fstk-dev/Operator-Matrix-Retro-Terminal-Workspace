import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Project } from '../types';

interface DbProjectRow {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  status: string;
  tasks: any;
  observations: any;
  code_snippets: any;
  created_at: number;
  updated_at: number;
}

function mapRowToProject(row: DbProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category || 'GERAL',
    description: row.description || '',
    status: (row.status as Project['status']) || 'active',
    tasks: Array.isArray(row.tasks) ? row.tasks : [],
    observations: Array.isArray(row.observations) ? row.observations : [],
    codeSnippets: Array.isArray(row.code_snippets) ? row.code_snippets : [],
    createdAt: Number(row.created_at) || Date.now(),
    updatedAt: Number(row.updated_at) || Date.now(),
  };
}

function mapProjectToRow(userId: string, project: Project): DbProjectRow {
  return {
    id: project.id,
    user_id: userId,
    title: project.title,
    slug: project.slug,
    category: project.category || 'GERAL',
    description: project.description || '',
    status: project.status || 'active',
    tasks: project.tasks || [],
    observations: project.observations || [],
    code_snippets: project.codeSnippets || [],
    created_at: project.createdAt || Date.now(),
    updated_at: project.updatedAt || Date.now(),
  };
}

export const supabaseService = {
  async fetchUserProjects(userId: string): Promise<Project[]> {
    if (!supabase || !isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Erro ao buscar projetos:', error.message);
      throw error;
    }

    if (!data) return [];
    return data.map((row: any) => mapRowToProject(row));
  },

  async upsertProject(userId: string, project: Project): Promise<void> {
    if (!supabase || !isSupabaseConfigured) return;

    const row = mapProjectToRow(userId, project);
    const { error } = await supabase
      .from('projects')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('[Supabase] Erro ao salvar projeto:', error.message);
      throw error;
    }
  },

  async upsertAllProjects(userId: string, projects: Project[]): Promise<void> {
    if (!supabase || !isSupabaseConfigured || projects.length === 0) return;

    const rows = projects.map((p) => mapProjectToRow(userId, p));
    const { error } = await supabase
      .from('projects')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('[Supabase] Erro ao sincronizar projetos:', error.message);
      throw error;
    }
  },

  async deleteProject(userId: string, projectId: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured) return;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) {
      console.error('[Supabase] Erro ao deletar projeto:', error.message);
      throw error;
    }
  },
};
