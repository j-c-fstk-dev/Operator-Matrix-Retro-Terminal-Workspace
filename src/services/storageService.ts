import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ProjectAttachment, AttachmentType } from '../types';

export const BUCKET_NAME = 'project-attachments';

/** Limite por arquivo na nuvem (o plano grátis do Supabase aceita até 50 MB). */
export const MAX_CLOUD_FILE_BYTES = 50 * 1024 * 1024;
/** Limite por arquivo salvo só no aparelho (localStorage tem poucos MB no total). */
export const MAX_LOCAL_FILE_BYTES = 2 * 1024 * 1024;

import { getT } from '../i18n';

export class AttachmentTooLargeError extends Error {}

let lastCloudError: string | null = null;
/** Último erro do Storage ao enviar arquivos (para explicar por que caiu no modo local). */
export const getLastCloudError = () => lastCloudError;

/** Valida o tamanho antes de enviar; lança erro com mensagem pronta para o usuário. */
export function assertFileSize(size: number, cloud: boolean): void {
  if (size > MAX_CLOUD_FILE_BYTES) {
    throw new AttachmentTooLargeError(getT().storage.tooLargeCloud(formatBytes(size), formatBytes(MAX_CLOUD_FILE_BYTES)));
  }
  if (!cloud && size > MAX_LOCAL_FILE_BYTES) {
    throw new AttachmentTooLargeError(
      getT().storage.tooLargeLocal(formatBytes(size), formatBytes(MAX_LOCAL_FILE_BYTES))
    );
  }
}

export function detectAttachmentType(file: File | { name: string; type?: string }): AttachmentType {
  const name = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();
  const ext = name.split('.').pop() || '';

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
    return 'image';
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(ext)) {
    return 'video';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    ['js', 'jsx', 'ts', 'tsx', 'py', 'json', 'html', 'css', 'scss', 'sh', 'bash', 'sql', 'rs', 'go', 'c', 'cpp', 'h', 'java', 'yaml', 'yml', 'toml', 'xml', 'dockerfile'].includes(ext) ||
    name === 'dockerfile' ||
    name === 'makefile'
  ) {
    return 'code';
  }
  if (mime.startsWith('text/') || ['txt', 'md', 'csv', 'log', 'rtf'].includes(ext)) {
    return 'text';
  }
  if (['zip', 'tar', 'gz', '7z', 'rar', 'bz2'].includes(ext)) {
    return 'archive';
  }
  return 'other';
}

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

export const storageService = {
  async uploadFile(
    file: File,
    projectId: string,
    userId?: string | null
  ): Promise<ProjectAttachment> {
    const canUseCloud = Boolean(userId && supabase && isSupabaseConfigured);
    assertFileSize(file.size, canUseCloud);
    const fileType = detectAttachmentType(file);
    const attachmentId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Read text content for code and text files for inline preview
    let textContent: string | undefined;
    if (fileType === 'code' || fileType === 'text') {
      try {
        textContent = await readFileAsText(file);
      } catch {
        // ignore
      }
    }

    // Try Supabase Storage if authenticated and configured
    if (userId && supabase && isSupabaseConfigured) {
      const cleanName = sanitizeFileName(file.name);
      const storagePath = `${userId}/${projectId}/${Date.now()}_${cleanName}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (!uploadError) {
          lastCloudError = null;
          const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
          return {
            id: attachmentId,
            name: file.name,
            type: fileType,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            url: data.publicUrl,
            storagePath,
            createdAt: Date.now(),
            textContent,
          };
        } else {
          lastCloudError = uploadError.message;
          console.warn('[Supabase Storage] Fallback to local DataURL:', uploadError.message);
        }
      } catch (err: any) {
        lastCloudError = err?.message || getT().storage.networkError;
        console.warn('[Supabase Storage] Upload error, falling back to local:', err?.message);
      }
    }

    // Local / Offline fallback (read as DataURL)
    if (canUseCloud && file.size > MAX_LOCAL_FILE_BYTES) {
      throw new AttachmentTooLargeError(
        getT().storage.uploadFailedTooLarge(formatBytes(file.size))
      );
    }
    assertFileSize(file.size, false);
    const dataUrl = await readFileAsDataURL(file);
    return {
      id: attachmentId,
      name: file.name,
      type: fileType,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      url: dataUrl,
      createdAt: Date.now(),
      textContent,
    };
  },

  async syncLocalAttachmentToCloud(
    attachment: ProjectAttachment,
    projectId: string,
    userId: string
  ): Promise<ProjectAttachment> {
    if (!attachment.url.startsWith('data:') || !supabase || !isSupabaseConfigured) {
      return attachment;
    }

    try {
      const arr = attachment.url.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || attachment.mimeType || 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });

      const cleanName = sanitizeFileName(attachment.name);
      const storagePath = `${userId}/${projectId}/${Date.now()}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: mime,
        });

      if (!uploadError) {
        lastCloudError = null;
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
        return {
          ...attachment,
          url: data.publicUrl,
          storagePath,
        };
      } else {
        lastCloudError = uploadError.message;
        console.warn('[Supabase Storage] sync error:', uploadError.message);
      }
    } catch (err) {
      lastCloudError = (err as Error)?.message || getT().storage.networkError;
      console.error('[Supabase Storage] sync exception:', err);
    }
    return attachment;
  },

  async deleteFile(attachment: ProjectAttachment): Promise<void> {
    if (attachment.storagePath && supabase && isSupabaseConfigured) {
      try {
        await supabase.storage.from(BUCKET_NAME).remove([attachment.storagePath]);
      } catch (err) {
        console.error('[Supabase Storage] Erro ao deletar arquivo:', err);
      }
    }
  },
};
