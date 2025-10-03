import type { SoapOperationHandler } from './registry.js';

export const GetFileHandler: SoapOperationHandler = async (request, context) => {
  const { extractText, escapeXml } = context;

  const conversationId = extractText(request, 'conversationId');
  const filename = extractText(request, 'filename');

  // Read file from conversation directory
  const { join } = await import('path');
  const fs = await import('fs/promises');
  const conversationDir = join(process.cwd(), 'conversations', conversationId);
  const filePath = join(conversationDir, 'files', filename);

  try {
    const buffer = await fs.readFile(filePath);
    const base64Data = buffer.toString('base64');

    // Try to determine content type from file extension
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.png')) contentType = 'image/png';
    else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (filename.endsWith('.gif')) contentType = 'image/gif';
    else if (filename.endsWith('.pdf')) contentType = 'application/pdf';
    else if (filename.endsWith('.txt')) contentType = 'text/plain';

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:GetFileResponse>
      <tns:filename>${filename}</tns:filename>
      <tns:contentType>${contentType}</tns:contentType>
      <tns:data>${base64Data}</tns:data>
    </tns:GetFileResponse>
  </soap:Body>
</soap:Envelope>`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'File not found';
    throw new Error(`File not found: ${escapeXml(errorMessage)}`);
  }
};
