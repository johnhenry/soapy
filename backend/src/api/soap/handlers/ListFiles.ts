import type { SoapOperationHandler } from './registry.js';
import { gitStorage } from '../../../lib/git-storage/index.js';
import { getFiles } from '../../../lib/git-storage/file.js';

export const ListFilesHandler: SoapOperationHandler = async (request, context) => {
  const { extractText } = context;

  const conversationId = extractText(request, 'conversationId');

  // Check if conversation exists
  if (!(await gitStorage.conversationExists(conversationId))) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>Conversation not found: ${conversationId}</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
  }

  // Get files
  const files = await getFiles(conversationId);

  // Build files XML
  const filesXml = files
    .map(file => `      <tns:files>
        <tns:filename>${file.filename}</tns:filename>
        <tns:path>${file.path}</tns:path>
        <tns:size>${file.size}</tns:size>
        <tns:contentType>${file.contentType}</tns:contentType>
        <tns:hash>${file.hash}</tns:hash>
        <tns:uploadedAt>${file.uploadedAt.toISOString()}</tns:uploadedAt>
        <tns:uploadedBy>${file.uploadedBy}</tns:uploadedBy>
      </tns:files>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:ListFilesResponse>
${filesXml}
    </tns:ListFilesResponse>
  </soap:Body>
</soap:Envelope>`;
};
