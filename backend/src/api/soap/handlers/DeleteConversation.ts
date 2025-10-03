import type { SoapOperationHandler } from './registry.js';
import { gitStorage } from '../../../lib/git-storage/index.js';

export const DeleteConversationHandler: SoapOperationHandler = async (request, context) => {
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

  // Delete the conversation
  await gitStorage.deleteConversation(conversationId);

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:DeleteConversationResponse>
      <tns:success>true</tns:success>
    </tns:DeleteConversationResponse>
  </soap:Body>
</soap:Envelope>`;
};
