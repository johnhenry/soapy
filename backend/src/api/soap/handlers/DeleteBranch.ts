import type { SoapOperationHandler } from './registry.js';
import { gitStorage } from '../../../lib/git-storage/index.js';
import { deleteBranch } from '../../../lib/git-storage/branch.js';

export const DeleteBranchHandler: SoapOperationHandler = async (request, context) => {
  const { extractText } = context;

  const conversationId = extractText(request, 'conversationId');
  const branchName = extractText(request, 'branchName');

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

  // Try to delete the branch
  try {
    await deleteBranch(conversationId, branchName);
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot delete main branch') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>Cannot delete main branch</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
    }
    throw error;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:DeleteBranchResponse>
      <tns:success>true</tns:success>
    </tns:DeleteBranchResponse>
  </soap:Body>
</soap:Envelope>`;
};
