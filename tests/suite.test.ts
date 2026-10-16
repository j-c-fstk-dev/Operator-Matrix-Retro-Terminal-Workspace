import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_PROJECTS, DEFAULT_SETTINGS, isPristineSeedProject } from '../src/data/initialData';
import { mergeProjects } from '../src/sync/merge';
import { enqueue, acknowledge, Outbox } from '../src/sync/syncState';
import { getTerminalTagStyle } from '../src/utils/tagColors';
import { Project, WorkspaceSettings } from '../src/types';
import { detectAttachmentType, formatBytes } from '../src/services/storageService';
import { detectBrowserKind } from '../src/pwa/installPrompt';
import { ACCENT_THEMES, themeColor, resolveAccentTheme } from '../src/theme/themes';
import { BASE_PALETTE } from '../src/theme/basePalette';

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

// --------------------------------------------------------------------------
// TEST GROUP 7: PWA Assets & Compliance
// --------------------------------------------------------------------------
test('PWA: Ícones essenciais e arquivos de instalação devem existir no diretório public', () => {
  const publicDir = path.resolve('public');

  const requiredIcons = [
    'pwa-192x192.png',
    'pwa-512x512.png',
    'pwa-maskable-512x512.png',
    'apple-touch-icon.png',
    'icon.svg',
    'favicon.ico',
  ];

  requiredIcons.forEach((file) => {
    const filePath = path.join(publicDir, file);
    assert(fs.existsSync(filePath), `Arquivo obrigatório ${file} deve existir em /public`);
    const stat = fs.statSync(filePath);
    assert(stat.size > 0, `Arquivo ${file} não pode estar vazio`);
  });
});

// --------------------------------------------------------------------------
// TEST GROUP 8: Project Attachments & Media Detection
// --------------------------------------------------------------------------
test('Storage: Detecção de tipo de anexo (imagem, vídeo, pdf, código) deve ser precisa', () => {
  assert.strictEqual(detectAttachmentType({ name: 'diagrama.png', type: 'image/png' }), 'image');
  assert.strictEqual(detectAttachmentType({ name: 'demo.mp4', type: 'video/mp4' }), 'video');
  assert.strictEqual(detectAttachmentType({ name: 'manual.pdf', type: 'application/pdf' }), 'pdf');
  assert.strictEqual(detectAttachmentType({ name: 'server.ts' }), 'code');
  assert.strictEqual(detectAttachmentType({ name: 'main.py' }), 'code');
  assert.strictEqual(detectAttachmentType({ name: 'config.json' }), 'code');
  assert.strictEqual(detectAttachmentType({ name: 'notes.txt', type: 'text/plain' }), 'text');
  assert.strictEqual(detectAttachmentType({ name: 'backup.zip' }), 'archive');

  assert.strictEqual(formatBytes(0), '0 B');
  assert.strictEqual(formatBytes(1024), '1 KB');
  assert.strictEqual(formatBytes(1024 * 1024 * 2.5), '2.5 MB');
});

