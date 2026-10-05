export interface TagStyle {
  border: string;
  text: string;
  bg: string;
}

const TERMINAL_TAG_PALETTES: TagStyle[] = [
  {
    border: 'border-emerald-700/60 hover:border-emerald-500',
    text: 'text-emerald-400',
    bg: 'bg-emerald-950/40',
  },
  {
    border: 'border-cyan-700/60 hover:border-cyan-500',
    text: 'text-cyan-400',
    bg: 'bg-cyan-950/40',
  },
  {
    border: 'border-amber-700/60 hover:border-amber-500',
    text: 'text-amber-400',
    bg: 'bg-amber-950/40',
  },
  {
    border: 'border-purple-700/60 hover:border-purple-500',
    text: 'text-purple-400',
    bg: 'bg-purple-950/40',
  },
  {
    border: 'border-lime-700/60 hover:border-lime-500',
    text: 'text-lime-400',
    bg: 'bg-lime-950/40',
  },
  {
    border: 'border-sky-700/60 hover:border-sky-500',
    text: 'text-sky-400',
    bg: 'bg-sky-950/40',
  },
  {
    border: 'border-rose-700/60 hover:border-rose-500',
    text: 'text-rose-400',
    bg: 'bg-rose-950/40',
  },
  {
    border: 'border-teal-700/60 hover:border-teal-500',
    text: 'text-teal-400',
    bg: 'bg-teal-950/40',
  },
  {
    border: 'border-orange-700/60 hover:border-orange-500',
    text: 'text-orange-400',
    bg: 'bg-orange-950/40',
  },
];

export function getTerminalTagStyle(tag: string): TagStyle {
  const cleanTag = tag.trim().toLowerCase();
  
  // Specific semantic overrides
  if (['security', 'auth', 'vpn', 'token'].includes(cleanTag)) {
    return TERMINAL_TAG_PALETTES[3]; // Purple
  }
  if (['bug', 'critical', 'crit', 'hotfix'].includes(cleanTag)) {
    return TERMINAL_TAG_PALETTES[6]; // Rose
  }
  if (['perf', 'performance', 'memory', 'cache'].includes(cleanTag)) {
    return TERMINAL_TAG_PALETTES[2]; // Amber
  }
  if (['network', 'ws', 'websocket', 'api', 'http'].includes(cleanTag)) {
    return TERMINAL_TAG_PALETTES[1]; // Cyan
  }
  if (['infra', 'docker', 'linux', 'arch', 'dns'].includes(cleanTag)) {
    return TERMINAL_TAG_PALETTES[5]; // Sky
  }
  if (['test', 'autocannon', 'benchmark'].includes(cleanTag)) {
    return TERMINAL_TAG_PALETTES[4]; // Lime
  }

  // Deterministic string hash for any user-defined tag
  let hash = 0;
  for (let i = 0; i < cleanTag.length; i++) {
    hash = (hash << 5) - hash + cleanTag.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % TERMINAL_TAG_PALETTES.length;
  return TERMINAL_TAG_PALETTES[index];
}
