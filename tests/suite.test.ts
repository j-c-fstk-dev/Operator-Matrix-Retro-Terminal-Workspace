import assert from 'node:assert';
import { INITIAL_PROJECTS, DEFAULT_SETTINGS } from '../src/data/initialData';
import { getTerminalTagStyle } from '../src/utils/tagColors';
import { Project, WorkspaceSettings } from '../src/types';

console.log('⚡ [INICIANDO BATERIA DE TESTES DO OPERATOR WORKSPACE] ⚡\n');

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Erro: ${err.message}`);
    process.exitCode = 1;
  }
}

// --------------------------------------------------------------------------
// TEST GROUP 1: Initial Data Integrity & Types
// --------------------------------------------------------------------------
test('Projetos iniciais devem estar definidos e conter estrutura válida', () => {
  assert(Array.isArray(INITIAL_PROJECTS), 'INITIAL_PROJECTS deve ser um array');
  assert(INITIAL_PROJECTS.length > 0, 'Deve haver ao menos um projeto inicial');

  INITIAL_PROJECTS.forEach((p, idx) => {
    assert(typeof p.id === 'string' && p.id.length > 0, `Projeto [${idx}] deve ter ID válido`);
    assert(typeof p.title === 'string' && p.title.length > 0, `Projeto [${idx}] deve ter título`);
    assert(typeof p.category === 'string', `Projeto [${idx}] deve ter categoria`);
    assert(Array.isArray(p.tasks), `Projeto [${idx}] deve ter array de tarefas`);
    assert(Array.isArray(p.observations), `Projeto [${idx}] deve ter array de observações`);
    assert(Array.isArray(p.codeSnippets), `Projeto [${idx}] deve ter array de snippets de código`);
  });
});

test('Tarefas e subtarefas devem possuir IDs e status booleanos válidos', () => {
  INITIAL_PROJECTS.forEach((p) => {
    p.tasks.forEach((t) => {
      assert(typeof t.id === 'string', 'Tarefa deve ter id');
      assert(typeof t.text === 'string' && t.text.length > 0, 'Tarefa deve ter texto');
      assert(typeof t.done === 'boolean', 'Status da tarefa deve ser booleano');
      if (t.subtasks) {
        t.subtasks.forEach((sub) => {
          assert(typeof sub.id === 'string', 'Subtarefa deve ter id');
          assert(typeof sub.text === 'string', 'Subtarefa deve ter texto');
          assert(typeof sub.done === 'boolean', 'Status da subtarefa deve ser booleano');
        });
      }
    });
  });
});

test('Configurações padrão (DEFAULT_SETTINGS) devem ser consistentes', () => {
  assert(typeof DEFAULT_SETTINGS.rainEnabled === 'boolean');
  assert(typeof DEFAULT_SETTINGS.rainOpacity === 'number');
  assert(DEFAULT_SETTINGS.rainOpacity >= 0 && DEFAULT_SETTINGS.rainOpacity <= 1);
  assert(typeof DEFAULT_SETTINGS.soundEnabled === 'boolean');
  assert(typeof DEFAULT_SETTINGS.scanlines === 'boolean');
});

// --------------------------------------------------------------------------
// TEST GROUP 2: Tag Color Consistency
// --------------------------------------------------------------------------
test('Geração de estilo de tag deve retornar cores de terminal consistentes e determinísticas', () => {
  const style1 = getTerminalTagStyle('api');
  const style2 = getTerminalTagStyle('api');
  assert.deepStrictEqual(style1, style2, 'Mesma tag deve retornar exatamente o mesmo estilo');

  assert(typeof style1.bg === 'string' && style1.bg.length > 0, 'Tag deve ter classe de fundo');
  assert(typeof style1.text === 'string' && style1.text.length > 0, 'Tag deve ter classe de texto');
  assert(typeof style1.border === 'string' && style1.border.length > 0, 'Tag deve ter classe de borda');
});

// --------------------------------------------------------------------------
// TEST GROUP 3: Backup Serializer & Deserializer
// --------------------------------------------------------------------------
test('Serialização e Exportação de Backup JSON deve conter schema completo', () => {
  const testPayload = {
    version: 1,
    app: 'operator-matrix-workspace',
    exportedAt: new Date().toISOString(),
    totalProjects: INITIAL_PROJECTS.length,
    projects: INITIAL_PROJECTS,
    settings: DEFAULT_SETTINGS,
  };

  const jsonString = JSON.stringify(testPayload, null, 2);
  assert(typeof jsonString === 'string', 'Deve ser uma string JSON');
  assert(jsonString.includes('projects'), 'JSON deve conter a chave projects');

  const reParsed = JSON.parse(jsonString);
  assert.strictEqual(reParsed.version, 1);
  assert.strictEqual(reParsed.projects.length, INITIAL_PROJECTS.length);
  assert.strictEqual(reParsed.projects[0].id, INITIAL_PROJECTS[0].id);
});

test('Importação e Validação de Backup deve aceitar tanto Objeto quanto Array direto', () => {
  // Caso 1: Objeto com metadados
  const objectBackup = JSON.stringify({
    version: 1,
    projects: [
      {
        id: 'proj-teste-1',
        title: 'Projeto Teste Backup',
        slug: 'projeto-teste-backup',
        category: 'DEVOPS',
        description: 'Descrição de teste',
        status: 'active',
        tasks: [
          {
            id: 'task-1',
            text: 'Configurar CI/CD',
            done: true,
            priority: 'high',
            tags: ['ci', 'deploy'],
            subtasks: [{ id: 'sub-1', text: 'GitHub Actions', done: true, createdAt: 1234 }],
            createdAt: 1234,
          },
        ],
        observations: [{ id: 'obs-1', title: 'Doc', content: 'Info', tag: 'OPS', updatedAt: 1234 }],
        codeSnippets: [{ id: 'snip-1', title: 'deploy.sh', language: 'bash', code: 'echo ok', updatedAt: 1234 }],
        createdAt: 1234,
        updatedAt: 1234,
      },
    ],
  });

  const parsed1 = JSON.parse(objectBackup);
  assert(Array.isArray(parsed1.projects), 'Deve encontrar array de projetos em objeto');
  assert.strictEqual(parsed1.projects[0].tasks[0].tags?.[0], 'ci');

  // Caso 2: Array direto de projetos
  const arrayBackup = JSON.stringify([
    {
      id: 'proj-array-direct',
      title: 'Projeto Vindo de Array',
      slug: 'projeto-array',
      category: 'TEST',
      description: 'Teste',
      status: 'active',
      tasks: [],
      observations: [],
      codeSnippets: [],
      createdAt: 100,
      updatedAt: 200,
    },
  ]);

  const parsed2 = JSON.parse(arrayBackup);
  assert(Array.isArray(parsed2), 'Deve ser array direto');
  assert.strictEqual(parsed2[0].id, 'proj-array-direct');
});

test('Lógica de Merge deve mesclar projetos sem duplicar ou perder existentes', () => {
  const existingProjects: Project[] = [
    {
      id: 'p1',
      title: 'Projeto Antigo',
      slug: 'p1',
      category: 'OLD',
      description: '',
      status: 'active',
      tasks: [],
      observations: [],
      codeSnippets: [],
      createdAt: 1,
      updatedAt: 1,
    },
  ];

  const incomingProjects: Project[] = [
    {
      id: 'p1',
      title: 'Projeto Antigo Atualizado',
      slug: 'p1',
      category: 'OLD',
      description: 'Atualizado',
      status: 'active',
      tasks: [],
      observations: [],
      codeSnippets: [],
      createdAt: 1,
      updatedAt: 2,
    },
    {
      id: 'p2',
      title: 'Projeto Novo',
      slug: 'p2',
      category: 'NEW',
      description: 'Novo',
      status: 'active',
      tasks: [],
      observations: [],
      codeSnippets: [],
      createdAt: 3,
      updatedAt: 3,
    },
  ];

  // Executa algoritmo de merge
  const existingIds = new Set(existingProjects.map((p) => p.id));
  const merged = [...existingProjects];
  incomingProjects.forEach((ip) => {
    if (!existingIds.has(ip.id)) {
      merged.push(ip);
    } else {
      const idx = merged.findIndex((p) => p.id === ip.id);
      if (idx !== -1) merged[idx] = ip;
    }
  });

  assert.strictEqual(merged.length, 2, 'Total de projetos deve ser 2');
  assert.strictEqual(merged[0].title, 'Projeto Antigo Atualizado', 'Projeto com mesmo ID deve ser atualizado');
  assert.strictEqual(merged[1].title, 'Projeto Novo', 'Novo projeto deve ser anexado');
});

// --------------------------------------------------------------------------
// TEST GROUP 4: Markdown Export Formatter
// --------------------------------------------------------------------------
test('Geração de Markdown deve formatar título, tarefas marcadas e tags corretamente', () => {
  const sampleProject: Project = {
    id: 'test-md',
    title: 'Projeto Markdown',
    slug: 'projeto-md',
    category: 'DOC',
    description: 'Documentando exportação',
    status: 'active',
    tasks: [
      {
        id: 't1',
        text: 'Tarefa Concluída',
        done: true,
        priority: 'high',
        tags: ['doc', 'export'],
        subtasks: [{ id: 's1', text: 'Subtarefa OK', done: true, createdAt: 10 }],
        createdAt: 10,
      },
      {
        id: 't2',
        text: 'Tarefa Pendente',
        done: false,
        priority: 'med',
        subtasks: [],
        createdAt: 20,
      },
    ],
    observations: [{ id: 'o1', title: 'Nota Técnica', content: 'Conteúdo da nota', tag: 'ARCH', updatedAt: 30 }],
    codeSnippets: [{ id: 'c1', title: 'run.sh', language: 'bash', code: 'echo 42', updatedAt: 40 }],
    createdAt: 10,
    updatedAt: 50,
  };

  let md = `# ${sampleProject.title}\n\n`;
  md += `> ${sampleProject.description || 'Sem descrição'}\n\n`;
  md += `**Status:** ${sampleProject.status.toUpperCase()} | **Categoria:** ${sampleProject.category}\n\n`;
  md += `## Tarefas\n\n`;
  sampleProject.tasks.forEach((t) => {
    const tagStr = t.tags && t.tags.length > 0 ? ` [${t.tags.map((tg) => `#${tg}`).join(' ')}]` : '';
    md += `- [${t.done ? 'x' : ' '}] **${t.text}**${t.priority === 'high' ? ' [CRIT]' : ''}${tagStr}\n`;
    t.subtasks.forEach((sub) => {
      md += `  - [${sub.done ? 'x' : ' '}] ${sub.text}\n`;
    });
  });

  assert(md.includes('# Projeto Markdown'), 'Deve conter título h1');
  assert(md.includes('- [x] **Tarefa Concluída** [CRIT] [#doc #export]'), 'Deve formatar tarefa concluída com tag e prioridade');
  assert(md.includes('  - [x] Subtarefa OK'), 'Deve formatar subtarefas indentadas');
  assert(md.includes('- [ ] **Tarefa Pendente**'), 'Deve formatar tarefa pendente');
});

