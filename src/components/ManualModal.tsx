import React, { useEffect } from 'react';
import { SOURCE_CODE_URL, LICENSE_NAME, APP_VERSION } from '../lib/appInfo';
import { X, Terminal, BookOpen, Command, Copy, Check, ExternalLink, Keyboard } from 'lucide-react';
import { sound } from '../utils/audio';
import { useT, Dict } from '../i18n';
import { Rich } from '../i18n/Rich';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ShortcutId = keyof Dict['manual']['shortcuts'];
type CommandId = keyof Dict['manual']['commands'];

// Teclas e analogias são iguais nos dois idiomas; as descrições vêm do dicionário.
const SHORTCUTS: { id: ShortcutId; key: string | ((t: Dict) => string); analogy: string }[] = [
  { id: 'manual', key: '?', analogy: 'man operator / vim :help' },
  { id: 'palette', key: 'Ctrl + K', analogy: 'terminal CLI / bash prompt' },
  { id: 'tabs', key: '1, 2, 3, 4, 5', analogy: 'tmux / i3 workspace switch' },
  { id: 'navigate', key: 'J / K', analogy: 'vim j/k cursor navigation' },
  { id: 'escape', key: 'Esc', analogy: 'vim <ESC> / :q' },
  { id: 'newTask', key: 'T', analogy: 'touch task.md' },
  { id: 'toggleTask', key: (t) => t.manual.keyXSpace, analogy: 'git commit -m "done"' },
  { id: 'tags', key: '#tag', analogy: 'git tag -a' },
  { id: 'confirm', key: 'Enter', analogy: 'shell execute <CR>' },
  { id: 'subtask', key: '+ sub', analogy: 'sub-process branching' },
  { id: 'newProject', key: 'N', analogy: 'git init <project>' },
  { id: 'exportMd', key: 'M', analogy: 'git log > README.md' },
  { id: 'save', key: 'Ctrl + S', analogy: 'sync storage' },
  { id: 'rain', key: 'B', analogy: 'screen saver toggle' },
  { id: 'sound', key: 'S', analogy: 'beep / audio bell toggle' },
];

const CLI_COMMANDS: { id: CommandId; cmd: string | ((t: Dict) => string) }[] = [
  { id: 'help', cmd: (t) => t.manual.cmdHelp },
  { id: 'auth', cmd: (t) => t.manual.cmdAuth },
  { id: 'checkout', cmd: (t) => t.manual.cmdCheckout },
  { id: 'init', cmd: (t) => t.manual.cmdInit },
  { id: 'commit', cmd: (t) => t.manual.cmdCommit },
  { id: 'status', cmd: 'git status' },
  { id: 'task', cmd: (t) => t.manual.cmdTask },
  { id: 'pwa', cmd: (t) => t.manual.cmdPwa },
  { id: 'lang', cmd: 'lang en | lang pt' },
];

