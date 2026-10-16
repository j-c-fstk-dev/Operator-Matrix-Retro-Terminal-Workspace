import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ProjectAttachment } from '../types';
import { BUCKET_NAME } from './storageService';

// Com o bucket privado, os arquivos só abrem por URLs assinadas e temporárias,
// geradas para o usuário logado (dono da pasta). Funciona também com bucket público.
const SIGNED_URL_TTL_S = 60 * 60; // 1 hora
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // renova 5 min antes de expirar

const cache = new Map<string, { url: string; expiresAt: number }>();

async function signPaths(paths: string[]): Promise<void> {
  if (!supabase || !isSupabaseConfigured || paths.length === 0) return;
  const now = Date.now();
  const missing = paths.filter((p) => (cache.get(p)?.expiresAt ?? 0) - REFRESH_MARGIN_MS <= now);
  if (missing.length === 0) return;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrls(missing, SIGNED_URL_TTL_S);
  if (error || !data) {
    console.warn('[Storage] Falha ao gerar URLs assinadas:', error?.message);
    return;
  }
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) {
      cache.set(item.path, { url: item.signedUrl, expiresAt: now + SIGNED_URL_TTL_S * 1000 });
    }
  }
}

/**
 * Retorna a URL utilizável de cada anexo (por id): URL assinada para arquivos
 * no Storage, ou a própria `url` (data: local ou URL pública antiga) como reserva.
 */
export function useAttachmentUrls(attachments: ProjectAttachment[], userId?: string | null): Record<string, string> {
  const paths = attachments.map((a) => a.storagePath).filter((p): p is string => Boolean(p));
  const pathsKey = paths.join('|');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId || paths.length === 0) return;
    let cancelled = false;
    const run = () =>
      signPaths(paths).then(() => {
        if (!cancelled) setVersion((v) => v + 1);
      });
    run();
    const timer = setInterval(run, (SIGNED_URL_TTL_S * 1000) - REFRESH_MARGIN_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey, userId]);

  void version;
  const urls: Record<string, string> = {};
  for (const att of attachments) {
    urls[att.id] = (att.storagePath && cache.get(att.storagePath)?.url) || att.url;
  }
  return urls;
}
