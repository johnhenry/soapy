import type { SoapOperationHandler } from './registry.js';
import { getConversationItems } from '../../../lib/git-storage/message.js';
import { gitStorage } from '../../../lib/git-storage/index.js';

export const GetCompletionHandler: SoapOperationHandler = async (request, context) => {
  const { extractText, fastify } = context;

  const conversationId = extractText(request, 'conversationId');
  const branchName = extractText(request, 'branchName');

  // Check if conversation exists
  if (!(await gitStorage.conversationExists(conversationId))) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>Conversation not found</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
  }

  // Get conversation items
  let items;
  try {
    items = await getConversationItems(conversationId, branchName || undefined);
  } catch (error: any) {
    // Handle case where conversation exists but has no commits yet
    if (error.code === 'NotFoundError' || error.message?.includes('Could not find HEAD')) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>No messages in conversation</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
    }
    throw error;
  }

  // Get the last assistant message
  const messages = items.filter(item => item.itemType === 'message');
  const lastAssistantMessage = messages.reverse().find((item: any) => item.role === 'assistant');

  if (!lastAssistantMessage) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>No assistant response found</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
  }

  const msg = lastAssistantMessage as any;

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:GetCompletionResponse>
      <tns:message>
        <tns:sequenceNumber>${msg.sequenceNumber}</tns:sequenceNumber>
        <tns:role>${msg.role}</tns:role>
        <tns:content><![CDATA[${msg.content}]]></tns:content>
        <tns:timestamp>${msg.timestamp}</tns:timestamp>
        ${msg.aiProvider ? `<tns:aiProvider>${msg.aiProvider}</tns:aiProvider>` : ''}
        ${msg.model ? `<tns:model>${msg.model}</tns:model>` : ''}
        <tns:commitHash>${msg.commitHash}</tns:commitHash>
      </tns:message>
    </tns:GetCompletionResponse>
  </soap:Body>
</soap:Envelope>`;
};
