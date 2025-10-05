import { join } from 'path';
import { getNamespacedPath } from './namespace.js';

export interface FileMetadata {
  filename: string;
  path: string;
  size: number;
  contentType: string;
  hash: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export async function getFiles(conversationId: string): Promise<FileMetadata[]> {
  const fs = await import('fs');
  const crypto = await import('crypto');
  
  const CONVERSATIONS_DIR = process.env.CONVERSATIONS_DIR || './conversations';
  const filesDir = join(getNamespacedPath(CONVERSATIONS_DIR, conversationId), 'files');

  // Check if files directory exists
  if (!fs.existsSync(filesDir)) {
    return [];
  }

  const files = await fs.promises.readdir(filesDir);
  const metadata: FileMetadata[] = [];

  for (const filename of files) {
    const filePath = join(filesDir, filename);
    const stats = await fs.promises.stat(filePath);
    const fileData = await fs.promises.readFile(filePath);
    
    // Calculate hash
    const hash = crypto.createHash('sha256').update(fileData).digest('hex');

    // Determine content type from extension
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'json': 'application/json',
    };
    const contentType = contentTypes[ext || ''] || 'application/octet-stream';

    metadata.push({
      filename,
      path: filePath,
      size: stats.size,
      contentType,
      hash,
      uploadedAt: stats.mtime,
      uploadedBy: 'system', // TODO: Track actual uploader
    });
  }

  return metadata;
}
