import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { SEED_PROJECTS_PT, DEFAULT_SETTINGS, isPristineSeedProject, getInitialProjects, localizeSeedProjects } from '../src/data/initialData';
import { SEED_PROJECTS_EN } from '../src/data/initialData.en';
import { pt } from '../src/i18n/pt';
import { en } from '../src/i18n/en';
import { detectLang, resolveLang, setCurrentLang, getT } from '../src/i18n';
import { buildCommandCatalog, suggestCommands, resolveThemeName } from '../src/commands/suggest';
import { mergeProjectEdits, mergeList } from '../src/teams/mergeEdits';
import { mergeProjects } from '../src/sync/merge';
import { enqueue, acknowledge, Outbox } from '../src/sync/syncState';
import { getTerminalTagStyle } from '../src/utils/tagColors';
import { Project, WorkspaceSettings } from '../src/types';
import { detectAttachmentType, formatBytes, assertFileSize, MAX_CLOUD_FILE_BYTES, MAX_LOCAL_FILE_BYTES } from '../src/services/storageService';
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
  assert(Array.isArray(SEED_PROJECTS_PT), 'SEED_PROJECTS_PT deve ser um array');
  assert(SEED_PROJECTS_PT.length > 0, 'Deve haver ao menos um projeto inicial');

  SEED_PROJECTS_PT.forEach((p, idx) => {
    assert(typeof p.id === 'string' && p.id.length > 0, `Projeto [${idx}] deve ter ID válido`);
    assert(typeof p.title === 'string' && p.title.length > 0, `Projeto [${idx}] deve ter título`);
    assert(typeof p.category === 'string', `Projeto [${idx}] deve ter categoria`);
    assert(Array.isArray(p.tasks), `Projeto [${idx}] deve ter array de tarefas`);
    assert(Array.isArray(p.observations), `Projeto [${idx}] deve ter array de observações`);
    assert(Array.isArray(p.codeSnippets), `Projeto [${idx}] deve ter array de snippets de código`);
  });
});

