# OPERATOR // MATRIX RETRO TERMINAL WORKSPACE

> **Ambiente de produtividade e gerenciador de projetos pessoais com estética de terminal retrô Cyberpunk/Matrix (verde fósforo #22c55e), navegação 100% orientada a teclado (Vim/Linux), Quick-Find global, persistência local-first, sincronização opcional na nuvem via Supabase, anexos de arquivos e instalação como PWA.**

---

## ⚡ Visão Geral

O **Operator** é um espaço de trabalho pessoal criado sob medida para desenvolvedores, engenheiros de infraestrutura e entusiastas do ecossistema Linux/Unix que preferem uma interface rápida, limpa, sem distrações e com foco extremo em execução.

Inspirado no visual clássico dos monitores monocromáticos CRT e terminais dos anos 90, o sistema funciona em modo **Local-First**: seus projetos, tarefas com `#tags`, notas de arquitetura, snippets de código e anexos ficam salvos no `localStorage` do navegador e funcionam sem internet e sem conta.

Quando você quiser usar o mesmo workspace no PC e no celular, basta **entrar com e-mail/senha ou Google**: os projetos passam a ser sincronizados com um banco **Supabase** (Postgres com Row Level Security) e os arquivos vão para o **Supabase Storage**. Sem Supabase configurado, o app continua 100% local.

---

## 🚀 Principais Funcionalidades

### 1. 🟢 Estética Monocromática Matrix & Terminal CRT
- **Chuva Digital (Matrix Rain)** em segundo plano renderizada em Canvas de alta performance com controle de opacidade e toggle instantâneo.
- **Filtro de Scanlines CRT** simulando a textura de monitores fósforo verde vintage.
- **Sintetizador de Áudio Terminal**: beeps e cliques mecânicos sintetizados em tempo real via **Web Audio API** (sem carregar arquivos de áudio externos).
- **Fontes Monospaced & Cursores Piscantes** para reproduzir a sensação autêntica de um terminal Unix.

### 2. 📁 Gestão Completa de Projetos & Tarefas
- **Hierarquia de Tarefas & Subtarefas**: adicione tarefas com checklist encadeado, notas técnicas e níveis de prioridade (`CRIT`, `MED`, `LOW`).
- **Sistema de `#tags` Coloridas Determinísticas**: tags como `#api`, `#docker`, `#security`, `#infra` e `#db` recebem automaticamente paletas de cores de terminal baseadas em hash.
- **Filtros Rápidos**: visualize tarefas por status (*Todas*, *Pendentes*, *Concluídas*) ou clique em qualquer tag para filtrar em tempo real.
- **Notas Técnicas & Snippets de Código**: armazene observações de arquitetura e comandos de terminal/código com cópia rápida para o clipboard em 1 clique.
- **Abas por Bloco**: *Todos os Blocos*, *Tarefas*, *Observações*, *Snippets* e *Arquivos*.

### 3. ☁️ Conta & Sincronização na Nuvem (Supabase) — opcional
- **Login com E-mail/Senha ou Google (OAuth)** pelo botão `[ENTRAR]` ou pelo comando `login` no prompt (`Ctrl+K`).
- **Migração automática no primeiro login**: se a sua conta ainda não tem projetos na nuvem, os projetos locais deste aparelho são enviados para ela.
- **Carregamento da nuvem nos próximos logins**: se a conta já tem projetos, eles substituem a cópia local do aparelho (a nuvem é a fonte da verdade).
- **Salvamento contínuo**: cada criação, edição ou exclusão de projeto é enviada ao Supabase na hora. Se a sincronização falhar, um aviso aparece e os dados continuam salvos localmente.
- **Envio manual**: o botão `ENVIAR PROJETOS PARA SUPABASE` (no modal da conta) força o envio de todos os projetos locais.
- **Isolamento por usuário**: a tabela `projects` usa Row Level Security, então cada usuário só lê e altera os próprios projetos.

> ℹ️ A sincronização não é em tempo real entre aparelhos abertos ao mesmo tempo: o outro dispositivo vê as mudanças ao recarregar a página ou entrar novamente. Se dois aparelhos editarem o mesmo projeto, vale a última gravação.

### 4. 📎 Anexos, Mídias & Arquivos de Código (Aba Arquivos)
- **Upload Multiformato**: arraste e solte (Drag & Drop) ou selecione imagens, vídeos, PDFs, arquivos de código (`.ts`, `.py`, `.json`, `.sql`, `Dockerfile`, etc.), textos e arquivos compactados.
- **Filtros por Tipo**: *Todos*, *Imagens*, *Vídeos*, *PDFs* e *Código/Texto*.
- **Visualizadores Embutidos**:
  - **Imagens**: miniaturas com lightbox para visualização em alta resolução.
  - **Vídeos**: player integrado estilo terminal.
  - **Documentos PDF**: leitor e download direto em 1 clique.
  - **Código & Texto**: inspetor com pré-visualização monoespaçada e botão de cópia para o clipboard.
- **Armazenamento Híbrido**:
  - **Logado + bucket configurado**: o arquivo vai para o bucket `project-attachments` do Supabase Storage e fica disponível em todos os seus aparelhos (indicador de nuvem no card).
  - **Sem login, offline ou bucket ausente**: o arquivo é salvo localmente neste navegador (indicador âmbar *"salvo apenas neste aparelho"*).
- **Sincronizar Anexos Locais com 1 Clique**: quando existem anexos salvos só no aparelho, aparece um aviso com o botão `SINCRONIZAR COM A NUVEM`, que os envia ao Storage depois que você fizer login.
- **Persistência Dupla dos Metadados**: a lista de anexos é gravada na coluna `attachments` e também embutida nas observações do projeto, então os anexos sincronizam mesmo em bancos criados antes dessa coluna existir.

> ⚠️ Arquivos salvos localmente ficam no `localStorage`, que tem limite de poucos MB por site. Para vídeos e arquivos grandes, use o Supabase Storage.

### 5. ⌨️ Navegação Rápida Orientada a Teclado (Vim & Linux)
Opere o sistema sem tirar as mãos do teclado:

| Tecla / Atalho | Ação no Sistema | Analogia Linux / Git |
| :--- | :--- | :--- |
| **`?`** ou **`F1`** | Abre o **Manual do Sistema (`MAN OPERATOR`)** | `man operator` / `:help` |
| **`T`** | Foca no campo de **Nova Tarefa** imediatamente | `touch task.md` |
| **`J` / `K`** (ou setas) | Navega entre as tarefas na lista | Vim cursor `j`/`k` |
| **`X`** ou **`Espaço`** | Marca / desmarca a tarefa selecionada | `git commit -m "done"` |
| **`Delete`** | Remove a tarefa selecionada | `git rm` |
| **`1, 2, 3, 4, 5`** | Alterna entre as abas (*Todos*, *Tarefas*, *Observações*, *Snippets*, *Arquivos*) | Workspaces do i3 / tmux |
| **`N`** | Cria um novo projeto | `git init <proj>` |
| **`M`** | Exporta o projeto ativo como **Markdown** formatado | `git log > README.md` |
| **`Ctrl + S`** | Força a gravação do cache local (`localStorage`) | `sync` |
| **`Ctrl + K`** | Abre o **Prompt de Comandos CLI & Quick-Find** | Terminal / Shell |
| **`B`** | Liga / desliga a Chuva Digital (Matrix Rain) | Background toggle |
| **`S`** | Liga / muta o feedback sonoro do terminal | Audio bell toggle |
| **`Esc`** | Fecha modais ou sai de campos de texto | Vim `<Esc>` / `:q` |

### 6. 🔍 Quick-Find no Prompt de Comandos (`Cmd+K` / `Ctrl+K`)
- **Busca Simultânea**: pesquise instantaneamente em títulos de tarefas, `#tags`, subtarefas e nomes, categorias e descrições de projetos.
- **Salto Direto com Auto-Scroll**: ao selecionar uma tarefa nos resultados (via clique ou `Enter`), o workspace pula para o projeto pai, rola até a tarefa e a destaca com efeito fosforescente.
- **Comandos Executáveis no Prompt**:
  - `git checkout <nome>` (ou `switch <nome>`): troca para o projeto informado.
  - `git init <nome>` (ou `new <nome>`): cria um projeto já com o título informado.
  - `git commit`, `export` ou `md`: copia o projeto em Markdown para o clipboard.
  - `git status` (ou `status`): exibe o resumo de tarefas concluídas e pendentes.
  - `+ <tarefa> #tag` (ou `task: <tarefa>`): cadastra uma tarefa rápida com tags.
  - `#<tag>`: filtra tarefas de todos os projetos pela tag.
  - `login`, `auth`, `nuvem`, `entrar` ou `sair`: abre o modal de conta / sincronização.
  - `pwa`, `instalar` ou `install`: instala o app no dispositivo.
  - `man`, `help`, `:help` ou `?`: abre o manual.

### 7. 💾 Central de Backup & Migração (.JSON)
- **Download em 1 Clique**: baixe um arquivo com todos os seus projetos, tarefas, tags, anotações, metadados de anexos e preferências (ex: `operator_backup_2026-10-05.json`).
- **Restauração em Outro Dispositivo**: faça upload do `.json` escolhendo **Substituir Tudo** ou **Mesclar com Atuais**. A gravação no `localStorage` é imediata e, se você estiver logado, os projetos importados também são enviados para a nuvem.
- Funciona sem conta: é a forma de migrar dados entre aparelhos sem usar o Supabase.

### 8. 📱 PWA Instalável (Offline & Standalone)
- **Instalação Nativa**: instale no Android, Windows, macOS e Linux pelo botão `[Instalar App]` ou pelo menu do navegador. No **iPhone/iPad** o botão mostra o passo a passo do Safari (*Compartilhar → Adicionar à Tela de Início*).
- **Janela Standalone**: roda sem barra de URL, com ícone próprio na tela de início/desktop.
- **Service Worker com Auto-Update**: novas versões publicadas são aplicadas em segundo plano automaticamente.
- **Funciona Offline**: assets, fontes e scripts ficam em cache. Um indicador âmbar `MODO OFFLINE` aparece quando a conexão cai, e o app continua operando no cache local.

### 9. 📄 Exportação para Markdown
- Com um clique no botão **`Exportar MD`** (ou tecla `M`), tarefas, observações e snippets do projeto ativo são compilados em Markdown limpo e copiados para a área de transferência, prontos para virar um `README.md` ou documentação no GitHub.

---

## 🛠️ Stack Tecnológica

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite](https://vite.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend opcional**: [Supabase](https://supabase.com) (Auth, Postgres com RLS e Storage) via `@supabase/supabase-js`
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Áudio**: Web Audio API com sintetizador oscilador customizado (sem assets externos)
- **Animações Canvas**: HTML5 Canvas para a chuva digital Matrix
- **Testes Automatizados**: Node.js assert nativo + tsx runner

---

## 📦 Como Instalar e Rodar Localmente

### Pré-requisitos
- Node.js 20.19 ou superior (exigido pelo Vite 8)
- npm (ou bun / pnpm)

### 1. Clonar o repositório
```bash
git clone https://github.com/j-c-fstk-dev/Operator-Matrix-Retro-Terminal-Workspace.git
cd Operator-Matrix-Retro-Terminal-Workspace
```

### 2. Instalar dependências
```bash
npm install
```

### 3. (Opcional) Configurar o Supabase
Copie o arquivo de exemplo e preencha as chaves (veja a seção [Configuração do Supabase](#️-configuração-do-supabase-autenticação-banco--storage)):
```bash
cp .env.example .env
```
Sem essas variáveis, o app roda em modo 100% local.

### 4. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
O aplicativo estará disponível em: `http://localhost:3000`

### 5. Verificar tipos e executar os testes
```bash
npm run lint   # checagem de tipos com tsc
npm test       # suíte de testes automatizados
```

### 6. Compilar para produção
```bash
npm run build
npm run preview   # opcional: testa o build localmente
```
Os arquivos prontos para deploy estático serão gerados no diretório `/dist`.

---

## 🌐 Deploy em Produção (Netlify, Vercel ou GitHub Pages)

Como o Operator é uma **SPA estática (Single Page Application)**, o deploy pode ser feito gratuitamente em qualquer hospedagem estática. O arquivo `public/_redirects` já redireciona todas as rotas para o `index.html` no Netlify.

### No Netlify:
1. Conecte o repositório Git ou arraste a pasta `dist` gerada pelo comando `npm run build`.
2. Configure as opções de Build:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
3. Se estiver usando o Supabase, adicione as variáveis em **Site configuration > Environment variables**:
   - `VITE_SUPABASE_URL`: URL do projeto Supabase
   - `VITE_SUPABASE_ANON_KEY`: chave pública `anon` do Supabase

> As variáveis `VITE_*` são embutidas no bundle durante o build. Depois de adicioná-las ou alterá-las, faça um novo deploy.

---

## 🗄️ Configuração do Supabase (Autenticação, Banco & Storage)

O suporte ao [Supabase](https://supabase.com) é opcional. Se as variáveis não estiverem configuradas, o app continua funcionando em modo 100% local (offline).

### 1. Criar o projeto e o banco de dados

1. **Crie um projeto gratuito no [Supabase](https://supabase.com)**.
2. Acesse **Project Settings > API** e copie:
   - `Project URL`
   - `anon public key`
3. Abra o **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e clique em **RUN**. O script cria a tabela `projects` (com a coluna `attachments`), ativa o **Row Level Security** para que cada usuário só acesse os próprios projetos e cria os índices. Ele pode ser executado de novo com segurança para migrar bancos antigos.
4. Adicione as variáveis no seu `.env` local ou no painel do Netlify:
   ```env
   VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
   VITE_SUPABASE_ANON_KEY="sua-chave-anon"
   ```
5. Pronto! Clique em `[ENTRAR]` no app, crie uma conta e seus projetos passam a ser sincronizados com a nuvem.

### 2. Ativar Login com Google (OAuth)

1. No painel do **Supabase**, vá em **Authentication** > **Providers** > **Google** e marque como habilitado.
2. Copie o **Callback URL (for OAuth)** exibido ali (ex: `https://<seu-projeto>.supabase.co/auth/v1/callback`).
3. Acesse o [Google Cloud Console](https://console.cloud.google.com/):
   - Crie ou selecione um projeto.
   - Configure a **OAuth consent screen** (tipo *External*).
   - Vá em **Credentials** > **Create Credentials** > **OAuth client ID** > Tipo: **Web application**.
   - Em **Authorized redirect URIs**, adicione a URL copiada do Supabase.
   - Copie o **Client ID** e o **Client Secret** gerados.
4. Volte ao provider do Google no Supabase, cole o **Client ID** e o **Client Secret** e clique em **Save**.
5. Em **Authentication** > **URL Configuration**, adicione a URL do seu site (ex: `https://seu-app.netlify.app`) e, para desenvolvimento, `http://localhost:3000` em **Redirect URLs**. Após o login, o Google redireciona de volta para a origem onde o app está aberto.

### 3. Ativar o Upload de Arquivos (Supabase Storage)

1. No painel do **Supabase**, clique em **Storage** > **New bucket**.
2. Defina o nome exatamente como: `project-attachments`.
3. Marque **Public bucket** (as imagens, vídeos e PDFs são abertos por URL pública) e clique em **Save**.
4. Libere o upload para usuários logados. Um bucket público permite *leitura*, mas o envio e a exclusão de arquivos precisam de políticas no `storage.objects`. No **SQL Editor**, rode:
   ```sql
   -- Cada usuário só envia/altera/remove arquivos dentro da própria pasta (<user_id>/...)
   create policy "Users upload own attachments"
   on storage.objects for insert to authenticated
   with check (bucket_id = 'project-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

   create policy "Users update own attachments"
   on storage.objects for update to authenticated
   using (bucket_id = 'project-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

   create policy "Users delete own attachments"
   on storage.objects for delete to authenticated
   using (bucket_id = 'project-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
   ```
5. Pronto! Os novos uploads passam a ir para a nuvem. Se o bucket ou as políticas estiverem faltando, o app avisa e salva o arquivo localmente, e depois você pode enviá-lo com `SINCRONIZAR COM A NUVEM`.

Os arquivos são organizados no bucket como `<user_id>/<project_id>/<timestamp>_<nome-do-arquivo>`.

---

## 📁 Estrutura do Código

```
├── public/
│   ├── _redirects                 # Fallback de rotas SPA para o Netlify
│   └── icon.svg, pwa-*.png, ...   # Ícones do PWA, favicon e apple-touch-icon
├── scripts/
│   └── generate-png-icons.js      # Gera os ícones PNG do PWA
├── supabase/
│   └── schema.sql                 # Tabela projects, RLS e índices no Supabase
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx          # Login (e-mail/senha e Google) e envio de projetos para a nuvem
│   │   ├── BackupModal.tsx        # Central de backup, download e upload JSON
│   │   ├── CommandPalette.tsx     # Prompt de comandos CLI (Ctrl+K) & Quick-Find
│   │   ├── ManualModal.tsx        # Manual completo de atalhos e comandos Unix (man)
│   │   ├── MatrixRainCanvas.tsx   # Canvas de chuva digital Matrix em segundo plano
│   │   ├── OfflineIndicator.tsx   # Aviso de modo offline
│   │   ├── ProjectAttachments.tsx # Aba de arquivos: upload, visualizadores e sync de anexos
│   │   ├── ProjectWorkspace.tsx   # Painel principal do projeto com tarefas e abas
│   │   ├── PWAInstallButton.tsx   # Botão de instalação do PWA e guia para iOS
│   │   ├── SettingsModal.tsx      # Preferências de áudio, scanlines e reset
│   │   └── Sidebar.tsx            # Barra lateral retrô com projetos e controles
│   ├── hooks/
│   │   ├── useOnlineStatus.ts     # Detecta conexão online/offline
│   │   └── usePWAInstall.ts       # Captura o prompt de instalação do PWA
│   ├── lib/
│   │   └── supabase.ts            # Cliente do Supabase (desativado sem variáveis de ambiente)
│   ├── services/
│   │   ├── supabaseService.ts     # CRUD e mapeamento dos projetos no Postgres
│   │   └── storageService.ts      # Upload/remoção de anexos no Storage com fallback local
│   ├── data/
│   │   └── initialData.ts         # Dados de exemplo pré-carregados
│   ├── utils/
│   │   ├── audio.ts               # Sintetizador Web Audio para feedback sonoro
│   │   └── tagColors.ts           # Gerador determinístico de cores de terminal para #tags
│   ├── types.ts                   # Definições de tipos TypeScript
│   ├── App.tsx                    # Componente raiz, estado global, sync e atalhos
│   └── main.tsx                   # Ponto de entrada da aplicação
├── tests/
│   └── suite.test.ts              # Suíte de testes automatizados
├── index.html                     # Entrypoint HTML com meta tags do PWA
├── vite.config.ts                 # Configuração do Vite, Tailwind e PWA
└── package.json                   # Dependências e scripts
```

---

## 🔒 Privacidade & Segurança

- **Modo Local (sem login)**: nenhum dado de projeto ou arquivo sai do seu navegador.
- **Modo Nuvem (com login)**: projetos ficam no seu projeto Supabase, protegidos por Row Level Security (cada usuário só acessa as próprias linhas).
- **Atenção com anexos**: o bucket `project-attachments` é público. Qualquer pessoa que tenha a URL de um arquivo consegue abri-lo, então evite enviar documentos sensíveis.
- **Seus Dados Pertencem a Você**: baixe seu backup em `.json` a qualquer momento para garantir a custódia das suas informações.

---

## 📄 Licença

Distribuído sob a licença Apache 2.0 (SPDX: `Apache-2.0`).
