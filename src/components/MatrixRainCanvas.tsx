import React, { useEffect, useRef } from 'react';
import { AccentThemeId, themeColor } from '../theme/themes';

interface MatrixRainCanvasProps {
  opacity?: number;
  enabled?: boolean;
  accentTheme?: AccentThemeId;
}

// Katakana de meia largura, dígitos e símbolos (como o `cmatrix -c`).
const GLYPHS = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEF:・."=*+-<>¦｜'.split('');
const FPS = 30;
const REDUCED_MOTION_FPS = 4;
const MAX_DPR = 2;
/** Células visíveis que trocam de caractere por frame (o "cintilar" do cmatrix). */
const MUTATIONS_PER_FRAME_RATIO = 0.004;
/** Fração final do fio desenhada em tom apagado. */
const DIM_TAIL_RATIO = 0.35;

// Linhas do atlas
const HEAD = 0;
const BODY = 1;
const DIM = 2;

interface Stream {
  /** Posição da cabeça em células (fracionária; a linha é Math.floor). */
  head: number;
  /** Células por frame (sempre <= 1, então a cabeça desce no máximo uma linha). */
  speed: number;
  length: number;
  /** Frames de espera antes de começar a cair. */
  delay: number;
}

/**
 * Pré-renderiza todos os caracteres uma vez num canvas fora da tela, uma linha
 * por estilo (cabeça, corpo e cauda apagada). Cada desenho vira um drawImage barato.
 */
function buildAtlas(cell: number, head: string, body: string): HTMLCanvasElement {
  const atlas = document.createElement('canvas');
  atlas.width = GLYPHS.length * cell;
  atlas.height = 3 * cell;
  const ctx = atlas.getContext('2d')!;
  ctx.font = `${Math.round(cell * 0.85)}px "JetBrains Mono", "Fira Code", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const styles: Array<[string, number, number]> = [
    [head, 1, cell * 0.45], // HEAD: claro e com brilho
    [body, 1, 0], // BODY
    [body, 0.35, 0], // DIM
  ];
  styles.forEach(([color, alpha, blur], row) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = body;
    ctx.shadowBlur = blur;
    GLYPHS.forEach((g, i) => ctx.fillText(g, i * cell + cell / 2, row * cell + cell / 2));
  });
  return atlas;
}

/**
 * Chuva digital no estilo cmatrix. Em vez de redesenhar a tela inteira a cada
 * frame, só as células que mudam são atualizadas: a nova cabeça, a cabeça
 * anterior (vira corpo), a célula que entra na cauda apagada e a que sai do fio.
 */
export const MatrixRainCanvas: React.FC<MatrixRainCanvasProps> = ({
  opacity = 0.4,
  enabled = true,
  accentTheme = 'matrix',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const headColor = themeColor('dcfce7', accentTheme);
    const bodyColor = themeColor('22c55e', accentTheme);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let cell = 0;
    let cols = 0;
    let rows = 0;
    let atlas: HTMLCanvasElement;
    let grid: Uint8Array; // caractere de cada célula
    let streams: Stream[] = [];

    const randomGlyph = () => (Math.random() * GLYPHS.length) | 0;
    const dimFrom = (s: Stream) => Math.max(1, Math.floor(s.length * (1 - DIM_TAIL_RATIO)));
    const newStream = (initial: boolean): Stream => ({
      // No início, parte dos fios já nasce no meio da tela para não abrir vazia.
      head: initial ? Math.random() * rows * 1.5 - rows * 0.5 : -1,
      speed: 0.3 + Math.random() * 0.7,
      length: 6 + ((Math.random() * Math.max(8, rows * 0.6)) | 0),
      delay: initial ? 0 : (Math.random() * 45) | 0,
    });

    const drawCell = (c: number, r: number, style: number) => {
      if (r < 0 || r >= rows) return;
      const x = c * cell;
      const y = r * cell;
      ctx.clearRect(x, y, cell, cell);
      ctx.drawImage(atlas, grid[r * cols + c] * cell, style * cell, cell, cell, x, y, cell, cell);
    };
    const clearCell = (c: number, r: number) => {
      if (r < 0 || r >= rows) return;
      ctx.clearRect(c * cell, r * cell, cell, cell);
    };

    /** Estilo atual de uma célula, ou -1 se estiver fora do fio. */
    const styleAt = (c: number, r: number): number => {
      const s = streams[c];
      const k = Math.floor(s.head) - r;
      if (s.delay > 0 || k < 0 || k >= s.length) return -1;
      return k === 0 ? HEAD : k >= dimFrom(s) ? DIM : BODY;
    };

    const redrawAll = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const style = styleAt(c, r);
          if (style >= 0) drawCell(c, r, style);
        }
      }
    };

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      cell = Math.round((window.innerWidth < 640 ? 14 : 16) * dpr);
      canvas.width = Math.ceil(window.innerWidth * dpr);
      canvas.height = Math.ceil(window.innerHeight * dpr);
      cols = Math.ceil(canvas.width / cell);
      rows = Math.ceil(canvas.height / cell);
      atlas = buildAtlas(cell, headColor, bodyColor);
      grid = new Uint8Array(cols * rows);
      for (let i = 0; i < grid.length; i++) grid[i] = randomGlyph();
      streams = Array.from({ length: cols }, () => newStream(true));
      redrawAll();
    };

    const step = () => {
      for (let c = 0; c < cols; c++) {
        const s = streams[c];
        if (s.delay > 0) {
          s.delay--;
          continue;
        }
        const prevRow = Math.floor(s.head);
        s.head += s.speed;
        const row = Math.floor(s.head);
        if (row === prevRow) continue; // ainda na mesma linha: nada muda

        if (row >= 0 && row < rows) grid[row * cols + c] = randomGlyph();
        drawCell(c, row, HEAD);
        drawCell(c, prevRow, dimFrom(s) <= 1 ? DIM : BODY);
        drawCell(c, row - dimFrom(s), DIM);
        clearCell(c, row - s.length);

        if (row - s.length >= rows) streams[c] = newStream(false);
      }

      // Cintilar: troca alguns caracteres visíveis, preservando o estilo da célula.
      const mutations = Math.max(1, Math.round(cols * rows * MUTATIONS_PER_FRAME_RATIO));
      for (let i = 0; i < mutations; i++) {
        const c = (Math.random() * cols) | 0;
        const r = (Math.random() * rows) | 0;
        const style = styleAt(c, r);
        if (style < 0) continue;
        grid[r * cols + c] = randomGlyph();
        drawCell(c, r, style);
      }
    };

    setup();

    let frameId = 0;
    let last = 0;
    const loop = (now: number) => {
      frameId = requestAnimationFrame(loop);
      const interval = 1000 / (reducedMotion.matches ? REDUCED_MOTION_FPS : FPS);
      if (now - last < interval) return;
      last = now;
      step();
    };
    frameId = requestAnimationFrame(loop);

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(setup, 150);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [enabled, accentTheme]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-700 z-0"
      style={{ opacity }}
    />
  );
};
