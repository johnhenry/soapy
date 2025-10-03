import type { SoapOperationHandler } from './registry.js';
import { gitStorage } from '../../../lib/git-storage/index.js';
import { getBranches } from '../../../lib/git-storage/branch.js';

export const ListBranchesHandler: SoapOperationHandler = async (request, context) => {
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

  // Get branches
  const branches = await getBranches(conversationId);

  // Build branches XML
  const branchesXml = branches
    .map(branch => `      <tns:branches>
        <tns:name>${branch.name}</tns:name>
        <tns:sourceMessageNumber>${branch.sourceMessageNumber}</tns:sourceMessageNumber>
        <tns:messageCount>${branch.messageCount}</tns:messageCount>
      </tns:branches>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:ListBranchesResponse>
${branchesXml}
    </tns:ListBranchesResponse>
  </soap:Body>
</soap:Envelope>`;
};