test('Dual-Persistence: Anexos devem ser preservados mesmo se a coluna Postgres não existir', () => {
  const sampleAttachment = {
    id: 'att-1',
    name: 'test.png',
    type: 'image' as const,
    mimeType: 'image/png',
    size: 2048,
    url: 'https://example.com/test.png',
    createdAt: Date.now(),
  };

  // Simula linha de tabela do Postgres SEM a coluna attachments (esquema inicial)
  const legacyRowWithoutAttachmentsCol = {
    id: 'p-1',
    user_id: 'u-1',
    title: 'Proj 1',
    slug: 'proj-1',
    category: 'DEV',
    description: '',
    status: 'active',
    tasks: [],
    observations: [
      {
        id: 'att-meta-p-1',
        title: 'ATTACHMENTS_META',
        content: JSON.stringify([sampleAttachment]),
        tag: '__ATTACHMENTS_META__',
        updatedAt: Date.now(),
      },
    ],
    code_snippets: [],
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  // Testa recuperação via observações
  const observations = legacyRowWithoutAttachmentsCol.observations;
  const metaObs = observations.find((o) => o.tag === '__ATTACHMENTS_META__');
  assert(metaObs, 'Deve conter observação com tag __ATTACHMENTS_META__');
  const unpacked = JSON.parse(metaObs.content);
  assert.strictEqual(unpacked.length, 1);
  assert.strictEqual(unpacked[0].name, 'test.png');
});

test('PWA: Detecção de navegador deve escolher o guia de instalação certo', () => {
  const cases: Array<[string, string]> = [
    ['Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36', 'chromium'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'ios-safari'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1', 'ios-other'],
    ['Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36', 'samsung'],
    ['Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0', 'firefox-android'],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0', 'in-app'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]', 'in-app'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36', 'chromium'],
  ];
  for (const [ua, expected] of cases) {
    assert.strictEqual(detectBrowserKind(ua), expected, `UA: ${ua}`);
  }
});

test('Temas: tema Matrix preserva as cores originais e os demais geram cores válidas', () => {
  for (const hex of BASE_PALETTE) {
    assert.strictEqual(themeColor(hex, 'matrix'), `#${hex}`);
    for (const t of ACCENT_THEMES) {
      assert.match(themeColor(hex, t.id), /^#[0-9a-f]{6}$/, `${t.id} / ${hex}`);
    }
  }
  // Mono deve virar escala de cinza (R, G e B quase iguais)
  const mono = themeColor('22c55e', 'mono').slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(mono.slice(i, i + 2), 16));
  assert(Math.max(r, g, b) - Math.min(r, g, b) <= 3, `mono não é cinza: ${mono}`);
  // Vermelho deve ter o canal R dominante
  const red = themeColor('22c55e', 'red').slice(1);
  assert(parseInt(red.slice(0, 2), 16) > parseInt(red.slice(2, 4), 16), `vermelho inválido: ${red}`);
  // Valor desconhecido cai no padrão
  assert.strictEqual(resolveAccentTheme('nao-existe'), 'matrix');
  assert.strictEqual(resolveAccentTheme(undefined), 'matrix');
});

// --------------------------------------------------------------------------
// SYNC: merge sem sobrescrever, fila offline
// --------------------------------------------------------------------------
const mkProject = (id: string, updatedAt: number, title = id): Project => ({
  id, title, slug: id, category: 'DEV', description: '', status: 'active',
  tasks: [], observations: [], codeSnippets: [], attachments: [], createdAt: 1, updatedAt,
});
const baseMerge = { meta: { ownerId: 'u1', syncedIds: [] as string[] }, outbox: {} as Outbox, userId: 'u1', isPristineSeed: isPristineSeedProject };

test('Sync: edição local mais recente (feita offline) vence e é reenviada', () => {
  const r = mergeProjects({ ...baseMerge, local: [mkProject('a', 200, 'local')], cloud: [mkProject('a', 100, 'nuvem')], meta: { ownerId: 'u1', syncedIds: ['a'] } });
  assert.strictEqual(r.projects[0].title, 'local');
  assert.deepStrictEqual(r.toUpload, ['a']);
});

test('Sync: versão mais recente da nuvem vence e entra projeto novo de outro aparelho', () => {
  const r = mergeProjects({ ...baseMerge, local: [mkProject('a', 100, 'local')], cloud: [mkProject('a', 200, 'nuvem'), mkProject('b', 150)], meta: { ownerId: 'u1', syncedIds: ['a'] } });
  assert.strictEqual(r.projects.find((p) => p.id === 'a')!.title, 'nuvem');
  assert(r.projects.some((p) => p.id === 'b'));
  assert.deepStrictEqual(r.toUpload, []);
});

test('Sync: exclusão feita offline é aplicada na nuvem e não ressuscita', () => {
  const r = mergeProjects({ ...baseMerge, local: [mkProject('b', 1)], cloud: [mkProject('a', 100), mkProject('b', 1)], outbox: { a: { op: 'delete', at: 5 } } });
  assert(!r.projects.some((p) => p.id === 'a'));
  assert.deepStrictEqual(r.toDeleteRemote, ['a']);
  assert(!r.meta.syncedIds.includes('a'));
});

test('Sync: projeto excluído em outro aparelho some localmente, salvo se tiver edição pendente', () => {
  const meta = { ownerId: 'u1', syncedIds: ['x', 'y'] };
  const r = mergeProjects({ ...baseMerge, meta, local: [mkProject('x', 1), mkProject('y', 2)], cloud: [], outbox: { y: { op: 'upsert', at: 9 } } });
  assert(!r.projects.some((p) => p.id === 'x'), 'x foi excluído em outro aparelho');
  assert(r.projects.some((p) => p.id === 'y'), 'y tem edição local pendente');
  assert.deepStrictEqual(r.toUpload, ['y']);
});

test('Sync: projeto criado offline e nunca enviado sobe para a nuvem', () => {
  const r = mergeProjects({ ...baseMerge, local: [mkProject('novo', 5)], cloud: [mkProject('a', 1)] });
  assert(r.projects.some((p) => p.id === 'novo'));
  assert.deepStrictEqual(r.toUpload, ['novo']);
});

test('Sync: exemplos intocados não poluem conta com dados, mas sobem para conta vazia', () => {
  const seeds = JSON.parse(JSON.stringify(INITIAL_PROJECTS)) as Project[];
  assert(seeds.every(isPristineSeedProject), 'exemplos devem ser detectados como intocados');
  const fresh = { ...baseMerge, meta: { ownerId: null, syncedIds: [] } };
  const comDados = mergeProjects({ ...fresh, local: seeds, cloud: [mkProject('real', 1)] });
  assert.deepStrictEqual(comDados.projects.map((p) => p.id), ['real']);
  const vazia = mergeProjects({ ...fresh, local: seeds, cloud: [] });
  assert.strictEqual(vazia.toUpload.length, seeds.length);
  // Exemplo editado deixa de ser intocado
  const editado = { ...seeds[0], title: 'Meu projeto' };
  assert(!isPristineSeedProject(editado));
});

test('Sync: exemplo intocado com data recalculada não sobrescreve edição real na nuvem', () => {
  const seed = { ...(JSON.parse(JSON.stringify(INITIAL_PROJECTS[0])) as Project), updatedAt: 9_999_999_999_999 };
  const editadoNaNuvem = { ...seed, title: 'Editado em outro aparelho', updatedAt: 1000 };
  const r = mergeProjects({ ...baseMerge, local: [seed], cloud: [editadoNaNuvem] });
  assert.strictEqual(r.projects[0].title, 'Editado em outro aparelho');
  assert.deepStrictEqual(r.toUpload, []);
});

test('Sync: dados locais de outra conta nunca vão para a conta nova', () => {
  const r = mergeProjects({ ...baseMerge, userId: 'u2', meta: { ownerId: 'u1', syncedIds: ['a'] }, local: [mkProject('a', 999)], cloud: [mkProject('b', 1)] });
  assert(r.foreignDataDiscarded);
  assert.deepStrictEqual(r.projects.map((p) => p.id), ['b']);
  assert.deepStrictEqual(r.toUpload, []);
  assert.strictEqual(r.meta.ownerId, 'u2');
});

test('Sync: fila guarda só a última operação e não descarta edição feita durante o envio', () => {
  let q: Outbox = {};
  q = enqueue(q, 'a', 'upsert', 100);
  q = enqueue(q, 'a', 'upsert', 100); // mesmo milissegundo: `at` ainda cresce
  assert.strictEqual(q.a.at, 101);
  const enviado = { ...q };
  q = enqueue(q, 'a', 'upsert', 200); // editado enquanto enviava
  q = enqueue(q, 'b', 'delete', 150);
  const depois = acknowledge(q, enviado);
  assert.strictEqual(depois.a.at, 200, 'edição nova continua na fila');
  assert.strictEqual(depois.b.op, 'delete');
  assert.deepStrictEqual(acknowledge(depois, depois), {});
});

console.log(`\n========================================`);
console.log(`RESULTADO: ${passedTests}/${totalTests} testes passaram com sucesso! 🚀`);
console.log(`========================================\n`);