export const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
  const t = useT();
  const [copied, setCopied] = React.useState(false);
  const keyOf = (item: (typeof SHORTCUTS)[number]) => (typeof item.key === 'function' ? item.key(t) : item.key);
  const cmdOf = (item: (typeof CLI_COMMANDS)[number]) => (typeof item.cmd === 'function' ? item.cmd(t) : item.cmd);

  useEffect(() => {
    if (isOpen) sound.playCommand();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCheatsheet = () => {
    let text = `# ${t.manual.cheatsheetTitle}\n\n`;
    text += `## ${t.manual.shortcutsSection}\n`;
    SHORTCUTS.forEach((s) => {
      text += `- ${keyOf(s).padEnd(14)} : ${t.manual.shortcuts[s.id]} (${s.analogy})\n`;
    });
    text += `\n## ${t.manual.commandsSection}\n`;
    CLI_COMMANDS.forEach((c) => {
      text += `- ${cmdOf(c).padEnd(25)} : ${t.manual.commands[c.id]}\n`;
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
        className="w-full max-w-3xl max-h-[88vh] bg-[color:var(--t-030804)] border border-[color:var(--t-22c55e)] shadow-[0_0_35px_color-mix(in_srgb,var(--t-00ff66)_20%,transparent)] text-[color:var(--t-86efac)] font-mono text-xs flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[color:var(--t-061408)] border-b border-[color:var(--t-14351a)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[color:var(--t-22c55e)] shadow-[0_0_8px_var(--t-22c55e)]"></span>
            <span className="font-bold text-[color:var(--t-22c55e)] tracking-wider text-xs">
              {t.manual.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[color:var(--t-21a04d)] hidden sm:inline">{t.manual.escHint}</span>
            <button
              onClick={onClose}
              className="text-[color:var(--t-21a04d)] hover:text-[color:var(--t-22c55e)] p-1 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Man Page Header Banner */}
        <div className="px-5 py-2 bg-[color:var(--t-020502)] border-b border-[color:var(--t-0d2212)] text-[10px] text-[color:var(--t-21a04d)] flex items-center justify-between shrink-0">
          <span>OPERATOR(1)</span>
          <span>{t.manual.banner}</span>
          <span>OPERATOR(1)</span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section: NAME */}
          <div>
            <div className="text-[11px] font-bold text-[color:var(--t-22c55e)] tracking-widest border-b border-[color:var(--t-14351a)] pb-1 uppercase">
              NAME
            </div>
            <p className="mt-1 text-xs text-[color:var(--t-86efac)] leading-relaxed">
              <Rich text={t.manual.name} />
            </p>
          </div>

          {/* Section: SHORTCUTS */}
          <div>
            <div className="flex items-center justify-between border-b border-[color:var(--t-14351a)] pb-1">
              <span className="text-[11px] font-bold text-[color:var(--t-22c55e)] tracking-widest uppercase flex items-center gap-1.5">
                <Keyboard size={13} />
                <span>{t.manual.shortcutsSection}</span>
              </span>
              <button
                onClick={handleCopyCheatsheet}
                className="text-[10px] text-[color:var(--t-22c55e)] hover:text-white flex items-center gap-1 transition-colors"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                <span>{copied ? t.manual.copied : t.manual.copyGuide}</span>
              </button>
            </div>

            <p className="mt-1.5 text-[11px] text-[color:var(--t-21a04d)]">
              <Rich text={t.manual.singleKeyHint} slots={{ keys: <code className="text-[color:var(--t-86efac)]">T, J/K, X</code> }} />
            </p>

            <div className="mt-3 border border-[color:var(--t-102914)] divide-y divide-[color:var(--t-0c2211)]">
              <div className="grid grid-cols-12 bg-[color:var(--t-051107)] px-3 py-1.5 text-[10px] font-bold text-[color:var(--t-16a34a)] tracking-wider uppercase">
                <span className="col-span-3">{t.manual.colKey}</span>
                <span className="col-span-5">{t.manual.colAction}</span>
                <span className="col-span-4">{t.manual.colAnalogy}</span>
              </div>

              {SHORTCUTS.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 px-3 py-2 text-xs hover:bg-[color:var(--t-061408)] transition-colors items-center"
                >
                  <div className="col-span-3 font-bold text-[color:var(--t-22c55e)]">
                    <kbd className="px-1.5 py-0.5 bg-[color:var(--t-08180b)] border border-[color:var(--t-166534)] text-[11px] text-[color:var(--t-22c55e)]">
                      {keyOf(item)}
                    </kbd>
                  </div>
                  <div className="col-span-5 text-[color:var(--t-86efac)]">
                    {t.manual.shortcuts[item.id]}
                  </div>
                  <div className="col-span-4 text-[11px] text-[color:var(--t-21a04d)] font-mono">
                    // {item.analogy}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: COMMAND LINE INTERFACE (Ctrl+K) */}
          <div>
            <div className="text-[11px] font-bold text-[color:var(--t-22c55e)] tracking-widest border-b border-[color:var(--t-14351a)] pb-1 uppercase flex items-center gap-1.5">
              <Terminal size={13} />
              <span>{t.manual.commandsSection}</span>
            </div>

            <p className="mt-1.5 text-[11px] text-[color:var(--t-21a04d)]">
              <Rich text={t.manual.commandsHint} slots={{ kbd: <kbd className="text-[color:var(--t-22c55e)]">Ctrl+K</kbd> }} />
            </p>

            <div className="mt-2.5 border border-[color:var(--t-102914)] divide-y divide-[color:var(--t-0c2211)]">
              {CLI_COMMANDS.map((c, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 px-3 py-1.5 text-xs hover:bg-[color:var(--t-061408)] items-center"
                >
                  <div className="col-span-5 font-bold text-[color:var(--t-22c55e)] flex items-center gap-1.5">
                    <span className="text-[color:var(--t-21a04d)]">&gt;</span>
                    <code>{cmdOf(c)}</code>
                  </div>
                  <div className="col-span-7 text-[color:var(--t-86efac)]/80 text-[11px]">
                    {t.manual.commands[c.id]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: LOCAL STORAGE & PERSISTENCE */}
          <div>
            <div className="text-[11px] font-bold text-[color:var(--t-22c55e)] tracking-widest border-b border-[color:var(--t-14351a)] pb-1 uppercase">
              {t.manual.storageSection}
            </div>
            <p className="mt-1.5 text-[11px] text-[color:var(--t-86efac)]/80 leading-relaxed">
              <Rich text={t.manual.storageBody} slots={{ ls: <code className="text-[color:var(--t-22c55e)]">localStorage</code>, json: <code className="text-[color:var(--t-22c55e)]">.json</code> }} />
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-[color:var(--t-040c06)] border-t border-[color:var(--t-14351a)] flex items-center justify-between text-[11px] text-[color:var(--t-21a04d)] shrink-0">
          <div className="flex items-center gap-2">
            <span>OPERATOR CLI MANUAL</span>
            <span>·</span>
            <span className="hidden sm:inline"><Rich text={t.manual.footerHint} slots={{ kbd: <kbd className="text-[color:var(--t-22c55e)]">?</kbd> }} /></span>
            <span className="hidden sm:inline">·</span>
            <a
              href={SOURCE_CODE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[color:var(--t-22c55e)] hover:underline"
              title={t.common.sourceTitle}
            >
              {t.common.sourceLink(LICENSE_NAME)}
            </a>
            <span className="opacity-70" title={t.common.versionTitle}>v{APP_VERSION}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[color:var(--t-092211)] hover:bg-[color:var(--t-0e2c14)] border border-[color:var(--t-22c55e)] text-xs text-[color:var(--t-22c55e)] transition-colors"
          >
            {t.manual.gotIt}
          </button>
        </div>
      </div>
    </div>
  );
};
