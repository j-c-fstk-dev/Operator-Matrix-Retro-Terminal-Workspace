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