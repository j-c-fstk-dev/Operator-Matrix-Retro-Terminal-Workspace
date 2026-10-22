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
  attachments?: any;
  created_at: number;
  updated_at: number;
}

function mapRowToProject(row: any): Project {
  // Check attachments from column, or unpack from backup metadata in observations
  let attachments: any[] = Array.isArray(row.attachments) ? row.attachments : [];
  const rawObservations = Array.isArray(row.observations) ? row.observations : [];

  if (attachments.length === 0 && rawObservations.length > 0) {
    const metaIndex = rawObservations.findIndex((o: any) => o.tag === '__ATTACHMENTS_META__');
    if (metaIndex !== -1) {
      try {
        attachments = JSON.parse(rawObservations[metaIndex].content);
      } catch (e) {
        console.warn('Erro ao decodificar __ATTACHMENTS_META__:', e);
      }
    }
  }

  // Filter out internal metadata from user-visible observations
  const cleanObservations = rawObservations.filter((o: any) => o.tag !== '__ATTACHMENTS_META__');

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category || 'GERAL',
    description: row.description || '',
    status: (row.status as Project['status']) || 'active',
    tasks: Array.isArray(row.tasks) ? row.tasks : [],
    observations: cleanObservations,
    codeSnippets: Array.isArray(row.code_snippets) ? row.code_snippets : [],
    attachments,
    createdAt: Number(row.created_at) || Date.now(),
    updatedAt: Number(row.updated_at) || Date.now(),
  };
}

function mapProjectToRow(userId: string, project: Project, includeAttachmentsCol: boolean = true): any {
  const cleanObservations = (project.observations || []).filter((o) => o.tag !== '__ATTACHMENTS_META__');
  const observationsWithBackup = [...cleanObservations];

  // If there are attachments, always embed a backup in observations so that even if the SQL
  // schema doesn't have the attachments column, all attachments sync across devices!
  if (project.attachments && project.attachments.length > 0) {
    observationsWithBackup.push({
      id: `att-meta-${project.id}`,
      title: 'ATTACHMENTS_META',
      content: JSON.stringify(project.attachments),
      tag: '__ATTACHMENTS_META__',
      updatedAt: Date.now(),
    });
  }

  const row: any = {
    id: project.id,
    user_id: userId,
    title: project.title,
    slug: project.slug,
    category: project.category || 'GERAL',
    description: project.description || '',
    status: project.status || 'active',
    tasks: project.tasks || [],
    observations: observationsWithBackup,
    code_snippets: project.codeSnippets || [],
    created_at: project.createdAt || Date.now(),
    updated_at: project.updatedAt || Date.now(),
  };

  if (includeAttachmentsCol) {
    row.attachments = project.attachments || [];
  }

  return row;
}

// O id do projeto só é único por usuário (os projetos de exemplo têm o mesmo id para todos),
// então a chave é (user_id, id). Bancos criados antes de supabase/schema.sql migrar a chave
// ainda só aceitam onConflict 'id' (erro 42P10); nesse caso tenta do jeito antigo.
async function upsertRows(rows: any[]) {
  const first = await supabase!.from('projects').upsert(rows, { onConflict: 'user_id,id' });
  if ((first.error as any)?.code !== '42P10') return first;
  return supabase!.from('projects').upsert(rows, { onConflict: 'id' });
}

const isMissingAttachmentsColumn = (error: any) =>
  Boolean(error && (String(error.message).includes('attachments') || error.code === '42703'));

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

    // First attempt: try with attachments column
    let { error } = await upsertRows([mapProjectToRow(userId, project, true)]);

    // If Postgres failed because the column "attachments" doesn't exist yet, retry without that column!
    if (isMissingAttachmentsColumn(error)) {
      console.warn('[Supabase] Coluna attachments ausente na tabela projects. Sincronizando via observations...');
      ({ error } = await upsertRows([mapProjectToRow(userId, project, false)]));
    }

    if (error) {
      console.error('[Supabase] Erro ao salvar projeto:', error.message);
      throw error;
    }
  },

  async upsertAllProjects(userId: string, projects: Project[]): Promise<void> {
    if (!supabase || !isSupabaseConfigured || projects.length === 0) return;

    let { error } = await upsertRows(projects.map((p) => mapProjectToRow(userId, p, true)));

    if (isMissingAttachmentsColumn(error)) {
      console.warn('[Supabase] Coluna attachments ausente. Sincronizando via observations...');
      ({ error } = await upsertRows(projects.map((p) => mapProjectToRow(userId, p, false))));
    }

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
