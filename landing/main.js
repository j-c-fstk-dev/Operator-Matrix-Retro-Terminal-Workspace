// Operator: landing page. Sem dependências.
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const CONFIG = window.OPERATOR_CONFIG || {};
const APP_URL = CONFIG.appUrl || 'https://matrix-operator.netlify.app';
const motionOK = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ======================================================================
   Temas: mesma conversão OKLCH do app (src/theme/themes.ts)
   ====================================================================== */
const THEMES = {
  matrix: { label: 'Matrix', hue: null, chroma: 1 },
  aqua: { label: 'Verde-água', hue: 190, chroma: 1 },
  blue: { label: 'Azul Profundo', hue: 258, chroma: 1.1 },
  purple: { label: 'Roxo', hue: 302, chroma: 1.1 },
  pink: { label: 'Rosa Neon', hue: 350, chroma: 1 },
  red: { label: 'Vermelho', hue: 25, chroma: 1 },
  amber: { label: 'Âmbar', hue: 70, chroma: 1 },
  mono: { label: 'Mono', hue: 150, chroma: 0 },
};
const THEME_ALIASES = {
  matrix: 'matrix', verde: 'matrix', green: 'matrix',
  aqua: 'aqua', agua: 'aqua', 'água': 'aqua', 'verde-agua': 'aqua', 'verde-água': 'aqua',
  azul: 'blue', blue: 'blue',
  roxo: 'purple', purple: 'purple',
  rosa: 'pink', pink: 'pink',
  vermelho: 'red', red: 'red',
  ambar: 'amber', 'âmbar': 'amber', amber: 'amber',
  mono: 'mono', cinza: 'mono',
};
const BASE_HUE = 149.6;
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklch(hex) {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
function oklchToLinear([L, C, H]) {
  const hr = (H * Math.PI) / 180;
  const A = C * Math.cos(hr);
  const B = C * Math.sin(hr);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const inGamut = (rgb) => rgb.every((c) => c >= -0.0005 && c <= 1.0005);
function oklchToHex([L, C, H]) {
  if (!inGamut(oklchToLinear([L, C, H]))) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear([L, mid, H]))) lo = mid;
      else hi = mid;
    }
    C = lo;
  }
  return oklchToLinear([L, C, H])
    .map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255).toString(16).padStart(2, '0')) // taste-skill-ignore: conversão de cor para hex
    .join('');
}
function themeColor(hex, id) {
  const t = THEMES[id];
  if (!t || t.hue === null) return `#${hex}`;
  const [L, C, H] = hexToOklch(hex);
  return `#${oklchToHex([L, C * t.chroma, (H + t.hue - BASE_HUE + 360) % 360])}`;
}

const TOKENS = {
  '--bg': '030704', '--surface': '071008', '--surface-2': '0b1a0e', '--field': '0e2c14', '--line': '14351a',
  '--ink': '86efac', '--ink-strong': 'dcfce7', '--muted': '4f9a6a', '--accent': '22c55e', '--accent-strong': '4ade80', '--accent-ink': '03140a',
};
let currentTheme = 'matrix';
function applyTheme(id) {
  currentTheme = id;
  const root = document.documentElement.style;
  for (const [name, hex] of Object.entries(TOKENS)) {
    if (id === 'matrix') root.removeProperty(name);
    else root.setProperty(name, themeColor(hex, id));
  }
  $('meta[name="theme-color"]')?.setAttribute('content', themeColor('030704', id));
  rain.recolor();
}

/* ======================================================================
   Som (Web Audio, como no app)
   ====================================================================== */
const sound = {
  enabled: false,
  ctx: null,
  click(freq = 720) {
    if (!this.enabled) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch {
      // sem Web Audio: segue em silêncio
    }
  },
};

/* ======================================================================
   Chuva digital estilo cmatrix (mesmo algoritmo do app)
   ====================================================================== */
