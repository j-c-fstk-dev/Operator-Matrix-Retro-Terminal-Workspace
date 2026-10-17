// Gera config.js a partir das variáveis de ambiente do Netlify.
// As mesmas variáveis do app: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
// (a chave anon é pública por design; a tabela waitlist só aceita INSERT).
import { readFileSync, writeFileSync } from 'node:fs';

const config = {
  supabaseUrl: (process.env.VITE_SUPABASE_URL || '').trim(),
  supabaseAnonKey: (process.env.VITE_SUPABASE_ANON_KEY || '').trim(),
  appUrl: (process.env.APP_URL || 'https://matrix-operator.netlify.app').trim(),
};

writeFileSync(new URL('./config.js', import.meta.url), `window.OPERATOR_CONFIG = ${JSON.stringify(config)};\n`);
console.log(`config.js gerado (Supabase ${config.supabaseUrl ? 'configurado' : 'ausente: a lista de espera fica desligada'}).`);

// Redes sociais exigem URL absoluta na og:image. O Netlify define URL com o endereço do site.
const siteUrl = (process.env.URL || '').replace(/\/$/, '');
if (siteUrl) {
  const indexPath = new URL('./index.html', import.meta.url);
  const html = readFileSync(indexPath, 'utf8').replace('content="media/og.png"', `content="${siteUrl}/media/og.png"`);
  writeFileSync(indexPath, html);
  console.log(`og:image apontando para ${siteUrl}/media/og.png`);
}
