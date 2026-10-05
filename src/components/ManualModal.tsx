import React, { useEffect } from 'react';
import { X, Terminal, BookOpen, Command, Copy, Check, ExternalLink, Keyboard } from 'lucide-react';
import { sound } from '../utils/audio';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  action: string;
  analogy: string;
  category: 'nav' | 'tasks' | 'projects' | 'system';
}

const SHORTCUTS: ShortcutItem[] = [
  // Navegação
  { key: '?', action: 'Abre este Manual do Sistema', analogy: 'man operator / vim :help', category: 'nav' },
  { key: '/', action: 'Foca no filtro de projetos / busca', analogy: 'less / vim / search', category: 'nav' },
  { key: 'Ctrl + K', action: 'Abre o Prompt de Comandos do Operador', analogy: 'terminal CLI / bash prompt', category: 'nav' },
  { key: '1, 2, 3, 4', action: 'Alterna abas (Todos, Tarefas, Notas, Snippets)', analogy: 'tmux / i3 workspace switch', category: 'nav' },
  { key: 'J / K', action: 'Navega para a tarefa seguinte / anterior', analogy: 'vim j/k cursor navigation', category: 'nav' },
  { key: 'Esc', action: 'Fecha modais, cancela ou desseleciona foco', analogy: 'vim <ESC> / :q', category: 'nav' },

  // Tarefas & Subtarefas
  { key: 'T', action: 'Foca imediatamente no campo de nova tarefa', analogy: 'touch task.md', category: 'tasks' },
  { key: 'X ou Espaço', action: 'Marca/desmarca a tarefa selecionada ([x])', analogy: 'git commit -m "done"', category: 'tasks' },
  { key: '#tag', action: 'Adiciona tags diretamente ao escrever tarefa', analogy: 'git tag -a', category: 'tasks' },
  { key: 'Enter', action: 'Confirma criação de tarefa ou subtarefa', analogy: 'shell execute <CR>', category: 'tasks' },
  { key: '+ sub', action: 'Adiciona subtarefa encadeada à tarefa ativa', analogy: 'sub-process branching', category: 'tasks' },

  // Projetos & Git
  { key: 'N', action: 'Cria um novo projeto no workspace', analogy: 'git init <project>', category: 'projects' },
  { key: 'M', action: 'Exporta o projeto completo em Markdown', analogy: 'git log > README.md', category: 'projects' },
  { key: 'Ctrl + S', action: 'Força sincronização e validação de cache local', analogy: 'git push / sync storage', category: 'projects' },

  // Sistema & Terminal
  { key: 'B', action: 'Liga/desliga a Chuva Digital (Matrix Rain)', analogy: 'screen saver toggle', category: 'system' },
  { key: 'S', action: 'Liga/muta os efeitos sonoros do terminal', analogy: 'beep / audio bell toggle', category: 'system' },
];

const CLI_COMMANDS = [
  { cmd: ':help ou man', desc: 'Abre o manual completo de comandos' },
  { cmd: 'git checkout <nome>', desc: 'Muda para o projeto com nome correspondente' },
  { cmd: 'git init <nome>', desc: 'Inicializa um novo projeto com o título informado' },
  { cmd: 'git commit ou export', desc: 'Copia o projeto ativo como Markdown para o buffer' },
  { cmd: 'git status', desc: 'Mostra o resumo de tarefas concluídas e pendentes' },
  { cmd: '+ <texto> ou task: <texto>', desc: 'Insere uma tarefa rápida com suporte a #tags' },
  { cmd: 'clear ou limpa', desc: 'Limpa filtros de busca e tags aplicados' },
];

