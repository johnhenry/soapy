import type { SoapOperationHandler } from './registry.js';
import { createBranch as gitCreateBranch } from '../../../lib/git-storage/branch.js';

export const BranchConversationHandler: SoapOperationHandler = async (request, context) => {
  const { extractText } = context;

  const conversationId = extractText(request, 'conversationId');
  const branchName = extractText(request, 'branchName');
  const fromMessageNumber = parseInt(extractText(request, 'fromMessageNumber'), 10);
  const creatorId = 'soap-client'; // TODO: Get from auth context

  // Create branch in git storage
  const branch = await gitCreateBranch(conversationId, branchName, fromMessageNumber, creatorId);

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:BranchConversationResponse>
      <tns:branchRef>${branch.branchRef}</tns:branchRef>
      <tns:createdAt>${branch.createdAt.toISOString()}</tns:createdAt>
    </tns:BranchConversationResponse>
  </soap:Body>
</soap:Envelope>`;
};