const rain = (() => {
  const canvas = $('#rain');
  const ctx = canvas?.getContext('2d');
  const GLYPHS = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEF:・."=*+-<>¦｜'.split('');
  const HEAD = 0, BODY = 1, DIM = 2;
  let cell = 0, cols = 0, rows = 0, atlas = null, grid = null, streams = [];
  let frame = 0, last = 0, running = false;

  const rnd = () => (Math.random() * GLYPHS.length) | 0;
  const dimFrom = (s) => Math.max(1, Math.floor(s.length * 0.65));
  const newStream = (initial) => ({
    head: initial ? Math.random() * rows * 1.5 - rows * 0.5 : -1,
    speed: 0.3 + Math.random() * 0.7,
    length: 6 + ((Math.random() * Math.max(8, rows * 0.6)) | 0),
    delay: initial ? 0 : (Math.random() * 45) | 0,
  });

  function buildAtlas() {
    const head = themeColor('dcfce7', currentTheme);
    const body = themeColor('22c55e', currentTheme);
    atlas = document.createElement('canvas');
    atlas.width = GLYPHS.length * cell;
    atlas.height = 3 * cell;
    const a = atlas.getContext('2d');
    a.font = `${Math.round(cell * 0.85)}px "JetBrains Mono", monospace`; // taste-skill-ignore: chuva do app, fonte da marca
    a.textAlign = 'center';
    a.textBaseline = 'middle';
    [[head, 1, cell * 0.45], [body, 1, 0], [body, 0.35, 0]].forEach(([color, alpha, blur], row) => {
      a.fillStyle = color; a.globalAlpha = alpha; a.shadowColor = body; a.shadowBlur = blur;
      GLYPHS.forEach((g, i) => a.fillText(g, i * cell + cell / 2, row * cell + cell / 2));
    });
  }
  function drawCell(c, r, style) {
    if (r < 0 || r >= rows) return;
    ctx.clearRect(c * cell, r * cell, cell, cell);
    ctx.drawImage(atlas, grid[r * cols + c] * cell, style * cell, cell, cell, c * cell, r * cell, cell, cell);
  }
  function clearCell(c, r) { if (r >= 0 && r < rows) ctx.clearRect(c * cell, r * cell, cell, cell); }
  function styleAt(c, r) {
    const s = streams[c];
    const k = Math.floor(s.head) - r;
    if (s.delay > 0 || k < 0 || k >= s.length) return -1;
    return k === 0 ? HEAD : k >= dimFrom(s) ? DIM : BODY;
  }
  function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const st = styleAt(c, r); if (st >= 0) drawCell(c, r, st); }
  }
  function setup() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cell = Math.round((window.innerWidth < 640 ? 14 : 16) * dpr);
    canvas.width = Math.ceil(window.innerWidth * dpr);
    canvas.height = Math.ceil(window.innerHeight * dpr);
    cols = Math.ceil(canvas.width / cell);
    rows = Math.ceil(canvas.height / cell);
    buildAtlas();
    grid = new Uint8Array(cols * rows);
    for (let i = 0; i < grid.length; i++) grid[i] = rnd();
    streams = Array.from({ length: cols }, () => newStream(true));
    redrawAll();
  }
  function step() {
    for (let c = 0; c < cols; c++) {
      const s = streams[c];
      if (s.delay > 0) { s.delay--; continue; }
      const prev = Math.floor(s.head);
      s.head += s.speed;
      const row = Math.floor(s.head);
      if (row === prev) continue;
      if (row >= 0 && row < rows) grid[row * cols + c] = rnd();
      drawCell(c, row, HEAD);
      drawCell(c, prev, dimFrom(s) <= 1 ? DIM : BODY);
      drawCell(c, row - dimFrom(s), DIM);
      clearCell(c, row - s.length);
      if (row - s.length >= rows) streams[c] = newStream(false);
    }
    const n = Math.max(1, Math.round(cols * rows * 0.004));
    for (let i = 0; i < n; i++) {
      const c = (Math.random() * cols) | 0;
      const r = (Math.random() * rows) | 0;
      const st = styleAt(c, r);
      if (st < 0) continue;
      grid[r * cols + c] = rnd();
      drawCell(c, r, st);
    }
  }
  function loop(now) {
    if (!running) return;
    frame = requestAnimationFrame(loop);
    const interval = 1000 / (motionOK() ? 30 : 4);
    if (now - last < interval) return;
    last = now;
    step();
  }
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (running) setup(); }, 150);
  });
  return {
    start() {
      if (!ctx || running) return;
      running = true;
      canvas.hidden = false;
      setup();
      frame = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      if (canvas) canvas.hidden = true;
    },
    toggle(on) { (on ?? !running) ? this.start() : this.stop(); return running; },
    recolor() { if (running) { buildAtlas(); redrawAll(); } },
    get on() { return running; },
  };
})();

