// Roda no build do Netlify (ver netlify.toml).
// 1. Gera config.js a partir das variáveis de ambiente: as mesmas do app,
//    VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (a chave anon é pública por design;
//    a tabela waitlist só aceita INSERT).
// 2. Troca __SITE__ pelo endereço do site nas páginas: redes sociais e buscadores
//    exigem URL absoluta em og:image e hreflang. O Netlify define URL sozinho.
import { readFileSync, writeFileSync } from 'node:fs';

const config = {
  supabaseUrl: (process.env.VITE_SUPABASE_URL || '').trim(),
  supabaseAnonKey: (process.env.VITE_SUPABASE_ANON_KEY || '').trim(),
  appUrl: (process.env.APP_URL || 'https://matrix-operator.netlify.app').trim(),
};
writeFileSync(new URL('./config.js', import.meta.url), `window.OPERATOR_CONFIG = ${JSON.stringify(config)};\n`);
console.log(`config.js gerado (Supabase ${config.supabaseUrl ? 'configurado' : 'ausente: a lista de espera fica desligada'}).`);

const siteUrl = (process.env.URL || '').replace(/\/$/, '');
for (const page of ['index.html', 'privacy.html', 'pt/index.html', 'pt/privacidade.html']) {
  const path = new URL(`./${page}`, import.meta.url);
  writeFileSync(path, readFileSync(path, 'utf8').replaceAll('__SITE__', siteUrl));
}
console.log(`Endereço do site nas páginas: ${siteUrl || '(relativo, URL não definida)'}`);
