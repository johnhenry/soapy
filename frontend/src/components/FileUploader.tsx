import { useState, useEffect, DragEvent } from 'react';
import { useApi } from '../context/ApiContext';
import { RestClient } from '../services/RestClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileAttachment } from '../types';

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
    <div className="p-4 space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          uploading && "opacity-50 pointer-events-none"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">Drag and drop files here</p>
        <p className="text-xs text-muted-foreground mb-4">or</p>
        <label>
          <input 
            type="file" 
            multiple 
            onChange={handleFileInput} 
            disabled={uploading} 
            className="hidden"
          />
          <Button asChild variant="secondary" disabled={uploading}>
            <span className="cursor-pointer">Browse Files</span>
          </Button>
        </label>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {uploading && (
        <div className="text-center text-sm text-muted-foreground py-2">
          Uploading files...
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileIcon className="h-5 w-5" />
            Uploaded Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-4">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No files uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div 
                  key={file.filename} 
                  className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-medium text-sm truncate">{file.filename}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="font-mono">
                        {formatFileSize(file.size)}
                      </Badge>
                      <span>{file.contentType}</span>
                      <Badge variant="outline" className="font-mono" title={file.hash}>
                        {file.hash.substring(0, 8)}...
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Uploaded {new Date(file.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(file.filename)}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

