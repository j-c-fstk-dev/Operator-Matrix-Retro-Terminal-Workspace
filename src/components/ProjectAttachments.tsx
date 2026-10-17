import React, { useState, useRef } from 'react';
import { Project, ProjectAttachment, AttachmentType } from '../types';
import { storageService, formatBytes, getLastCloudError } from '../services/storageService';
import { useAttachmentUrls, createSignedUrlNow, storageErrorHint } from '../services/attachmentUrls';
import { sound } from '../utils/audio';
import { useT, useLang, localeOf } from '../i18n';
import { User } from '@supabase/supabase-js';
import {
  UploadCloud,
  FileText,
  FileCode,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  Trash2,
  ExternalLink,
  Download,
  Eye,
  Copy,
  Check,
  X,
  Plus,
  Maximize2,
  HardDrive,
  FileSpreadsheet
} from 'lucide-react';

interface ProjectAttachmentsProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  user?: User | null;
  onShowToast: (msg: string) => void;
}

export const ProjectAttachments: React.FC<ProjectAttachmentsProps> = ({
  project,
  onUpdateProject,
  user,
  onShowToast,
}) => {
  const t = useT();
  const lang = useLang();
  const [filterType, setFilterType] = useState<string>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [syncingLocal, setSyncingLocal] = useState(false);

  // Modal states
  const [viewingImage, setViewingImage] = useState<ProjectAttachment | null>(null);
  const [viewingCode, setViewingCode] = useState<ProjectAttachment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachments = project.attachments || [];
  const { urls: fileUrls, error: signError } = useAttachmentUrls(attachments, user?.id);

  // Baixa gerando um link assinado na hora (funciona com bucket privado e mostra o motivo se falhar).
  const handleDownload = async (e: React.MouseEvent, att: ProjectAttachment) => {
    if (!att.storagePath || !user) return; // arquivo local: o link data: já baixa direto
    e.preventDefault();
    try {
      const url = await createSignedUrlNow(att.storagePath, att.name);
      const a = document.createElement('a');
      a.href = url;
      a.rel = 'noopener';
      a.click();
    } catch (err: any) {
      onShowToast(`[ARQUIVO] ${err?.message || t.attachments.downloadFailed}`);
    }
  };
  const localAttachmentsCount = attachments.filter((a) => !a.url.startsWith('http')).length;

  // Filter attachments
  const filteredAttachments = attachments.filter((att) => {
    if (filterType === 'all') return true;
    if (filterType === 'images') return att.type === 'image';
    if (filterType === 'videos') return att.type === 'video';
    if (filterType === 'docs') return att.type === 'pdf';
    if (filterType === 'code') return att.type === 'code' || att.type === 'text';
    return true;
  });

  const totalBytes = attachments.reduce((sum, a) => sum + (a.size || 0), 0);

  const handleSyncLocalFilesToCloud = async () => {
    if (!user) {
      onShowToast(t.attachments.loginToSync);
      return;
    }
    setSyncingLocal(true);
    sound.playCommand();
    let updatedCount = 0;

    const nextAttachments = await Promise.all(
      attachments.map(async (att) => {
        if (att.url.startsWith('data:')) {
          const synced = await storageService.syncLocalAttachmentToCloud(att, project.id, user.id);
          if (synced.url.startsWith('http')) {
            updatedCount++;
          }
          return synced;
        }
        return att;
      })
    );

    if (updatedCount > 0) {
      onUpdateProject({
        ...project,
        attachments: nextAttachments,
        updatedAt: Date.now(),
      });
      sound.playClick(900);
      onShowToast(t.attachments.syncedCount(updatedCount));
    } else {
      const reason = getLastCloudError();
      onShowToast(t.attachments.noneSynced(reason ? storageErrorHint(reason) : t.attachments.checkConnection));
    }
    setSyncingLocal(false);
  };

  const handleProcessFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploading(true);
    sound.playCommand();

    const uploadedList: ProjectAttachment[] = [];
    let cloudCount = 0;
    let localCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`${t.attachments.uploading} ${i + 1}/${files.length}: ${file.name} (${formatBytes(file.size)})`);

      try {
        const attachment = await storageService.uploadFile(file, project.id, user?.id);
        uploadedList.push(attachment);
        if (attachment.url.startsWith('http')) {
          cloudCount++;
        } else {
          localCount++;
        }
      } catch (err: any) {
        console.error('Erro no upload de', file.name, err);
        onShowToast(t.attachments.uploadError(file.name, err?.message || t.attachments.unknownError));
      }
    }

    if (uploadedList.length > 0) {
      const updated: Project = {
        ...project,
        attachments: [...(project.attachments || []), ...uploadedList],
        updatedAt: Date.now(),
      };
      onUpdateProject(updated);
      sound.playClick(900);
      if (cloudCount > 0 && localCount === 0) {
        onShowToast(t.attachments.savedCloud(cloudCount));
      } else if (localCount > 0) {
        const reason = user ? getLastCloudError() : null;
        onShowToast(
          t.attachments.savedLocal(localCount) + (reason ? ' ' + storageErrorHint(reason) : user ? '' : ' ' + t.attachments.loginToUpload)
        );
      }
    }

    setUploading(false);
    setUploadProgress(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = async (att: ProjectAttachment) => {
    sound.playClick(300);
    try {
      await storageService.deleteFile(att);
    } catch {
      // ignore
    }

    const updatedList = attachments.filter((a) => a.id !== att.id);
    onUpdateProject({
      ...project,
      attachments: updatedList,
      updatedAt: Date.now(),
    });
    setDeleteConfirmId(null);
    onShowToast(t.attachments.deleted(att.name));
  };

  const handleCopyCode = (text?: string, id?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
    sound.playClick(800);
    onShowToast(t.attachments.copied);
  };

  const renderIcon = (type: AttachmentType) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={15} className="text-[color:var(--t-22c55e)]" />;
      case 'video':
        return <Video size={15} className="text-[#38bdf8]" />;
      case 'pdf':
        return <FileText size={15} className="text-[#f87171]" />;
      case 'code':
        return <FileCode size={15} className="text-[#facc15]" />;
      case 'text':
        return <FileText size={15} className="text-[color:var(--t-86efac)]" />;
      default:
        return <FileIcon size={15} className="text-[color:var(--t-a3e635)]" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Attachments Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[color:var(--t-040d06)] border border-[color:var(--t-14351a)]">
        <div className="flex items-center gap-2">
          <HardDrive size={15} className="text-[color:var(--t-22c55e)]" />
          <span className="font-bold text-xs text-[color:var(--t-22c55e)] tracking-wider">
            {t.attachments.header}
          </span>
          <span className="text-[10px] text-[color:var(--t-16a34a)] bg-[color:var(--t-071f0d)] border border-[color:var(--t-166534)] px-1.5 py-0.5">
            {t.attachments.count(attachments.length)} · {formatBytes(totalBytes)}
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1 text-[11px]">
          {[
            { id: 'all', label: t.attachments.filters.all },
            { id: 'images', label: t.attachments.filters.images },
            { id: 'videos', label: t.attachments.filters.videos },
            { id: 'docs', label: t.attachments.filters.docs },
            { id: 'code', label: t.attachments.filters.code },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilterType(f.id);
                sound.playClick(600);
              }}
              className={`px-2 py-0.5 transition-colors cursor-pointer border ${
                filterType === f.id
                  ? 'bg-[color:var(--t-0e2f16)] border-[color:var(--t-22c55e)] text-[color:var(--t-22c55e)] font-bold'
                  : 'bg-[color:var(--t-030804)] border-[color:var(--t-14351a)] text-[color:var(--t-21a04d)] hover:text-[color:var(--t-86efac)]'
              }`}
            >
              [{f.label}]
            </button>
          ))}
        </div>
      </div>

      {/* Falha ao gerar links dos arquivos na nuvem */}
      {signError && (
        <div className="mb-3 p-3 bg-[#120803] border border-amber-600/90 text-amber-400 text-[11px] leading-relaxed" role="alert">
          <strong>{t.attachments.signError}</strong> {signError}
        </div>
      )}

      {/* Local Attachments Warning & One-Click Cloud Sync */}
      {localAttachmentsCount > 0 && (
        <div className="p-3 bg-[#130b03] border border-amber-600/70 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-[0_0_12px_rgba(217,119,6,0.15)]">
          <div className="space-y-0.5">
            <div className="text-amber-400 font-bold flex items-center gap-1.5">
              <span>{t.attachments.localWarning(localAttachmentsCount)}</span>
            </div>
            <p className="text-[11px] text-amber-200/80">
              {user
                ? t.attachments.localHintUser
                : t.attachments.localHintGuest}
            </p>
          </div>
          {user && (
            <button
              onClick={handleSyncLocalFilesToCloud}
              disabled={syncingLocal}
              className="px-3 py-1.5 bg-[#251304] hover:bg-[#3a1d06] border border-amber-500 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              <UploadCloud size={13} />
              <span>{syncingLocal ? t.attachments.sending : t.attachments.syncToCloud}</span>
            </button>
          )}
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 text-center ${
          isDragging
            ? 'border-[color:var(--t-22c55e)] bg-[color:var(--t-092b12)]/80 shadow-[0_0_20px_color-mix(in_srgb,var(--t-22c55e)_30%,transparent)]'
            : 'border-[color:var(--t-1b5e2b)] bg-[color:var(--t-030904)]/70 hover:border-[color:var(--t-22c55e)] hover:bg-[color:var(--t-061709)]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => {
            if (e.target.files) handleProcessFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        <div className="w-10 h-10 rounded-full bg-[color:var(--t-071f0d)] border border-[color:var(--t-22c55e)] flex items-center justify-center text-[color:var(--t-22c55e)] shadow-[0_0_12px_color-mix(in_srgb,var(--t-22c55e)_20%,transparent)]">
          <UploadCloud size={20} className={uploading ? 'animate-bounce' : ''} />
        </div>

        <div>
          <div className="text-xs font-bold text-[color:var(--t-86efac)]">
            {uploading
              ? uploadProgress || t.attachments.processing
              : t.attachments.dropHint}
          </div>
          <div className="text-[10px] text-[color:var(--t-21a04d)] mt-1">
            {t.attachments.formats} PNG, JPG, GIF, WebP, MP4, WebM, PDF, TXT, JS, TS, PY, JSON, etc.
          </div>
        </div>

        <span className="text-[10px] text-[color:var(--t-22c55e)] border border-[color:var(--t-166534)] px-2 py-0.5 bg-[color:var(--t-020502)]">
          {t.attachments.select}
        </span>
      </div>

      {/* Files Grid / List */}
      {filteredAttachments.length === 0 ? (
        <div className="p-8 text-center border border-[color:var(--t-14351a)] bg-[color:var(--t-020603)] text-[color:var(--t-21a04d)] space-y-1">
          <p className="font-mono text-xs text-[color:var(--t-21a04d)]">
            {t.attachments.emptyTitle}
          </p>
          <p className="text-[10px]">
            {t.attachments.emptyHint}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAttachments.map((att) => (
            <div
              key={att.id}
              className="bg-[color:var(--t-030804)] border border-[color:var(--t-14351a)] hover:border-[color:var(--t-22c55e)] transition-all flex flex-col justify-between overflow-hidden group shadow-[0_0_8px_rgba(0,0,0,0.5)]"
            >
              {/* Card Header & Preview */}
              <div>
                {/* Media Preview based on type */}
                {att.type === 'image' && (
                  <div
                    onClick={() => setViewingImage(att)}
                    className="relative w-full h-36 bg-black border-b border-[color:var(--t-14351a)] overflow-hidden cursor-pointer group/img"
                  >
                    <img
                      src={fileUrls[att.id]}
                      alt={att.name}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300 opacity-90 group-hover/img:opacity-100"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="px-2 py-1 bg-black/80 border border-[color:var(--t-22c55e)] text-[10px] text-[color:var(--t-22c55e)] flex items-center gap-1">
                        <Maximize2 size={11} /> {t.attachments.zoom}
                      </span>
                    </div>
                  </div>
                )}

                {att.type === 'video' && (
                  <div className="w-full bg-black border-b border-[color:var(--t-14351a)]">
                    <video
                      src={fileUrls[att.id]}
                      controls
                      className="w-full max-h-36 object-contain bg-black"
                    />
                  </div>
                )}

                {att.type === 'pdf' && (
                  <div className="p-4 bg-[#0a0505] border-b border-[#291111] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[#200b0b] border border-red-800 text-red-400">
                        <FileText size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] text-red-400 font-bold">{t.attachments.pdf}</span>
                        <p className="text-[10px] text-zinc-400">{formatBytes(att.size)}</p>
                      </div>
                    </div>
                    <a
                      href={fileUrls[att.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-[#1a0808] hover:bg-[#2e0e0e] border border-red-700 text-red-300 text-[10px] flex items-center gap-1"
                    >
                      <Eye size={11} /> {t.attachments.open}
                    </a>
                  </div>
                )}

                {(att.type === 'code' || att.type === 'text') && (
                  <div className="p-3 bg-[color:var(--t-030604)] border-b border-[color:var(--t-14351a)] font-mono">
                    <div className="flex items-center justify-between pb-1.5 text-[10px] text-[color:var(--t-21a04d)]">
                      <span className="flex items-center gap-1 font-bold text-[#facc15]">
                        <FileCode size={12} /> {t.attachments.sourceCode}
                      </span>
                      <button
                        onClick={() => setViewingCode(att)}
                        className="text-[color:var(--t-22c55e)] hover:underline"
                      >
                        {t.attachments.inspect}
                      </button>
                    </div>
                    <div className="p-2 bg-[color:var(--t-010402)] border border-[color:var(--t-0d2212)] text-[10px] text-[color:var(--t-86efac)]/80 max-h-20 overflow-hidden font-mono leading-tight whitespace-pre-wrap">
                      {att.textContent
                        ? att.textContent.slice(0, 180) + (att.textContent.length > 180 ? '...' : '')
                        : t.attachments.attachedFile}
                    </div>
                  </div>
                )}

                {att.type === 'archive' && (
                  <div className="p-4 bg-[#070b0e] border-b border-[#102433] flex items-center gap-2">
                    <div className="p-2 bg-[#0c1822] border border-sky-800 text-sky-400">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] text-sky-400 font-bold">{t.attachments.archive}</span>
                      <p className="text-[10px] text-zinc-400">{formatBytes(att.size)}</p>
                    </div>
                  </div>
                )}

                {/* File Details */}
                <div className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {renderIcon(att.type)}
                      <span
                        className="font-bold text-xs text-[color:var(--t-86efac)] truncate"
                        title={att.name}
                      >
                        {att.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-[color:var(--t-21a04d)] shrink-0 font-mono">
                      {formatBytes(att.size)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[color:var(--t-21a04d)]">
                    <div className="flex items-center gap-1.5">
                      <span>{new Date(att.createdAt).toLocaleDateString(localeOf(lang))}</span>
                      <span>·</span>
                      <span>{att.type.toUpperCase()}</span>
                    </div>
                    {att.storagePath || att.url.startsWith('http') ? (
                      <span className="text-[color:var(--t-22c55e)] font-bold" title={t.attachments.cloudTitle}>
                        {t.attachments.cloudBadge}
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold" title={t.attachments.localTitle}>
                        {t.attachments.localBadge}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-3 py-2 bg-[color:var(--t-020502)] border-t border-[color:var(--t-14351a)] flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <a
                    href={fileUrls[att.id]}
                    onClick={(e) => handleDownload(e, att)}
                    download={att.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[color:var(--t-22c55e)] hover:text-white transition-colors"
                    title={t.attachments.downloadTitle}
                  >
                    <Download size={11} />
                    <span>{t.attachments.download}</span>
                  </a>

                  {att.textContent && (
                    <button
                      onClick={() => handleCopyCode(att.textContent, att.id)}
                      className="flex items-center gap-1 text-[color:var(--t-86efac)] hover:text-white transition-colors"
                      title={t.attachments.copyTitle}
                    >
                      {copiedId === att.id ? <Check size={11} className="text-[color:var(--t-22c55e)]" /> : <Copy size={11} />}
                      <span>{copiedId === att.id ? t.attachments.copiedShort : t.attachments.copy}</span>
                    </button>
                  )}
                </div>

                {deleteConfirmId === att.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(att)}
                      className="text-red-400 hover:text-red-300 font-bold"
                    >
                      {t.attachments.confirmDelete}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-[color:var(--t-21a04d)] hover:text-white"
                    >
                      {t.attachments.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setDeleteConfirmId(att.id);
                      sound.playClick(400);
                    }}
                    className="text-[color:var(--t-21a04d)] hover:text-red-400 transition-colors"
                    title={t.attachments.deleteTitle}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Lightbox Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-sm"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-[color:var(--t-040a05)] border border-[color:var(--t-22c55e)] shadow-[0_0_35px_color-mix(in_srgb,var(--t-22c55e)_30%,transparent)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-[color:var(--t-08180c)] border-b border-[color:var(--t-14351a)]">
              <span className="text-xs font-bold text-[color:var(--t-22c55e)] truncate font-mono">
                {t.attachments.image} {viewingImage.name} ({formatBytes(viewingImage.size)})
              </span>
              <div className="flex items-center gap-3">
                <a
                  href={fileUrls[viewingImage.id] || viewingImage.url}
                  download={viewingImage.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[color:var(--t-22c55e)] hover:underline font-mono flex items-center gap-1"
                >
                  <Download size={12} /> {t.attachments.download}
                </a>
                <button
                  onClick={() => setViewingImage(null)}
                  className="text-[color:var(--t-21a04d)] hover:text-[color:var(--t-22c55e)]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-black">
              <img
                src={fileUrls[viewingImage.id] || viewingImage.url}
                alt={viewingImage.name}
                className="max-w-full max-h-[75vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Code / Text Reader Modal */}
      {viewingCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-sm"
          onClick={() => setViewingCode(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] bg-[color:var(--t-030804)] border border-[color:var(--t-22c55e)] shadow-[0_0_35px_color-mix(in_srgb,var(--t-22c55e)_30%,transparent)] flex flex-col overflow-hidden font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-[color:var(--t-08180c)] border-b border-[color:var(--t-14351a)]">
              <div className="flex items-center gap-2">
                <FileCode size={14} className="text-[#facc15]" />
                <span className="font-bold text-[color:var(--t-22c55e)]">{viewingCode.name}</span>
                <span className="text-[10px] text-[color:var(--t-21a04d)]">({formatBytes(viewingCode.size)})</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCopyCode(viewingCode.textContent, viewingCode.id)}
                  className="text-xs text-[color:var(--t-22c55e)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy size={12} /> {t.attachments.copyCode}
                </button>
                <button
                  onClick={() => setViewingCode(null)}
                  className="text-[color:var(--t-21a04d)] hover:text-[color:var(--t-22c55e)]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto bg-[color:var(--t-010402)] text-[color:var(--t-86efac)] text-xs font-mono leading-relaxed whitespace-pre-wrap select-text">
              {viewingCode.textContent || t.attachments.noPreview}
            </div>
            <div className="px-4 py-2 bg-[color:var(--t-020502)] border-t border-[color:var(--t-14351a)] flex items-center justify-between text-[10px] text-[color:var(--t-21a04d)]">
              <span>TERMINAL CODE INSPECTOR</span>
              <button
                onClick={() => setViewingCode(null)}
                className="text-[color:var(--t-22c55e)] hover:underline"
              >
                {t.attachments.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
