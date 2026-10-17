import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ProjectAttachment } from '../types';
import { BUCKET_NAME } from './storageService';
import { getT } from '../i18n';

// Com o bucket privado, os arquivos só abrem por URLs assinadas e temporárias,
// geradas para o usuário logado (dono da pasta). Funciona também com bucket público.
const SIGNED_URL_TTL_S = 60 * 60; // 1 hora
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // renova 5 min antes de expirar

const cache = new Map<string, { url: string; expiresAt: number }>();

/** Traduz erros do Supabase Storage em instruções para o usuário. */
export function storageErrorHint(message: string): string {
  if (/bucket not found|nosuchbucket/i.test(message)) {
    return getT().storage.bucketMissing;
  }
  if (/row-level security|unauthorized|not authorized|permission|403/i.test(message)) {
    return getT().storage.noPermission;
  }
  return message;
}

/** Gera um link assinado na hora (ex.: botão Baixar). Lança erro com mensagem amigável. */
export async function createSignedUrlNow(path: string, downloadName?: string): Promise<string> {
  if (!supabase || !isSupabaseConfigured) throw new Error(getT().storage.notConfigured);
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 60, downloadName ? { download: downloadName } : undefined);
  if (error || !data?.signedUrl) throw new Error(storageErrorHint(error?.message || getT().storage.linkFailed));
  return data.signedUrl;
}

async function signPaths(paths: string[]): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured || paths.length === 0) return null;
  const now = Date.now();
  const missing = paths.filter((p) => (cache.get(p)?.expiresAt ?? 0) - REFRESH_MARGIN_MS <= now);
  if (missing.length === 0) return null;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrls(missing, SIGNED_URL_TTL_S);
  if (error || !data) {
    console.warn('[Storage] Falha ao gerar URLs assinadas:', error?.message);
    return error?.message || getT().storage.signFailed;
  }
  let itemError: string | null = null;
  data.forEach((item, i) => {
    // A API devolve os itens na mesma ordem dos caminhos pedidos.
    const path = item.path || missing[i];
    if (item.signedUrl && !item.error) {
      cache.set(path, { url: item.signedUrl, expiresAt: now + SIGNED_URL_TTL_S * 1000 });
    } else if (item.error) {
      itemError = item.error;
    }
  });
  return itemError;
}

/**
 * Retorna a URL utilizável de cada anexo (por id): URL assinada para arquivos
 * no Storage, ou a própria `url` (data: local ou URL pública antiga) como reserva.
 */
export function useAttachmentUrls(
  attachments: ProjectAttachment[],
  userId?: string | null
): { urls: Record<string, string>; error: string | null } {
  const paths = attachments.map((a) => a.storagePath).filter((p): p is string => Boolean(p));
  const pathsKey = paths.join('|');
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || paths.length === 0) return;
    let cancelled = false;
    const run = () =>
      signPaths(paths).then((err) => {
        if (cancelled) return;
        setError(err ? storageErrorHint(err) : null);
        setVersion((v) => v + 1);
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
  return { urls, error };
}