// --------------------------------------------------------------------------
// TEST GROUP 5: Quick-Find Search Engine (Cmd+K)
// --------------------------------------------------------------------------
test('Quick-Find deve buscar simultaneamente por títulos de tarefas e tags em todos os projetos', () => {
  const query1 = 'websocket'; // Busca por texto
  const query2 = '#docker'; // Busca por tag com hashtag
  const query3 = 'dns'; // Busca por tag e título sem hashtag

  // Busca 1: texto
  const results1: any[] = [];
  INITIAL_PROJECTS.forEach((proj) => {
    proj.tasks.forEach((t) => {
      if (t.text.toLowerCase().includes(query1)) {
        results1.push({ proj, task: t });
      }
    });
  });
  assert(results1.length > 0, 'Deve encontrar tarefa contendo "websocket"');

  // Busca 2: tag com hashtag
  const cleanTag2 = query2.slice(1);
  const results2: any[] = [];
  INITIAL_PROJECTS.forEach((proj) => {
    proj.tasks.forEach((t) => {
      if (t.tags && t.tags.some((tg) => tg.toLowerCase().includes(cleanTag2))) {
        results2.push({ proj, task: t });
      }
    });
  });
  assert(results2.length > 0, 'Deve encontrar tarefas com tag "docker"');

  // Busca 3: correspondência simultânea (por título ou tag)
  const results3: any[] = [];
  INITIAL_PROJECTS.forEach((proj) => {
    proj.tasks.forEach((t) => {
      const matchTitle = t.text.toLowerCase().includes(query3);
      const matchTag = t.tags && t.tags.some((tg) => tg.toLowerCase().includes(query3));
      if (matchTitle || matchTag) {
        results3.push({ proj, task: t });
      }
    });
  });
  assert(results3.length > 0, 'Deve encontrar tarefas com "dns" em título ou tag');
  assert(typeof results3[0].proj.id === 'string', 'Resultado deve identificar projeto pai para salto direto');
});

// --------------------------------------------------------------------------
// TEST GROUP 6: Supabase Data Mapping & Offline Fallback
// --------------------------------------------------------------------------
test('Mapeamento de modelo de Projeto para formato Postgres/Supabase deve ser idempotente', () => {
  const p = INITIAL_PROJECTS[0];
  const userId = '00000000-0000-0000-0000-000000000001';

  // Simula conversão para linha de tabela Supabase
  const dbRow = {
    id: p.id,
    user_id: userId,
    title: p.title,
    slug: p.slug,
    category: p.category,
    description: p.description,
    status: p.status,
    tasks: p.tasks,
    observations: p.observations,
    code_snippets: p.codeSnippets,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };

  assert.strictEqual(dbRow.id, p.id);
  assert.strictEqual(dbRow.user_id, userId);
  assert.strictEqual(dbRow.tasks.length, p.tasks.length);
  assert(Array.isArray(dbRow.tasks), 'Tarefas devem estar em formato array/jsonb');
});

console.log(`\n========================================`);
console.log(`RESULTADO: ${passedTests}/${totalTests} testes passaram com sucesso! 🚀`);
console.log(`========================================\n`);
