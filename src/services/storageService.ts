import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ProjectAttachment, AttachmentType } from '../types';

export const BUCKET_NAME = 'project-attachments';

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
            upsert: true,
          });

        if (!uploadError) {
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
          console.warn('[Supabase Storage] Fallback to local DataURL:', uploadError.message);
        }
      } catch (err: any) {
        console.warn('[Supabase Storage] Upload error, falling back to local:', err?.message);
      }
    }

    // Local / Offline fallback (read as DataURL)
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
