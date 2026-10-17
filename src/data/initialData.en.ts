import { Project } from '../types';

// Projetos de exemplo em inglês. Mesmos ids e estrutura da versão em português (initialData.ts),
// para a detecção de "exemplo nunca editado" funcionar nos dois idiomas.
export const SEED_PROJECTS_EN: Project[] = [
  {
    id: 'proj-nebu-relay',
    title: 'Nebuchadnezzar: Telemetry & Log Relay',
    slug: 'nebuchadnezzar-relay',
    category: 'CORE DEV',
    description: 'Low-latency WebSocket service in Node/TypeScript that ingests events and telemetry from microservices.',
    status: 'in_progress',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
    tasks: [
      {
        id: 'task-1',
        text: 'Implement the WebSocket handshake and connection protocol',
        done: true,
        priority: 'high',
        tags: ['websocket', 'protocol', 'network'],
        notes: 'Protocol validated with binary framing and a 15s heartbeat.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
        subtasks: [
          { id: 'sub-1', text: 'Validate the bearer auth token passed as a query parameter', done: true, createdAt: 1 },
          { id: 'sub-2', text: 'Ping/pong every 15 seconds to avoid timeouts', done: true, createdAt: 2 },
          { id: 'sub-3', text: 'Keep a pool of active connections with one UUID per node', done: true, createdAt: 3 },
        ],
      },
      {
        id: 'task-2',
        text: 'Build an in-memory queue on a circular (ring) buffer',
        done: false,
        priority: 'high',
        tags: ['memory', 'perf', 'backend'],
        notes: 'Avoid heavy garbage collector allocations during 10k req/s peaks.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
        subtasks: [
          { id: 'sub-4', text: 'Fix the buffer size up front (65536 slots)', done: true, createdAt: 4 },
          { id: 'sub-5', text: 'Implement atomic read and write pointers', done: false, createdAt: 5 },
          { id: 'sub-6', text: 'Handle backpressure when the consumer falls behind', done: false, createdAt: 6 },
        ],
      },
      {
        id: 'task-3',
        text: 'Build a terminal log viewer with ANSI filters',
        done: false,
        priority: 'med',
        tags: ['cli', 'logs', 'ui'],
        notes: 'Node CLI using blessed or ink for local monitoring.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
        subtasks: [
          { id: 'sub-7', text: 'Filter by log level (ERROR, WARN, INFO, TRACE)', done: false, createdAt: 7 },
          { id: 'sub-8', text: 'Live regex search over the stream', done: false, createdAt: 8 },
        ],
      },
      {
        id: 'task-4',
        text: 'Write a stress test suite with autocannon',
        done: false,
        priority: 'low',
        tags: ['test', 'benchmark', 'qa'],
        notes: 'Keep p99 under 8ms with distributed load.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24,
        subtasks: [],
      },
    ],
    observations: [
      {
        id: 'obs-1',
        title: 'Architecture decision: WebSocket vs gRPC streaming',
        content: `We compared gRPC streaming with plain WebSockets. For this fast-ingest component fed by web agents and terminals, standard WebSocket with UTF-8 or CBOR encoding turned out 40% simpler to debug with tools we already use, like curl and websocat.

Guidelines:
- Don't open persistent connections from short-lived clients.
- Keep each message payload under 32KB to avoid fragmentation in the TCP frame.
- If the queue hits 90% capacity, drop TRACE/DEBUG logs first.`,
        tag: 'ARCHITECTURE',
        updatedAt: Date.now() - 1000 * 60 * 60 * 5,
      },
      {
        id: 'obs-2',
        title: 'Early throughput benchmarks',
        content: `First run on a local machine (8 cores, 16GB RAM):
- Sustained rate: ~42,000 messages/second
- Average latency: 1.2ms
- Memory: steady at 85MB with the preallocated ring buffer.

Next step: test in a Docker container capped at 1 core and 256MB.`,
        tag: 'PERFORMANCE',
        updatedAt: Date.now() - 1000 * 60 * 60 * 18,
      },
    ],
    codeSnippets: [
      {
        id: 'snip-1',
        title: 'server-relay.ts (socket skeleton)',
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
  console.log(\`[OPERATOR] Connection established from \${ip}\`);

  ws.on('message', (data: Buffer) => {
    try {
      const frame: TelemetryFrame = JSON.parse(data.toString());
      // Push onto the high-priority ring buffer
    } catch (err) {
      ws.send(JSON.stringify({ error: 'INVALID_FRAME_FORMAT' }));
    }
  });

  ws.on('close', () => {
    console.log(\`[OPERATOR] Connection closed: \${ip}\`);
  });
});`,
        updatedAt: Date.now() - 1000 * 60 * 60 * 12,
      },
    ],
  },
  {
    id: 'proj-homelab',
    title: 'Infra & Homelab: Local Arch Linux Cluster',
    slug: 'homelab-arch-cluster',
    category: 'INFRASTRUCTURE',
    description: 'Home server setup for automations, a protected local DNS and automated backups with rsync/btrfs.',
    status: 'active',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
    tasks: [
      {
        id: 'task-hl-1',
        text: 'Set up a local recursive DNS server with Pi-hole or AdGuard Home',
        done: true,
        priority: 'high',
        tags: ['dns', 'docker', 'infra'],
        notes: 'Blocks unwanted telemetry and resolves *.lab.local domains.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
        subtasks: [
          { id: 'sub-hl-1', text: 'Set a static IP on the ethernet interface (192.168.1.200)', done: true, createdAt: 1 },
          { id: 'sub-hl-2', text: 'Run the Docker container with restart: unless-stopped', done: true, createdAt: 2 },
          { id: 'sub-hl-3', text: 'Point upstream to Cloudflare DNS over HTTPS', done: true, createdAt: 3 },
        ],
      },
      {
        id: 'task-hl-2',
        text: 'Set up a secure WireGuard tunnel with split-tunnel routing',
        done: false,
        priority: 'high',
        tags: ['vpn', 'security', 'network'],
        notes: 'Remote access to services without opening ports on the router.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
        subtasks: [
          { id: 'sub-hl-4', text: 'Generate public and private keys on the server and the phone', done: true, createdAt: 4 },
          { id: 'sub-hl-5', text: 'Add iptables/nftables NAT rules', done: false, createdAt: 5 },
          { id: 'sub-hl-6', text: 'Test an external connection over a cellular network', done: false, createdAt: 6 },
        ],
      },
      {
        id: 'task-hl-3',
        text: 'Automate periodic system snapshots with snapper and Btrfs',
        done: false,
        priority: 'med',
        tags: ['linux', 'backup', 'storage'],
        notes: 'Snapshot before every pacman upgrade.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
        subtasks: [
          { id: 'sub-hl-7', text: 'Add a pacman hook for pre- and post-transaction snapshots', done: false, createdAt: 7 },
          { id: 'sub-hl-8', text: 'Keep hourly snapshots for 7 days at most', done: false, createdAt: 8 },
        ],
      },
    ],
    observations: [
      {
        id: 'obs-hl-1',
        title: 'Port map and static IPs on the local network',
        content: `Services running on the cluster:
- 192.168.1.200:53 -> Local DNS (Pi-hole)
- 192.168.1.200:8080 -> Telemetry dashboard
- 192.168.1.200:9000 -> Portainer CE
- 192.168.1.200:51820/udp -> WireGuard VPN

Important:
Never raise the MTU of the wg0 interface above 1420, or mobile connections behind CGNAT start dropping packets.`,
        tag: 'NETWORK',
        updatedAt: Date.now() - 1000 * 60 * 60 * 36,
      },
    ],
    codeSnippets: [
      {
        id: 'snip-hl-1',
        title: 'docker-compose.yml (core services)',
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
      TZ: 'America/New_York'
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
    title: 'Study: Distributed Consensus & the Raft Algorithm',
    slug: 'study-raft-algorithm',
    category: 'STUDY',
    description: 'Concept notes and a step-by-step teaching implementation of a 3-node Raft cluster.',
    status: 'in_progress',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
    updatedAt: Date.now() - 1000 * 60 * 60 * 72,
    tasks: [
      {
        id: 'task-raft-1',
        text: 'Read and take notes on the original paper: "In Search of an Understandable Consensus Algorithm"',
        done: true,
        priority: 'high',
        tags: ['research', 'theory', 'paper'],
        notes: 'Paper by Diego Ongaro and John Ousterhout (Stanford).',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
        subtasks: [
          { id: 'sub-r-1', text: 'Notes on section 5: the Raft algorithm in detail', done: true, createdAt: 1 },
          { id: 'sub-r-2', text: 'Understand leader election and randomized timeouts', done: true, createdAt: 2 },
          { id: 'sub-r-3', text: 'Map the safety properties (Election Safety & Leader Append-Only)', done: true, createdAt: 3 },
        ],
      },
      {
        id: 'task-raft-2',
        text: 'Implement the finite state machine for the 3 roles (Follower, Candidate, Leader)',
        done: false,
        priority: 'high',
        tags: ['algorithm', 'state-machine', 'dev'],
        notes: 'Plain TypeScript, no external dependencies.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
        subtasks: [
          { id: 'sub-r-4', text: 'Add a random timer between 150ms and 300ms', done: false, createdAt: 4 },
          { id: 'sub-r-5', text: 'Send the RequestVote RPC to every peer', done: false, createdAt: 5 },
          { id: 'sub-r-6', text: 'Collect a vote quorum (simple majority: n/2 + 1)', done: false, createdAt: 6 },
        ],
      },
      {
        id: 'task-raft-3',
        text: 'Simulate network partitions with isolated nodes',
        done: false,
        priority: 'med',
        tags: ['simulation', 'network'],
        notes: 'Check that an isolated node cannot commit entries without a quorum.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
        subtasks: [],
      },
    ],
    observations: [
      {
        id: 'obs-raft-1',
        title: 'Key idea: randomized elections',
        content: `What makes Raft easier to understand than Paxos is its use of random timeouts to avoid split votes.

When a Follower stops receiving heartbeats, it:
1. Increments its local currentTerm.
2. Moves to the CANDIDATE state.
3. Votes for itself.
4. Sends RequestVote to the other nodes in parallel.

If two nodes become candidates at almost the same time, the timeout spread (e.g. node A at 165ms, node B at 280ms) means one of them nearly always starts the election and wins a majority before the other collides with it.`,
        tag: 'THEORY',
        updatedAt: Date.now() - 1000 * 60 * 60 * 70,
      },
    ],
    codeSnippets: [
      {
        id: 'snip-raft-1',
        title: 'raft-node.ts (RPC types)',
        language: 'typescript',
        code: `type NodeRole = 'FOLLOWER' | 'CANDIDATE' | 'LEADER';

interface RequestVoteArgs {
  term: number;         // Candidate's current term
  candidateId: string;  // Id of the node asking for the vote
  lastLogIndex: number; // Index of the last log entry
  lastLogTerm: number;  // Term of the last log entry
}

interface RequestVoteReply {
  term: number;         // currentTerm, so the candidate can update itself
  voteGranted: boolean; // true if the vote was granted
}`,
        updatedAt: Date.now() - 1000 * 60 * 60 * 72,
      },
    ],
  },
];