/* ======================================================================
   Prompt Ctrl+K que funciona
   ====================================================================== */
const demo = {
  project: 'lancamento-beta',
  tasks: [
    { text: 'Revisar landing page', tag: 'marketing', done: false },
    { text: 'Gravar demo de 30s', tag: 'video', done: false },
    { text: 'Configurar Supabase', tag: 'infra', done: true },
  ],
};
const TAG_CLASSES = new Set(['marketing', 'video', 'infra', 'beta', 'casa']);

function renderTasks() {
  const ul = document.createElement('ul');
  ul.className = 'cmd__tasks';
  for (const t of demo.tasks.slice(-5)) {
    const li = document.createElement('li');
    if (t.done) li.className = 'is-done';
    const box = document.createElement('span');
    box.setAttribute('aria-hidden', 'true');
    box.textContent = t.done ? '[x]' : '[ ]';
    li.append(box, ` ${t.text} `);
    if (t.tag) {
      const tag = document.createElement('span');
      tag.className = `tag tag--${TAG_CLASSES.has(t.tag) ? t.tag : 'casa'}`;
      tag.textContent = `#${t.tag}`;
      li.append(tag);
    }
    ul.append(li);
  }
  return ul;
}

function runCommand(raw) {
  const input = raw.trim();
  const lower = input.toLowerCase();
  const lines = [];
  const say = (text, kind) => lines.push({ text, kind });

  if (!input) return null;
  if (lower === 'help' || lower === 'man' || lower === '?') {
    say('Comandos desta demonstração:');
    say('  git status          resumo do projeto');
    say('  + tarefa #tag        cria uma tarefa');
    say('  git init <nome>      cria um projeto');
    say('  theme <cor>          matrix, agua, azul, roxo, rosa, vermelho, ambar, mono');
    say('  rain                 liga ou desliga a chuva');
    say('  clear                limpa a tela');
    return { lines };
  }
  if (lower === 'clear' || lower === 'cls') return { lines: [], clear: true };
  if (lower === 'git status' || lower === 'status') {
    const done = demo.tasks.filter((t) => t.done).length;
    say(`${demo.project}: ${done} de ${demo.tasks.length} tarefas feitas (${Math.round((done / demo.tasks.length) * 100)}%)`);
    return { lines, tasks: true };
  }
  if (input.startsWith('+') || lower.startsWith('task:')) {
    const body = input.startsWith('+') ? input.slice(1).trim() : input.slice(5).trim();
    if (!body) { say('Escreva a tarefa depois do +, por exemplo: + comprar café #casa', 'err'); return { lines }; }
    const tag = (body.match(/#([\p{L}\p{N}_-]+)/u) || [])[1]?.toLowerCase();
    const text = body.replace(/#[\p{L}\p{N}_-]+/gu, '').trim() || body;
    demo.tasks.push({ text, tag, done: false });
    say(`Tarefa criada em ${demo.project}.`, 'ok');
    return { lines, tasks: true };
  }
  if (lower.startsWith('git init') || lower.startsWith('new ')) {
    const name = input.replace(/^(git init|new)\s*/i, '').trim();
    if (!name) { say('Dê um nome ao projeto: git init meu-projeto', 'err'); return { lines }; }
    demo.project = name.toLowerCase().replace(/\s+/g, '-').slice(0, 40);
    demo.tasks = [];
    say(`Projeto ${demo.project} criado e aberto (git init).`, 'ok');
    return { lines };
  }
  if (lower.startsWith('theme') || lower.startsWith('tema')) {
    const arg = lower.split(/\s+/)[1];
    const id = THEME_ALIASES[arg];
    if (!id) { say('Cores: matrix, agua, azul, roxo, rosa, vermelho, ambar, mono. Exemplo: theme roxo', 'err'); return { lines }; }
    applyTheme(id);
    say(`Fósforo trocado para ${THEMES[id].label}. No app, a escolha fica em Preferências.`, 'ok');
    return { lines };
  }
  if (lower === 'rain' || lower === 'chuva') {
    const on = rain.toggle();
    setBand('rain', on);
    say(on ? 'Chuva ligada.' : 'Chuva desligada.', 'ok');
    return { lines };
  }
  if (lower === 'git commit' || lower === 'export' || lower === 'md') {
    say('No app, isso copia o projeto em Markdown para a área de transferência.', 'ok');
    return { lines };
  }
  if (lower === 'instalar' || lower === 'pwa' || lower === 'install') {
    say('No app, isso abre a instalação. Ele instala no Android, no iPhone e no desktop.', 'ok');
    return { lines };
  }
  if (lower === 'login' || lower === 'nuvem') {
    say('No app, isso abre o login com Google ou e-mail para sincronizar.', 'ok');
    return { lines };
  }
  say(`comando não encontrado: ${input.slice(0, 40)}. Digite help.`, 'err');
  return { lines };
}

function initPrompt() {
  const form = $('#cmd-form');
  const input = $('#cmd-input');
  const out = $('#cmd-out');
  if (!form || !input || !out) return;
  const history = [];
  let hIndex = -1;

  const exec = (cmd) => {
    const result = runCommand(cmd);
    if (!result) return;
    sound.click(result.lines.some((l) => l.kind === 'err') ? 240 : 760);
    history.unshift(cmd);
    hIndex = -1;
    out.replaceChildren();
    if (result.clear) return;
    const echo = document.createElement('p');
    echo.className = 'cmd__line cmd__line--echo';
    echo.textContent = `> ${cmd}`;
    out.append(echo);
    for (const l of result.lines) {
      const p = document.createElement('p');
      p.className = `cmd__line${l.kind ? ` cmd__line--${l.kind}` : ''}`;
      p.textContent = l.text;
      out.append(p);
    }
    if (result.tasks) out.append(renderTasks());
    out.scrollTop = 0;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value;
    input.value = '';
    exec(value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault();
      hIndex = Math.min(hIndex + 1, history.length - 1);
      input.value = history[hIndex];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hIndex = Math.max(hIndex - 1, -1);
      input.value = hIndex === -1 ? '' : history[hIndex];
    } else if (e.key === 'Escape') {
      input.blur();
    }
  });
  $$('[data-cmd]').forEach((b) => b.addEventListener('click', () => { exec(b.dataset.cmd); input.focus({ preventScroll: true }); }));

  // Ctrl+K / Cmd+K abre o prompt, como no app.
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: motionOK() ? 'smooth' : 'auto' });
      input.focus({ preventScroll: true });
    }
  });
}

