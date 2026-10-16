import { BASE_PALETTE } from './basePalette';

export type AccentThemeId = 'matrix' | 'aqua' | 'blue' | 'purple' | 'pink' | 'red' | 'amber' | 'mono';

export interface AccentTheme {
  id: AccentThemeId;
  label: string;
  /** Matiz alvo em OKLCH (graus). null = mantém as cores originais. */
  hue: number | null;
  /** Multiplicador de croma (0 = escala de cinza). */
  chroma: number;
}

export const ACCENT_THEMES: AccentTheme[] = [
  { id: 'matrix', label: 'Matrix', hue: null, chroma: 1 },
  { id: 'aqua', label: 'Verde-água', hue: 190, chroma: 1 },
  { id: 'blue', label: 'Azul Profundo', hue: 258, chroma: 1.1 },
  { id: 'purple', label: 'Roxo', hue: 302, chroma: 1.1 },
  { id: 'pink', label: 'Rosa Neon', hue: 350, chroma: 1 },
  { id: 'red', label: 'Vermelho', hue: 25, chroma: 1 },
  { id: 'amber', label: 'Âmbar', hue: 70, chroma: 1 },
  { id: 'mono', label: 'Mono', hue: 150, chroma: 0 },
];

export const DEFAULT_ACCENT_THEME: AccentThemeId = 'matrix';

// Matiz OKLCH do verde principal (#22c55e); os demais tons giram mantendo a diferença relativa.
const BASE_HUE = 149.6;

// ---------- Conversões sRGB <-> OKLCH ----------
type Vec3 = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function hexToOklch(hex: string): Vec3 {
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

function oklchToLinearRgb([L, C, H]: Vec3): Vec3 {
  const hr = (H * Math.PI) / 180;
  const A = C * Math.cos(hr);
  const B = C * Math.sin(hr);
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: Vec3) => rgb.every((c) => c >= -0.0005 && c <= 1.0005);

function oklchToHex(lch: Vec3): string {
  // Reduz o croma até a cor caber no sRGB, preservando luminosidade e matiz.
  let [L, C, H] = lch;
  if (!inGamut(oklchToLinearRgb([L, C, H]))) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinearRgb([L, mid, H]))) lo = mid;
      else hi = mid;
    }
    C = lo;
  }
  return oklchToLinearRgb([L, C, H])
    .map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255).toString(16).padStart(2, '0'))
    .join('');
}

/** Converte uma cor da paleta base (hex sem #) para o tema informado. */
export function themeColor(hex: string, themeId: AccentThemeId): string {
  const theme = ACCENT_THEMES.find((t) => t.id === themeId);
  if (!theme || theme.hue === null) return `#${hex}`;
  const [L, C, H] = hexToOklch(hex);
  return `#${oklchToHex([L, C * theme.chroma, (H + theme.hue - BASE_HUE + 360) % 360])}`;
}

export function resolveAccentTheme(id: string | undefined): AccentThemeId {
  return ACCENT_THEMES.some((t) => t.id === id) ? (id as AccentThemeId) : DEFAULT_ACCENT_THEME;
}

/** Aplica o tema definindo as variáveis --t-<hex> no :root. */
export function applyAccentTheme(themeId: AccentThemeId): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  for (const hex of BASE_PALETTE) {
    if (themeId === 'matrix') root.removeProperty(`--t-${hex}`);
    else root.setProperty(`--t-${hex}`, themeColor(hex, themeId));
  }
  root.setProperty('color-scheme', 'dark');
  // Barra de status do celular acompanha o fundo do tema.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor('030704', themeId));
  document.documentElement.dataset.accent = themeId;
}