export const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen) sound.playCommand();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCheatsheet = () => {
    let text = `# OPERATOR(1) - GUIA DE ATALHOS & COMANDOS\n\n`;
    text += `## ATALHOS DO TECLADO (LINUX / VIM STYLE)\n`;
    SHORTCUTS.forEach((s) => {
      text += `- ${s.key.padEnd(14)} : ${s.action} (${s.analogy})\n`;
    });
    text += `\n## COMANDOS DO PROMPT (Ctrl+K)\n`;
    CLI_COMMANDS.forEach((c) => {
      text += `- ${c.cmd.padEnd(25)} : ${c.desc}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    sound.playClick(900);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] bg-[#030804] border border-[#22c55e] shadow-[0_0_35px_rgba(0,255,102,0.2)] text-[#86efac] font-mono text-xs flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#061408] border-b border-[#14351a] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#22c55e] shadow-[0_0_8px_#22c55e]"></span>
            <span className="font-bold text-[#22c55e] tracking-wider text-xs">
              MAN OPERATOR(1) // MANUAL DO SISTEMA & ATALHOS
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#15803d] hidden sm:inline">[TECLE ESC PARA FECHAR]</span>
            <button
              onClick={onClose}
              className="text-[#15803d] hover:text-[#22c55e] p-1 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Man Page Header Banner */}
        <div className="px-5 py-2 bg-[#020502] border-b border-[#0d2212] text-[10px] text-[#166534] flex items-center justify-between shrink-0">
          <span>OPERATOR(1)</span>
          <span>MANUAL DE COMANDOS DO SISTEMA MATRIX</span>
          <span>OPERATOR(1)</span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section: NAME */}
          <div>
            <div className="text-[11px] font-bold text-[#22c55e] tracking-widest border-b border-[#14351a] pb-1 uppercase">
              NAME
            </div>
            <p className="mt-1 text-xs text-[#86efac] leading-relaxed">
              <strong>operator</strong> - espaço minimalista de organização de projetos, tarefas hierárquicas, tags e notas técnicas com fluxo orientado a teclado para desenvolvedores.
            </p>
          </div>

          {/* Section: SHORTCUTS */}
          <div>
            <div className="flex items-center justify-between border-b border-[#14351a] pb-1">
              <span className="text-[11px] font-bold text-[#22c55e] tracking-widest uppercase flex items-center gap-1.5">
                <Keyboard size={13} />
                <span>ATALHOS DO TECLADO (LINUX & VIM COMPATÍVEIS)</span>
              </span>
              <button
                onClick={handleCopyCheatsheet}
                className="text-[10px] text-[#22c55e] hover:text-white flex items-center gap-1 transition-colors"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                <span>{copied ? 'COPIADO' : 'COPIAR GUIA'}</span>
              </button>
            </div>

            <p className="mt-1.5 text-[11px] text-[#15803d]">
              Os atalhos de letra única (como <code className="text-[#86efac]">T</code>, <code className="text-[#86efac]">J/K</code>, <code className="text-[#86efac]">X</code>) funcionam quando você não estiver digitando dentro de um campo de texto.
            </p>

            <div className="mt-3 border border-[#102914] divide-y divide-[#0c2211]">
              <div className="grid grid-cols-12 bg-[#051107] px-3 py-1.5 text-[10px] font-bold text-[#16a34a] tracking-wider uppercase">
                <span className="col-span-3">ATALHO</span>
                <span className="col-span-5">AÇÃO NO SISTEMA</span>
                <span className="col-span-4">ANALOGIA LINUX / GIT</span>
              </div>

              {SHORTCUTS.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 px-3 py-2 text-xs hover:bg-[#061408] transition-colors items-center"
                >
                  <div className="col-span-3 font-bold text-[#22c55e]">
                    <kbd className="px-1.5 py-0.5 bg-[#08180b] border border-[#166534] text-[11px] text-[#22c55e]">
                      {item.key}
                    </kbd>
                  </div>
                  <div className="col-span-5 text-[#86efac]">
                    {item.action}
                  </div>
                  <div className="col-span-4 text-[11px] text-[#166534] font-mono">
                    // {item.analogy}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: COMMAND LINE INTERFACE (Ctrl+K) */}
          <div>
            <div className="text-[11px] font-bold text-[#22c55e] tracking-widest border-b border-[#14351a] pb-1 uppercase flex items-center gap-1.5">
              <Terminal size={13} />
              <span>COMANDOS DIGITÁVEIS NO PROMPT (CTRL + K)</span>
            </div>

            <p className="mt-1.5 text-[11px] text-[#15803d]">
              Pressione <kbd className="text-[#22c55e]">Ctrl+K</kbd> a qualquer momento e digite comandos estilo Git/Unix:
            </p>

            <div className="mt-2.5 border border-[#102914] divide-y divide-[#0c2211]">
              {CLI_COMMANDS.map((c, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 px-3 py-1.5 text-xs hover:bg-[#061408] items-center"
                >
                  <div className="col-span-5 font-bold text-[#22c55e] flex items-center gap-1.5">
                    <span className="text-[#15803d]">&gt;</span>
                    <code>{c.cmd}</code>
                  </div>
                  <div className="col-span-7 text-[#86efac]/80 text-[11px]">
                    {c.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: LOCAL STORAGE & PERSISTENCE */}
          <div>
            <div className="text-[11px] font-bold text-[#22c55e] tracking-widest border-b border-[#14351a] pb-1 uppercase">
              PERSISTÊNCIA & NETLIFY
            </div>
            <p className="mt-1.5 text-[11px] text-[#86efac]/80 leading-relaxed">
              O sistema opera em modo <strong>local-first</strong>: todas as edições são persistidas no cache do navegador (<code className="text-[#22c55e]">localStorage</code>).
              Para mover entre máquinas ou salvar checkpoints versionados como no Git, use o botão <strong>Backup JSON</strong> no topo ou na barra lateral para baixar seu <code className="text-[#22c55e]">.json</code> completo e subir no outro dispositivo em segundos.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-[#040c06] border-t border-[#14351a] flex items-center justify-between text-[11px] text-[#15803d] shrink-0">
          <div className="flex items-center gap-2">
            <span>OPERATOR CLI MANUAL</span>
            <span>·</span>
            <span>PRESSIONE <kbd className="text-[#22c55e]">?</kbd> PARA ACESSAR DE QUALQUER TELA</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#092211] hover:bg-[#0e2c14] border border-[#22c55e] text-xs text-[#22c55e] transition-colors"
          >
            ENTENDIDO [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
