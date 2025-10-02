import { useState, useEffect, DragEvent } from 'react';
import { useApi } from '../context/ApiContext';
import { RestClient } from '../services/RestClient';
import type { FileAttachment } from '../types';
import './FileUploader.css';

interface FileUploaderProps {
  conversationId: string;
}

export function FileUploader({ conversationId }: FileUploaderProps) {
  const { config } = useApi();
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const client = new RestClient(config.baseUrl, config.apiKey);

  useEffect(() => {
    loadFiles();
  }, [conversationId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const fileList = await client.listFiles(conversationId);
      setFiles(fileList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (filesToUpload: File[]) => {
    try {
      setUploading(true);
      setError(null);

      for (const file of filesToUpload) {
        await client.uploadFile(conversationId, file);
      }

      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files) {
      handleUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDownload = async (filename: string) => {
    try {
      const blob = await client.downloadFile(conversationId, filename);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="file-uploader">
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p>Drag and drop files here</p>
        <p className="drop-zone-hint">or</p>
        <label className="file-input-label">
          <input type="file" multiple onChange={handleFileInput} disabled={uploading} />
          <span>Browse Files</span>
        </label>
      </div>

      {error && <div className="error-message">{error}</div>}

      {uploading && <div className="upload-progress">Uploading files...</div>}

      {loading ? (
        <div className="loading">Loading files...</div>
      ) : (
        <div className="file-list">
          <h3>Uploaded Files</h3>
          {files.length === 0 ? (
            <div className="empty-state">
              <p>No files uploaded yet.</p>
            </div>
          ) : (
            <div className="files">
              {files.map((file) => (
                <div key={file.filename} className="file-item">
                  <div className="file-info">
                    <div className="file-name">{file.filename}</div>
                    <div className="file-meta">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{file.contentType}</span>
                      <span title={file.hash}>{file.hash.substring(0, 8)}...</span>
                    </div>
                    <div className="file-date">
                      Uploaded {new Date(file.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    className="secondary small"
                    onClick={() => handleDownload(file.filename)}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
