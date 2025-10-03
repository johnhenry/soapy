import type { SoapOperationHandler } from './registry.js';

export const CommitFileHandler: SoapOperationHandler = async (request, context) => {
  const { extractText } = context;

  const conversationId = extractText(request, 'conversationId');
  const filename = extractText(request, 'filename');
  const contentType = extractText(request, 'contentType');
  const base64Data = extractText(request, 'data');

  // Decode base64 to get file size and hash
  const buffer = Buffer.from(base64Data, 'base64');
  const size = buffer.length;

  // Generate SHA-256 hash
  const crypto = await import('crypto');
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Save file to conversation directory
  const { join } = await import('path');
  const fs = await import('fs/promises');
  const conversationDir = join(process.cwd(), 'conversations', conversationId);
  const filesDir = join(conversationDir, 'files');

  // Create files directory if it doesn't exist
  await fs.mkdir(filesDir, { recursive: true });

  // Write file
  const filePath = join(filesDir, filename);
  await fs.writeFile(filePath, buffer);

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitFileResponse>
      <tns:commitHash>file-${hash.substring(0, 8)}</tns:commitHash>
      <tns:fileMetadata>
        <tns:filename>${filename}</tns:filename>
        <tns:path>files/${filename}</tns:path>
        <tns:size>${size}</tns:size>
        <tns:contentType>${contentType}</tns:contentType>
        <tns:hash>sha256-${hash}</tns:hash>
        <tns:uploadedAt>${new Date().toISOString()}</tns:uploadedAt>
        <tns:uploadedBy>soap-client</tns:uploadedBy>
      </tns:fileMetadata>
    </tns:CommitFileResponse>
  </soap:Body>
</soap:Envelope>`;
};
