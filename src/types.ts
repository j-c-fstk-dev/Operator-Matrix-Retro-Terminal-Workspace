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
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
}

export interface WorkspaceSettings {
  rainEnabled: boolean;
  rainOpacity: number;
  scanlines: boolean;
  soundEnabled: boolean;
  glowEffect: boolean;
}
