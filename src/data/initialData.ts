import { Project, WorkspaceSettings } from '../types';

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  rainEnabled: true,
  rainOpacity: 0.08,
  scanlines: true,
  soundEnabled: true,
  glowEffect: true,
};

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-nebu-relay',
    title: 'Nebuchadnezzar: Relay de Telemetria e Logs',
    slug: 'nebuchadnezzar-relay',
    category: 'CORE DEV',
    description: 'Serviço websocket de baixa latência em Node/TypeScript para ingestão de eventos e telemetria de microsserviços.',
    status: 'in_progress',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
    tasks: [
      {
        id: 'task-1',
        text: 'Implementar handshake e protocolo de conexão WebSocket',
        done: true,
        priority: 'high',
        tags: ['websocket', 'protocol', 'network'],
        notes: 'Protocolo validado com framing binário e heartbeat de 15s.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
        subtasks: [
          { id: 'sub-1', text: 'Validar token de autorização via bearer no query parameter', done: true, createdAt: 1 },
          { id: 'sub-2', text: 'Estabelecer ping/pong a cada 15 segundos para evitar timeouts', done: true, createdAt: 2 },
          { id: 'sub-3', text: 'Criar pool de conexões ativas com UUID por nó', done: true, createdAt: 3 },
        ],
      },
      {
        id: 'task-2',
        text: 'Estruturar fila interna em memória com buffer circular (ring buffer)',
        done: false,
        priority: 'high',
        tags: ['memory', 'perf', 'backend'],
        notes: 'Evitar alocações excessivas de garbage collector durante picos de 10k req/s.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
        subtasks: [
          { id: 'sub-4', text: 'Definir tamanho estático do buffer (capacidade 65536 slots)', done: true, createdAt: 4 },
          { id: 'sub-5', text: 'Implementar ponteiros de leitura e escrita atômicos', done: false, createdAt: 5 },
          { id: 'sub-6', text: 'Tratar estratégia de backpressure quando o consumidor estiver lento', done: false, createdAt: 6 },
        ],
      },
      {
        id: 'task-3',
        text: 'Criar visualizador de logs em terminal com filtros ANSI',
        done: false,
        priority: 'med',
        tags: ['cli', 'logs', 'ui'],
        notes: 'CLI em Node usando blessed ou ink para monitoramento local.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
        subtasks: [
          { id: 'sub-7', text: 'Adicionar filtro por nível de log (ERROR, WARN, INFO, TRACE)', done: false, createdAt: 7 },
          { id: 'sub-8', text: 'Suporte a busca regex em tempo real no stream', done: false, createdAt: 8 },
        ],
      },
      {
        id: 'task-4',
        text: 'Escrever suíte de testes de estresse com autocannon',
        done: false,
        priority: 'low',
        tags: ['test', 'benchmark', 'qa'],
        notes: 'Garantir p99 < 8ms com carga distribuída.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24,
        subtasks: [],
      },
    ],
    observations: [
      {
        id: 'obs-1',
        title: 'Decisão de Arquitetura: WebSocket vs gRPC Streaming',
        content: `Avaliamos gRPC streaming vs WebSockets nativos. Para este componente de ingestão rápida de agentes web e terminais, WebSocket padrão com codificação UTF-8 ou CBOR se mostrou 40% mais simples de depurar com ferramentas existentes como curl e websocat.

Principais diretrizes:
- Não abrir conexões persistentes desnecessárias em clientes efêmeros.
- Manter payload máximo em 32KB por mensagem para evitar fragmentação no frame TCP.
- Se a fila atingir 90% da capacidade, descartar logs de nível TRACE/DEBUG primeiro.`,
        tag: 'ARQUITETURA',
        updatedAt: Date.now() - 1000 * 60 * 60 * 5,
      },
      {
        id: 'obs-2',
        title: 'Benchmarks Preliminares de Throughput',
        content: `Primeiro teste em máquina local (8 cores, 16GB RAM):
- Taxa sustentada: ~42.000 mensagens/segundo
- Latência média: 1.2ms
- Consumo de memória: estabilizado em 85MB com o ring buffer pré-alocado.

Próximo passo: testar em container Docker com limite rígido de 1 core e 256MB.`,
        tag: 'PERFORMANCE',
        updatedAt: Date.now() - 1000 * 60 * 60 * 18,
      },
    ],
    codeSnippets: [
      {
        id: 'snip-1',
        title: 'server-relay.ts (Estrutura básica do socket)',
        language: 'typescript',
        code: `import { WebSocketServer, WebSocket } from 'ws';

interface TelemetryFrame {
  nodeId: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  payload: Record<string, unknown>;
}

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws: WebSocket, req) => {
  const ip = req.socket.remoteAddress;
  console.log(\`[OPERATOR] Conexao estabelecida de \${ip}\`);

  ws.on('message', (data: Buffer) => {
    try {
      const frame: TelemetryFrame = JSON.parse(data.toString());
      // Enfileirar no ring buffer de alta prioridade
    } catch (err) {
      ws.send(JSON.stringify({ error: 'INVALID_FRAME_FORMAT' }));
    }
  });

  ws.on('close', () => {
    console.log(\`[OPERATOR] Conexao finalizada: \${ip}\`);
  });
});`,
        updatedAt: Date.now() - 1000 * 60 * 60 * 12,
      },
    ],
  },
  {
    id: 'proj-homelab',
    title: 'Infra & Homelab: Cluster Local com Arch Linux',
    slug: 'homelab-arch-cluster',
    category: 'INFRAESTRUTURA',
    description: 'Organização do servidor doméstico para automações, DNS local protegido e backups automatizados via rsync/btrfs.',
    status: 'active',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
    tasks: [
      {
        id: 'task-hl-1',
        text: 'Configurar servidor DNS recursivo local com Pi-hole ou AdGuard Home',
        done: true,
        priority: 'high',
        tags: ['dns', 'docker', 'infra'],
        notes: 'Bloqueio de telemetria indesejada e resolução de domínios *.lab.local.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
        subtasks: [
          { id: 'sub-hl-1', text: 'Configurar IP estático na interface ethernet (192.168.1.200)', done: true, createdAt: 1 },
          { id: 'sub-hl-2', text: 'Subir container Docker com restart: unless-stopped', done: true, createdAt: 2 },
          { id: 'sub-hl-3', text: 'Definir regras upstream para Cloudflare DNS over HTTPS', done: true, createdAt: 3 },
        ],
      },
      {
        id: 'task-hl-2',
        text: 'Configurar túnel seguro WireGuard com roteamento split-tunnel',
        done: false,
        priority: 'high',
        tags: ['vpn', 'security', 'network'],
        notes: 'Acesso remoto aos serviços sem expor portas no roteador.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
        subtasks: [
          { id: 'sub-hl-4', text: 'Gerar chaves públicas e privadas no servidor e cliente móvel', done: true, createdAt: 4 },
          { id: 'sub-hl-5', text: 'Configurar regras no iptables/nftables para NAT', done: false, createdAt: 5 },
          { id: 'sub-hl-6', text: 'Testar conexão externa simulando rede celular', done: false, createdAt: 6 },
        ],
      },
      {
        id: 'task-hl-3',
        text: 'Automatizar snapshots periódicos do sistema com snapper e Btrfs',
        done: false,
        priority: 'med',
        tags: ['linux', 'backup', 'storage'],
        notes: 'Snapshot antes de qualquer atualização com pacman.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
        subtasks: [
          { id: 'sub-hl-7', text: 'Configurar hook no pacman para snapshot pré e pós-transação', done: false, createdAt: 7 },
          { id: 'sub-hl-8', text: 'Definir retenção de no máximo 7 dias para snapshots horários', done: false, createdAt: 8 },
        ],
      },
    ],
    observations: [
      {
        id: 'obs-hl-1',
        title: 'Mapeamento de Portas e IPs Estáticos da Rede Local',
        content: `Lista de serviços ativos no cluster:
- 192.168.1.200:53 -> DNS Local (Pi-hole)
- 192.168.1.200:8080 -> Dashboard de Telemetria
- 192.168.1.200:9000 -> Portainer CE
- 192.168.1.200:51820/udp -> WireGuard VPN

Observação importante:
Nunca alterar o MTU da interface wg0 para mais de 1420 para evitar perda de pacotes em conexões móveis com CGNAT.`,
        tag: 'REDE',
        updatedAt: Date.now() - 1000 * 60 * 60 * 36,
      },
    ],
    codeSnippets: [
      {
        id: 'snip-hl-1',
        title: 'docker-compose.yml (Serviços Essenciais)',
        language: 'yaml',
        code: `version: '3.8'

services:
  pihole:
    container_name: pihole
    image: pihole/pihole:latest
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "8085:80/tcp"
    environment:
      TZ: 'America/Sao_Paulo'
      WEBPASSWORD: 'matrix_secret_access'
    volumes:
      - './etc-pihole:/etc/pihole'
      - './etc-dnsmasq.d:/etc/dnsmasq.d'
    restart: unless-stopped`,
        updatedAt: Date.now() - 1000 * 60 * 60 * 40,
      },
    ],
  },
  {
    id: 'proj-study-raft',
    title: 'Estudo: Consenso Distribuído & Algoritmo Raft',
    slug: 'estudo-algoritmo-raft',
    category: 'ESTUDOS',
    description: 'Anotações conceituais e implementação didática passo-a-passo de um cluster Raft de 3 nós.',
    status: 'in_progress',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
    updatedAt: Date.now() - 1000 * 60 * 60 * 72,
    tasks: [
      {
        id: 'task-raft-1',
        text: 'Ler e fichar o paper original: "In Search of an Understandable Consensus Algorithm"',
        done: true,
        priority: 'high',
        tags: ['research', 'theory', 'paper'],
        notes: 'Paper de Diego Ongaro e John Ousterhout (Stanford).',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
        subtasks: [
          { id: 'sub-r-1', text: 'Fichar seção 5: Detalhes do algoritmo Raft', done: true, createdAt: 1 },
          { id: 'sub-r-2', text: 'Entender a regra de eleição de líder e timeouts randomizados', done: true, createdAt: 2 },
          { id: 'sub-r-3', text: 'Mapear condições de segurança (Election Safety & Leader Append-Only)', done: true, createdAt: 3 },
        ],
      },
      {
        id: 'task-raft-2',
        text: 'Implementar máquina de estados finita dos 3 papéis (Follower, Candidate, Leader)',
        done: false,
        priority: 'high',
        tags: ['algorithm', 'state-machine', 'dev'],
        notes: 'Implementar em TypeScript puro sem dependências externas.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
        subtasks: [
          { id: 'sub-r-4', text: 'Adicionar temporizador aleatório entre 150ms e 300ms', done: false, createdAt: 4 },
          { id: 'sub-r-5', text: 'Enviar RPC RequestVote para todos os nós vizinhos', done: false, createdAt: 5 },
          { id: 'sub-r-6', text: 'Coletar quorum de votos (maioria simples: n/2 + 1)', done: false, createdAt: 6 },
        ],
      },
      {
        id: 'task-raft-3',
        text: 'Simular partições de rede com nós isolados',
        done: false,
        priority: 'med',
        tags: ['simulation', 'network'],
        notes: 'Verificar se o nó isolado não consegue comitar entradas na ausência de quórum.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
        subtasks: [],
      },
    ],
    observations: [
      {
        id: 'obs-raft-1',
        title: 'Princípio Chave: Randomização de Eleição',
        content: `O grande diferencial de facilidade de compreensão do Raft em relação ao Paxos é o uso de timeouts aleatórios para evitar votos divididos (split vote).

Quando um Follower não recebe heartbeat:
1. Incrementa seu currentTerm local.
2. Transiciona para o estado CANDIDATE.
3. Vota em si mesmo.
4. Dispara RequestVote em paralelo para os outros nós.

Se dois nós virarem candidatos quase ao mesmo tempo, a variação de timeout (ex: nó A com 165ms e nó B com 280ms) garante que um deles quase sempre iniciará a eleição e obterá a maioria antes que o outro cause colisão.`,
        tag: 'TEORIA',
        updatedAt: Date.now() - 1000 * 60 * 60 * 70,
      },
    ],
    codeSnippets: [
      {
        id: 'snip-raft-1',
        title: 'raft-node.ts (Tipos de RPC)',
        language: 'typescript',
        code: `type NodeRole = 'FOLLOWER' | 'CANDIDATE' | 'LEADER';

interface RequestVoteArgs {
  term: number;         // Termo atual do candidato
  candidateId: string;  // Identificador do nó solicitando voto
  lastLogIndex: number; // Índice da última entrada no log
  lastLogTerm: number;  // Termo da última entrada no log
}

interface RequestVoteReply {
  term: number;         // currentTerm para o candidato se atualizar
  voteGranted: boolean; // true se o voto foi concedido
}`,
        updatedAt: Date.now() - 1000 * 60 * 60 * 72,
      },
    ],
  },
];