test('Tarefas e subtarefas devem possuir IDs e status booleanos válidos', () => {
  SEED_PROJECTS_PT.forEach((p) => {
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
    totalProjects: SEED_PROJECTS_PT.length,
    projects: SEED_PROJECTS_PT,
    settings: DEFAULT_SETTINGS,
  };

  const jsonString = JSON.stringify(testPayload, null, 2);
  assert(typeof jsonString === 'string', 'Deve ser uma string JSON');
  assert(jsonString.includes('projects'), 'JSON deve conter a chave projects');

  const reParsed = JSON.parse(jsonString);
  assert.strictEqual(reParsed.version, 1);
  assert.strictEqual(reParsed.projects.length, SEED_PROJECTS_PT.length);
  assert.strictEqual(reParsed.projects[0].id, SEED_PROJECTS_PT[0].id);
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
  SEED_PROJECTS_PT.forEach((proj) => {
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
  SEED_PROJECTS_PT.forEach((proj) => {
    proj.tasks.forEach((t) => {
      if (t.tags && t.tags.some((tg) => tg.toLowerCase().includes(cleanTag2))) {
        results2.push({ proj, task: t });
      }
    });
  });
  assert(results2.length > 0, 'Deve encontrar tarefas com tag "docker"');

  // Busca 3: correspondência simultânea (por título ou tag)
  const results3: any[] = [];
  SEED_PROJECTS_PT.forEach((proj) => {
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
  const p = SEED_PROJECTS_PT[0];
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

test('Temas: texto secundário tem contraste AA (4,5:1) sobre o fundo em todos os temas', () => {
  const luminance = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  // 21a04d: texto secundário; 030704: fundo da página.
  for (const t of ACCENT_THEMES) {
    const r = ratio(themeColor('21a04d', t.id), themeColor('030704', t.id));
    assert(r >= 4.5, `${t.id}: contraste ${r.toFixed(2)}:1`);
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
  const seeds = JSON.parse(JSON.stringify(SEED_PROJECTS_PT)) as Project[];
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
  const seed = { ...(JSON.parse(JSON.stringify(SEED_PROJECTS_PT[0])) as Project), updatedAt: 9_999_999_999_999 };
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

test('Storage: limites de tamanho (50 MB na nuvem, 2 MB só no aparelho)', () => {
  assert.doesNotThrow(() => assertFileSize(MAX_CLOUD_FILE_BYTES, true));
  assert.throws(() => assertFileSize(MAX_CLOUD_FILE_BYTES + 1, true), /limite é 50 MB/);
  assert.doesNotThrow(() => assertFileSize(MAX_LOCAL_FILE_BYTES, false));
  assert.throws(() => assertFileSize(MAX_LOCAL_FILE_BYTES + 1, false), /Faça login/);
  assert.doesNotThrow(() => assertFileSize(10 * 1024 * 1024, true), 'arquivo de 10 MB pode ir para a nuvem');
});

// --------------------------------------------------------------------------
// Idiomas (pt/en)
// --------------------------------------------------------------------------
function dictShape(node: unknown, prefix = ''): string[] {
  if (typeof node === 'function') return [`${prefix}()${node.length}`];
  if (node && typeof node === 'object') {
    return Object.keys(node).sort().flatMap((k) => dictShape((node as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

test('i18n: inglês e português têm as mesmas chaves e os mesmos parâmetros', () => {
  assert.deepStrictEqual(dictShape(en), dictShape(pt));
});

test('i18n: nenhum texto vazio e placeholders preenchidos nos dois idiomas', () => {
  for (const dict of [pt, en]) {
    const walk = (node: unknown, key: string) => {
      if (typeof node === 'string') assert(node.trim().length > 0, `texto vazio em ${key}`);
      else if (typeof node === 'function') {
        const out = (node as (...a: unknown[]) => unknown)(...Array.from({ length: node.length }, () => 7));
        if (typeof out === 'string') assert(!/\$\{|\{[a-z]+\}/.test(out), `placeholder sobrando em ${key}: ${out}`);
      } else if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) walk(v, `${key}.${k}`);
      }
    };
    walk(dict, 'dict');
  }
});

test('i18n: idioma do navegador escolhe pt ou en', () => {
  assert.strictEqual(detectLang(['pt-BR', 'en']), 'pt');
  assert.strictEqual(detectLang(['pt-PT']), 'pt');
  assert.strictEqual(detectLang(['en-US', 'pt-BR']), 'en');
  assert.strictEqual(detectLang(['es-ES']), 'en');
  assert.strictEqual(detectLang([]), 'en');
  assert.strictEqual(resolveLang('pt'), 'pt');
  assert.strictEqual(resolveLang('en'), 'en');
});

test('i18n: exemplos em inglês têm os mesmos ids e estrutura dos em português', () => {
  const ids = (list: Project[]) =>
    list.map((p) => [p.id, p.tasks.map((t) => [t.id, t.done, t.subtasks.map((s) => s.id)]), p.observations.map((o) => o.id), p.codeSnippets.map((c) => c.id)]);
  assert.deepStrictEqual(ids(SEED_PROJECTS_EN), ids(SEED_PROJECTS_PT));
  assert.strictEqual(getInitialProjects('en'), SEED_PROJECTS_EN);
  assert.strictEqual(getInitialProjects('pt'), SEED_PROJECTS_PT);
});

test('i18n: exemplos intocados são reconhecidos nos dois idiomas e trocam de idioma', () => {
  const ptSeeds = JSON.parse(JSON.stringify(SEED_PROJECTS_PT)) as Project[];
  const enSeeds = JSON.parse(JSON.stringify(SEED_PROJECTS_EN)) as Project[];
  assert(enSeeds.every(isPristineSeedProject), 'exemplos em inglês devem contar como intocados');
  const editado = { ...ptSeeds[1], title: 'Meu homelab' };
  const local = [ptSeeds[0], editado, ptSeeds[2]];
  const emIngles = localizeSeedProjects(local, 'en');
  assert.strictEqual(emIngles[0].title, SEED_PROJECTS_EN[0].title);
  assert.strictEqual(emIngles[0].updatedAt, ptSeeds[0].updatedAt, 'mantém as datas');
  assert.strictEqual(emIngles[1], editado, 'projeto editado não muda');
  assert.strictEqual(localizeSeedProjects(local, 'pt'), local, 'sem troca, devolve a mesma lista');
  assert.strictEqual(localizeSeedProjects(emIngles, 'pt')[0].title, SEED_PROJECTS_PT[0].title);
});

test('i18n: mensagens fora do React seguem o idioma atual', () => {
  setCurrentLang('en');
  assert.throws(() => assertFileSize(MAX_CLOUD_FILE_BYTES + 1, true), /limit is 50 MB/);
  assert.strictEqual(getT(), en);
  setCurrentLang('pt');
  assert.strictEqual(getT(), pt);
});

// --------------------------------------------------------------------------
// Autocomplete do prompt (Ctrl+K)
// --------------------------------------------------------------------------
const catalogPt = buildCommandCatalog({ t: pt, lang: 'pt', projects: SEED_PROJECTS_PT, accentTheme: 'matrix' });
const completions = (input: string) => suggestCommands(input, catalogPt).map((s) => s.completion);

test('Autocomplete: "lang" sugere primeiro o outro idioma', () => {
  assert.deepStrictEqual(completions('lang'), ['lang en', 'lang pt']);
  assert.deepStrictEqual(completions('lang e'), ['lang en']);
  const catalogEn = buildCommandCatalog({ t: en, lang: 'en', projects: [], accentTheme: 'matrix' });
  assert.strictEqual(suggestCommands('la', catalogEn)[0].completion, 'lang pt');
});

test('Autocomplete: completa comandos, projetos, temas e tags', () => {
  assert.strictEqual(completions('git s')[0], 'git status');
  assert.strictEqual(completions('git checkout infra')[0], 'git checkout Infra & Homelab: Cluster Local com Arch Linux');
  assert(completions('theme').includes('theme purple'));
  assert.notStrictEqual(completions('theme')[0], 'theme matrix', 'tema atual vai para o fim');
  assert.strictEqual(completions('#webs')[0], '#websocket');
  assert(suggestCommands('git init', catalogPt)[0].needsArg, '"git init " ainda pede um nome');
});

test('Autocomplete: nada a sugerir para comando completo, texto vazio ou espaço inicial', () => {
  assert.deepStrictEqual(completions('lang en'), []);
  assert.deepStrictEqual(completions(''), []);
  assert.deepStrictEqual(completions(' lang'), []);
  assert.deepStrictEqual(completions('xyz'), []);
  assert.strictEqual(suggestCommands('g', catalogPt).length <= 6, true);
});

test('Comando theme aceita id ou nome em qualquer idioma', () => {
  assert.strictEqual(resolveThemeName('purple'), 'purple');
  assert.strictEqual(resolveThemeName('Roxo'), 'purple');
  assert.strictEqual(resolveThemeName('verde-agua'), 'aqua');
  assert.strictEqual(resolveThemeName('Verde-água'), 'aqua');
  assert.strictEqual(resolveThemeName('deep blue'), 'blue');
  assert.strictEqual(resolveThemeName('ambar'), 'amber');
  assert.strictEqual(resolveThemeName('neon'), null);
});

// --------------------------------------------------------------------------
// Times: juntar edições de duas pessoas (merge de 3 vias)
// --------------------------------------------------------------------------
const teamBase = (): Project => ({
  id: 'tp', title: 'Lançamento', slug: 'lancamento', category: 'DEV', description: 'v1', status: 'active',
  createdAt: 1, updatedAt: 10, ownerId: 'ana', teamId: 'team', version: 3, updatedBy: 'ana',
  tasks: [
    { id: 't1', text: 'Escrever post', done: false, createdAt: 1, tags: ['blog'], subtasks: [
      { id: 's1', text: 'Rascunho', done: false, createdAt: 1 },
      { id: 's2', text: 'Revisão', done: false, createdAt: 2 },
    ] },
    { id: 't2', text: 'Gravar vídeo', done: false, createdAt: 2, subtasks: [] },
  ],
  observations: [{ id: 'o1', title: 'Nota', content: 'texto', updatedAt: 1 }],
  codeSnippets: [],
  attachments: [],
});
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

test('Times/merge: eu marco uma tarefa e a colega cria outra, as duas mudanças ficam', () => {
  const base = teamBase();
  const mine = clone(base); mine.tasks[0].done = true;
  const theirs = clone(base); theirs.version = 4; theirs.updatedBy = 'bia';
  theirs.tasks.unshift({ id: 't3', text: 'Criado pela Bia', done: false, createdAt: 3, subtasks: [] });
  const r = mergeProjectEdits(base, mine, theirs);
  assert.deepStrictEqual(r.tasks.map((t) => t.id), ['t3', 't1', 't2']);
  assert.strictEqual(r.tasks.find((t) => t.id === 't1')!.done, true);
  assert.strictEqual(r.version, 4, 'versão vem do servidor');
  assert.strictEqual(r.updatedBy, 'bia');
});

test('Times/merge: campos diferentes da mesma tarefa e subtarefas diferentes se juntam', () => {
  const base = teamBase();
  const mine = clone(base); mine.tasks[0].text = 'Escrever post (editado)'; mine.tasks[0].subtasks[0].done = true;
  const theirs = clone(base); theirs.tasks[0].priority = 'high'; theirs.tasks[0].subtasks[1].done = true;
  const t1 = mergeProjectEdits(base, mine, theirs).tasks[0];
  assert.strictEqual(t1.text, 'Escrever post (editado)');
  assert.strictEqual(t1.priority, 'high');
  assert.deepStrictEqual(t1.subtasks.map((s) => s.done), [true, true]);
});

test('Times/merge: mesmo campo editado pelas duas, vale o meu (último a salvar)', () => {
  const base = teamBase();
  const mine = clone(base); mine.title = 'Meu título';
  const theirs = clone(base); theirs.title = 'Título da Bia'; theirs.description = 'v2 da Bia';
  const r = mergeProjectEdits(base, mine, theirs);
  assert.strictEqual(r.title, 'Meu título');
  assert.strictEqual(r.description, 'v2 da Bia', 'campo que só ela mudou fica');
});

test('Times/merge: exclusões', () => {
  const base = teamBase();
  // Eu apago t2, a colega não mexeu nela: some.
  let mine = clone(base); mine.tasks = mine.tasks.filter((t) => t.id !== 't2');
  let theirs = clone(base);
  assert.deepStrictEqual(mergeProjectEdits(base, mine, theirs).tasks.map((t) => t.id), ['t1']);
  // Ela apaga t2 e eu não mexi: some.
  mine = clone(base); theirs = clone(base); theirs.tasks = theirs.tasks.filter((t) => t.id !== 't2');
  assert.deepStrictEqual(mergeProjectEdits(base, mine, theirs).tasks.map((t) => t.id), ['t1']);
  // Eu apago t2 mas ela editou: o trabalho dela fica.
  mine = clone(base); mine.tasks = mine.tasks.filter((t) => t.id !== 't2');
  theirs = clone(base); theirs.tasks[1].done = true;
  assert.deepStrictEqual(mergeProjectEdits(base, mine, theirs).tasks.map((t) => t.id), ['t1', 't2']);
  // Ela apaga t1 mas eu editei: meu trabalho fica.
  mine = clone(base); mine.tasks[0].done = true;
  theirs = clone(base); theirs.tasks = theirs.tasks.filter((t) => t.id !== 't1');
  const r = mergeProjectEdits(base, mine, theirs);
  assert(r.tasks.some((t) => t.id === 't1' && t.done));
});

test('Times/merge: itens novos dos dois lados e posição dos meus', () => {
  const base = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const mine = [{ id: 'a' }, { id: 'x' }, { id: 'b' }, { id: 'c' }];
  const theirs = [{ id: 'y' }, { id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepStrictEqual(mergeList(base, mine, theirs).map((i) => i.id), ['y', 'a', 'x', 'b', 'c']);
  // Sem edições de nenhum lado, nada muda.
  const p = teamBase();
  assert.deepStrictEqual(mergeProjectEdits(p, clone(p), clone(p)), p);
});

test('Times/merge: notas, tags e anexos', () => {
  const base = teamBase();
  const mine = clone(base); mine.observations.push({ id: 'o2', title: 'Minha nota', content: '', updatedAt: 2 });
  mine.tasks[0].tags = ['blog', 'urgente'];
  const theirs = clone(base); theirs.observations[0].content = 'texto revisado';
  theirs.attachments = [{ id: 'f1', name: 'capa.png', type: 'image', mimeType: 'image/png', size: 1, url: 'x', createdAt: 1 }];
  const r = mergeProjectEdits(base, mine, theirs);
  assert.deepStrictEqual(r.observations.map((o) => o.id), ['o1', 'o2']);
  assert.strictEqual(r.observations[0].content, 'texto revisado');
  assert.deepStrictEqual(r.tasks[0].tags, ['blog', 'urgente']);
  assert.strictEqual(r.attachments!.length, 1);
});

console.log(`\n========================================`);
console.log(`RESULTADO: ${passedTests}/${totalTests} testes passaram com sucesso! 🚀`);
console.log(`========================================\n`);
