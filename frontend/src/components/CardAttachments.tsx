import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { api } from '../lib/api';

interface AttachmentRecord {
  id: string;
  name?: string | null;
  url: string;
  mimeType?: string | null;
  size?: number | null;
  createdAt: string;
  uploadedBy?: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
}

interface CardAttachmentsProps {
  cardId: string;
  refreshKey?: number;
  onMutation?: () => void;
}

function formatSize(bytes?: number | null) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CardAttachments({
  cardId,
  refreshKey,
  onMutation,
}: CardAttachmentsProps) {
  const [items, setItems] = useState<AttachmentRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .get<AttachmentRecord[]>(`/cards/${cardId}/attachments`)
      .then(({ data }) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getMessage(err, 'Could not load attachments'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, refreshKey]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<AttachmentRecord>(
        `/cards/${cardId}/attachments`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setItems((prev) => [data, ...prev]);
      onMutation?.();
    } catch (err) {
      setError(getMessage(err, 'Upload failed'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDownload(attachment: AttachmentRecord) {
    setError(null);
    try {
      const response = await api.get<Blob>(
        `/attachments/${attachment.id}/download`,
        { responseType: 'blob' },
      );
      const blobUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = attachment.name ?? 'attachment';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    } catch (err) {
      setError(getMessage(err, 'Download failed'));
    }
  }

  async function handleDelete(attachment: AttachmentRecord) {
    if (!window.confirm(`Delete "${attachment.name ?? 'attachment'}"?`)) return;
    setError(null);
    try {
      await api.delete(`/attachments/${attachment.id}`);
      setItems((prev) => prev.filter((item) => item.id !== attachment.id));
      onMutation?.();
    } catch (err) {
      setError(getMessage(err, 'Delete failed'));
    }
  }

  return (
    <div className="attachments">
      <div className="attachments__upload">
        <input
          ref={fileInputRef}
          aria-label="Attach file"
          type="file"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {isUploading ? <span className="app-subtitle">Uploading...</span> : null}
      </div>
      {error ? (
        <p className="status-banner status-banner--error">{error}</p>
      ) : null}
      {items.length === 0 ? (
        <p className="app-subtitle">No attachments yet.</p>
      ) : (
        <ul className="attachments__list">
          {items.map((item) => (
            <li className="attachment-row" key={item.id}>
              <div className="attachment-row__info">
                <button
                  className="attachment-row__name"
                  type="button"
                  onClick={() => void handleDownload(item)}
                >
                  {item.name ?? item.url}
                </button>
                <small>
                  {formatSize(item.size)}
                  {item.uploadedBy
                    ? ` • by ${item.uploadedBy.name || item.uploadedBy.email}`
                    : ''}
                </small>
              </div>
              <button
                className="ghost-button"
                type="button"
                title="Delete attachment"
                onClick={() => void handleDelete(item)}
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function getMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return error.response?.data?.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