/* ======================================================================
   Faixas com interruptores (efeitos reais nesta página)
   ====================================================================== */
const BAND_EFFECTS = {
  rain: (on) => rain.toggle(on),
  crt: (on) => { $('#scanlines').hidden = !on; },
  sound: (on) => { sound.enabled = on; },
  offline: (on) => { $('#offline-badge').classList.toggle('is-on', on); },
  sync: () => {},
};
function setBand(name, on) {
  const band = $(`.band[data-band="${name}"]`);
  if (!band) return;
  band.classList.toggle('is-on', on);
  band.querySelector('.switch')?.setAttribute('aria-checked', String(on));
}
function initBands() {
  for (const band of $$('.band')) {
    const theme = band.dataset.theme;
    band.style.setProperty('--band-bg', themeColor('0b2412', theme));
    band.style.setProperty('--band-ink', themeColor('dcfce7', theme));
    band.style.setProperty('--band-accent', themeColor('22c55e', theme));
    const sw = band.querySelector('.switch');
    sw?.addEventListener('click', () => {
      const on = sw.getAttribute('aria-checked') !== 'true';
      setBand(band.dataset.band, on);
      BAND_EFFECTS[band.dataset.band]?.(on);
      sound.click(on ? 880 : 440);
    });
  }
}

/* ======================================================================
   Tarefa viva, botões de copiar, links do app
   ====================================================================== */
function initTask() {
  const check = $('#live-check');
  const task = $('#live-task');
  check?.addEventListener('click', () => {
    const done = check.getAttribute('aria-checked') !== 'true';
    check.setAttribute('aria-checked', String(done));
    task.classList.toggle('is-done', done);
    sound.click(done ? 900 : 500);
  });
}
function initCopy() {
  for (const b of $$('[data-copy]')) {
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        b.textContent = 'Copiado';
      } catch {
        b.textContent = 'Selecione e copie';
      }
      sound.click(820);
      setTimeout(() => { b.textContent = 'Copiar'; }, 1600);
    });
  }
}
function initAppLinks() {
  $$('[data-app-link]').forEach((a) => { a.href = APP_URL; });
}

