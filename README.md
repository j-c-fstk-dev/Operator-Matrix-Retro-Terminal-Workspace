# OPERATOR // MATRIX RETRO TERMINAL WORKSPACE

> **Ambiente de produtividade e gerenciador de projetos pessoais com estética de terminal retrô Cyberpunk/Matrix (verde fósforo #22c55e), navegação 100% orientada a teclado (Vim/Linux), Quick-Find global, persistência local-first e suporte completo a backup e migração entre dispositivos via JSON.**

---

## ⚡ Visão Geral

O **Operator** é um espaço de trabalho pessoal criado sob medida para desenvolvedores, engenheiros de infraestrutura e entusiastas do ecossistema Linux/Unix que preferem uma interface rápida, limpa, sem distrações e com foco extremo em execução.

Inspirado no visual clássico dos monitores monocromáticos CRT e terminais dos anos 90, o sistema opera em modo **Local-First**: todos os seus projetos, tarefas com `#tags`, notas de arquitetura e trechos de código ficam salvos de forma privada no `localStorage` do seu navegador, sem necessidade de contas, servidores externos ou dependência de internet.

---

## 🚀 Principais Funcionalidades

### 1. 🟢 Estética Monocromática Matrix & Terminal CRT
- **Chuva Digital (Matrix Rain)** em segundo plano renderizada em Canvas de alta performance com controle de opacidade e toggle instantâneo.
- **Filtro de Scanlines CRT** simulando a textura de monitores fósforo verde vintage.
- **Sintetizador de Áudio Terminal**: beeps e cliques mecânicos sintetizados em tempo real via **Web Audio API** (sem carregar arquivos de áudio externos).
- **Fontes Monospaced & Cursores Piscantes** para reproduzir a sensação autêntica de um terminal Unix.

### 2. 📁 Gestão Completa de Projetos & Tarefas
- **Hierarquia de Tarefas & Subtarefas**: adicione tarefas com checklist encadeado, notas técnicas e níveis de prioridade (`CRIT`, `MED`, `LOW`).
- **Sistema de `#tags` Coloridas Determinísticas**: tags como `#api`, `#docker`, `#security`, `#infra` e `#db` recebem automaticamente paletas de cores de terminal baseadas em hash sem repetição.
- **Filtros Rápidos**: visualize tarefas por status (*Todas*, *Pendentes*, *Concluídas*) ou clique em qualquer tag para filtrar em tempo real.
- **Notas Técnicas & Snippets de Código**: armazene observações de arquitetura e comandos de terminal/código com cópia rápida para o clipboard em 1 clique.

### 3. ⌨️ Navegação Rápida Orientada a Teclado (Vim & Linux)
Opere o sistema sem tirar as mãos do teclado:

| Tecla / Atalho | Ação no Sistema | Analogia Linux / Git |
| :--- | :--- | :--- |
| **`?`** ou **`F1`** | Abre o **Manual do Sistema (`MAN OPERATOR`)** | `man operator` / `:help` |
| **`T`** | Foca no campo de **Nova Tarefa** imediatamente | `touch task.md` |
| **`J` / `K`** (ou setas) | Navega entre as tarefas na lista | Vim cursor `j`/`k` |
| **`X`** ou **`Espaço`** | Marca / desmarca a tarefa selecionada | `git commit -m "done"` |
| **`Delete`** | Remove a tarefa selecionada | `git rm` |
| **`1, 2, 3, 4`** | Alterna entre as abas (*Geral*, *Tarefas*, *Notas*, *Snippets*) | Workspaces do i3 / tmux |
| **`N`** | Cria um novo projeto | `git init <proj>` |
| **`M`** | Exporta o projeto ativo como **Markdown** formatado | `git log > README.md` |
| **`Ctrl + S`** | Força validação e sincronização do cache local | `git push / sync` |
| **`Ctrl + K`** | Abre o **Prompt de Comandos CLI & Quick-Find** | Terminal / Shell |
| **`B`** | Liga / desliga a Chuva Digital (Matrix Rain) | Background toggle |
| **`S`** | Liga / muta o feedback sonoro do terminal | Audio bell toggle |
| **`Esc`** | Fecha modais ou sai de campos de texto | Vim `<Esc>` / `:q` |

### 4. 🔍 Quick-Find no Prompt de Comandos (`Cmd+K` / `Ctrl+K`)
- **Busca Simultânea**: pesquise instantaneamente em todos os títulos de tarefas, `#tags`, subtarefas e nomes de projetos em um só lugar.
- **Salto Direto com Auto-Scroll**: ao selecionar uma tarefa nos resultados da busca (via clique ou `Enter`), o workspace pula diretamente para o projeto pai, rola até a tarefa e a destaca com efeito fosforescente.
- **Comandos Executáveis no Prompt**:
  - `git checkout <nome>`: troca diretamente para o projeto informado.
  - `git init <nome>`: cria um projeto já com o título informado.
  - `git commit` ou `export`: copia o projeto em Markdown para o clipboard.
  - `git status`: exibe o resumo de tarefas concluídas e pendentes.
  - `+ <tarefa> #tag`: cadastra uma nova tarefa rápida com tags.
  - `man` ou `help`: abre o manual.

### 5. 💾 Central de Backup & Migração (.JSON)
- **Download em 1 Clique**: baixe um arquivo estruturado contendo todos os seus projetos, tarefas, tags e anotações (ex: `operator_backup_2026-10-05.json`).
- **Restauração em Outro Dispositivo**:
  - Abra a aplicação em qualquer outro computador ou celular (ex: após subir no Netlify).
  - Faça upload do arquivo `.json` escolhendo **Substituir Tudo** ou **Mesclar com Atuais**.
  - Gravação síncrona imediata no `localStorage`.
- **Transferência via Texto (Clipboard)**: copie todo o JSON como texto para colar em conversas ou enviar por e-mail sem precisar manipular arquivos.

### 6. 📄 Exportação Completa para Markdown
- Com um clique no botão **`Exportar MD`** (ou tecle `M`), todo o escopo do projeto ativo é compilado em formato Markdown limpo e copiado para sua área de transferência, pronto para virar um `README.md` ou documentação no GitHub.

---

## 🛠️ Stack Tecnológica

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite](https://vite.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Áudio**: Web Audio API com sintetizador oscilador customizado (sem assets externos)
- **Animações Canvas**: HTML5 Canvas para a chuva digital Matrix
- **Testes Automatizados**: Node.js assert nativo + tsx runner

---

## 📦 Como Instalar e Rodar Localmente

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm ou pnpm

### 1. Clonar ou baixar o repositório
```bash
git clone <url-do-repositorio>
cd operator-matrix-workspace
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
O aplicativo estará disponível em: `http://localhost:3000`

### 4. Executar os testes automatizados
```bash
npm test
```

### 5. Compilar para produção
```bash
npm run build
```
Os arquivos prontos para deploy estático serão gerados no diretório `/dist`.

---

## 🌐 Deploy em Produção (Netlify, Vercel ou GitHub Pages)

Como o Operator é uma aplicação **SPA estática (Single Page Application)**, o deploy pode ser feito de forma gratuita em qualquer serviço de hospedagem estática:

### No Netlify:
1. Conecte o repositório Git ou arraste a pasta `dist` gerada pelo comando `npm run build`.
2. Configure as opções de Build:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
3. Se estiver usando o Supabase, adicione as variáveis em **Site configuration > Environment variables**:
   - `VITE_SUPABASE_URL`: sua URL do projeto Supabase
   - `VITE_SUPABASE_ANON_KEY`: sua chave pública `anon` do Supabase

---

## 🗄️ Configuração do Supabase (Autenticação & Banco de Dados na Nuvem)

O aplicativo conta com suporte nativo e opcional ao [Supabase](https://supabase.com). Se as variáveis não estiverem configuradas, o app continuará funcionando perfeitamente em modo 100% Local (offline).

### Passo a Passo para Ativar o Supabase:

1. **Crie um projeto gratuito no [Supabase](https://supabase.com)**.
2. Acesse **Project Settings > API** e copie:
   - `Project URL`
   - `anon public key`
3. Abra o **SQL Editor** no painel do Supabase, cole o conteúdo do arquivo `supabase/schema.sql` deste repositório e clique em **RUN**. Ele criará a tabela `projects` com **Row Level Security (RLS)** ativado para garantir que cada usuário só acerte os próprios projetos.
4. Adicione as variáveis no seu `.env` local ou no painel do Netlify:
   ```env
   VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
   VITE_SUPABASE_ANON_KEY="sua-chave-anon"
   ```
5. Pronto! Agora você pode clicar em `[ENTRAR]` no app, criar uma conta e seus projetos serão sincronizados na nuvem em tempo real!

---

## 📁 Estrutura do Código

```
├── supabase/
│   └── schema.sql             # Script SQL para criação de tabelas e RLS no Supabase
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx          # Controle de acesso e autenticação Supabase
│   │   ├── BackupModal.tsx        # Central de backup, download e upload JSON
│   │   ├── CommandPalette.tsx     # Prompt de comandos CLI (Ctrl+K) & Quick-Find
│   │   ├── ManualModal.tsx        # Manual completo de atalhos e comandos Unix (man)
│   │   ├── MatrixRainCanvas.tsx   # Canvas de chuva digital Matrix em segundo plano
│   │   ├── ProjectWorkspace.tsx   # Painel principal do projeto com tarefas e abas
│   │   ├── SettingsModal.tsx      # Modal de preferências de áudio, scanlines e reset
│   │   └── Sidebar.tsx            # Barra lateral retrô com projetos e controles
│   ├── lib/
│   │   └── supabase.ts            # Cliente seguro e tipado do Supabase
│   ├── services/
│   │   └── supabaseService.ts     # Serviço de sincronização e mapeamento do banco
│   ├── data/
│   │   └── initialData.ts         # Dados de exemplo pré-carregados
│   ├── utils/
│   │   ├── audio.ts               # Sintetizador Web Audio para feedback sonoro
│   │   └── tagColors.ts           # Gerador determinístico de cores de terminal para #tags
│   ├── types.ts                   # Definições de tipos TypeScript
│   ├── App.tsx                    # Componente raiz, gerenciamento de estado e eventos globais
│   └── main.tsx                   # Ponto de entrada da aplicação
├── tests/
│   └── suite.test.ts              # Suíte de testes automatizados (unitários e integração)
├── index.html                     # Entrypoint HTML com meta tags e visual retrô
└── package.json                   # Dependências e scripts
```

---

## 🔒 Privacidade & Segurança

- **100% Offline e Privado**: Nenhum dado pessoal ou de tarefa é enviado para servidores externos.
- **Seus Dados Pertencem a Você**: Baixe seu backup em `.json` a qualquer momento para garantir a custódia das suas informações.

---

## 📄 Licença

Distribuído sob a licença [Apache 2.0](LICENSE).
