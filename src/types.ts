export interface SubTask {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  priority?: 'low' | 'med' | 'high';
  tags?: string[];
  notes?: string;
  subtasks: SubTask[];
  createdAt: number;
}

export interface Observation {
  id: string;
  title: string;
  content: string;
  tag?: string;
  updatedAt: number;
}

export interface CodeSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  updatedAt: number;
}

export type AttachmentType = 'image' | 'video' | 'pdf' | 'code' | 'text' | 'archive' | 'other';

export interface ProjectAttachment {
  id: string;
  name: string;
  type: AttachmentType;
  mimeType: string;
  size: number; // tamanho em bytes
  url: string; // URL pública do Supabase Storage ou Data URL
  storagePath?: string; // Caminho no bucket para exclusão
  createdAt: number;
  description?: string;
  textContent?: string; // Conteúdo de texto para snippets/txt/código
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  status: 'active' | 'in_progress' | 'standby' | 'completed';
  tasks: Task[];
  observations: Observation[];
  codeSnippets: CodeSnippet[];
  attachments?: ProjectAttachment[];
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
  // Projetos de time (vêm só do servidor; projetos pessoais não usam estes campos).
  /** Time com quem o projeto está compartilhado. */
  teamId?: string | null;
  /** Conta dona do projeto (a pasta dos anexos é a dela). */
  ownerId?: string;
  /** Versão no servidor, para detectar edições simultâneas. */
  version?: number;
  /** Quem fez a última alteração. */
  updatedBy?: string | null;
}

export type TeamRole = 'owner' | 'member';

export interface Team {
  id: string;
  name: string;
  /** Meu papel neste time. */
  role: TeamRole;
}

export interface TeamMember {
  userId: string;
  email: string;
  role: TeamRole;
}

export interface WorkspaceSettings {
  rainEnabled: boolean;
  rainOpacity: number;
  /** Versão da escala de opacidade da chuva (2 = chuva visível atrás dos painéis). */
  rainScale?: number;
  scanlines: boolean;
  soundEnabled: boolean;
  glowEffect: boolean;
  accentTheme?: string;
  /** Idioma da interface. Sem valor, o app usa o idioma do navegador. */
  language?: 'pt' | 'en';
}