/* ======================================================================
   Carrossel fixo do hero (assinatura de movimento)
   ====================================================================== */
function initReel() {
  const hero = $('.hero');
  const track = $('#reel-track');
  if (!hero || !track) return;
  const frames = Array.from(track.children);
  const mq = window.matchMedia('(min-width: 1080px) and (prefers-reduced-motion: no-preference)');
  let stepPx = 0, frameH = 0, scrollable = 1, top = 0, ticking = false;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  function measure() {
    if (!mq.matches) { track.style.transform = ''; return; }
    frameH = frames[0].offsetHeight;
    stepPx = frameH + 24;
    top = hero.offsetTop;
    scrollable = Math.max(1, hero.offsetHeight - window.innerHeight);
    update();
  }
  function update() {
    ticking = false;
    if (!mq.matches) return;
    const p = Math.min(1, Math.max(0, (window.scrollY - top) / scrollable));
    const pos = p * (frames.length - 1);
    const i = Math.floor(pos);
    const f = pos - i;
    // Segura cada quadro e passa para o próximo com um movimento curto.
    const hold = 0.35;
    const moved = f < hold ? 0 : ease((f - hold) / (1 - hold));
    track.style.transform = `translate3d(0, ${-(i + moved) * stepPx - frameH / 2}px, 0)`;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', measure);
  mq.addEventListener('change', measure);
  if (document.fonts?.ready) document.fonts.ready.then(measure);
  measure();
}

/* ======================================================================
   Entradas ao rolar (uma vez)
   ====================================================================== */
function initReveal() {
  const items = $$('[data-reveal]');
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  items.forEach((el) => io.observe(el));
}

/* ======================================================================
   Lista de espera do Sync Pro (Supabase, só INSERT)
   ====================================================================== */
function initWaitlist() {
  const form = $('#waitlist');
  if (!form) return;
  const input = $('#email');
  const button = form.querySelector('.cta__submit');
  const status = $('#waitlist-status');
  const show = (msg, error = false) => { status.textContent = msg; status.classList.toggle('is-error', error); };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if ($('#site').value) { show('Pronto. Você está na fila do Sync Pro.'); form.reset(); return; }
    const email = input.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
      show('Esse e-mail parece incompleto. Confira e tente de novo.', true);
      input.focus();
      return;
    }
    if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
      show('A lista ainda não está ligada nesta cópia do site. Tente pela página oficial.', true);
      return;
    }
    button.setAttribute('aria-busy', 'true');
    button.disabled = true;
    try {
      const res = await fetch(`${CONFIG.supabaseUrl.replace(/\/$/, '')}/rest/v1/waitlist`, {
        method: 'POST',
        headers: {
          apikey: CONFIG.supabaseAnonKey,
          Authorization: `Bearer ${CONFIG.supabaseAnonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ email, source: 'landing', theme: currentTheme }),
      });
      if (res.ok) { show('Pronto. Você está na fila do Sync Pro.'); form.reset(); sound.click(980); }
      else if (res.status === 409) { show('Esse e-mail já está na fila. Nada mais a fazer.'); form.reset(); }
      else { show(`Não deu para salvar agora (erro ${res.status}). Tente de novo em instantes.`, true); }
    } catch {
      show('Sem conexão. Tente de novo quando a internet voltar.', true);
    } finally {
      button.removeAttribute('aria-busy');
      button.disabled = false;
    }
  });
}

/* ======================================================================
   Vídeo: só toca com movimento liberado, e sempre com botão de pausa
   ====================================================================== */
function initVideo() {
  const video = $('#demo-video');
  const button = $('#video-toggle');
  if (!video || !button) return;
  button.hidden = false;
  const sync = () => { button.textContent = video.paused ? 'Reproduzir' : 'Pausar'; };
  button.addEventListener('click', () => { (video.paused ? video.play() : Promise.resolve(video.pause())).catch(() => {}).finally(sync); });
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  if (motionOK()) video.play().catch(sync);
  sync();
}

/* ====================================================================== */
initAppLinks();
initVideo();
initPrompt();
initBands();
initTask();
initCopy();
initReel();
initReveal();
initWaitlist();
// Com "reduzir movimento", a chuva começa desligada (a faixa deixa religar).
if (!motionOK()) setBand('rain', false);
if ($('.band[data-band="rain"]')?.classList.contains('is-on')) rain.start();
