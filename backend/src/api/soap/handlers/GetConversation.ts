import type { SoapOperationHandler } from './registry.js';
import { getConversationItems } from '../../../lib/git-storage/message.js';
import { gitStorage } from '../../../lib/git-storage/index.js';

export const GetConversationHandler: SoapOperationHandler = async (request, context) => {
  const { extractText, fastify } = context;

  const conversationId = extractText(request, 'conversationId');
  const branchName = extractText(request, 'branchName');

  // Check if conversation exists first
  if (!(await gitStorage.conversationExists(conversationId))) {
    // Return empty conversation for non-existent conversations
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:GetConversationResponse>
    </tns:GetConversationResponse>
  </soap:Body>
</soap:Envelope>`;
  }

  // Get actual conversation items from git storage
  let items;
  try {
    items = await getConversationItems(conversationId, branchName || undefined);
  } catch (error: any) {
    // Handle case where conversation exists but has no commits yet
    if (error.code === 'NotFoundError' || error.message?.includes('Could not find HEAD')) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:GetConversationResponse>
    </tns:GetConversationResponse>
  </soap:Body>
</soap:Envelope>`;
    }
    throw error; // Re-throw other errors
  }

  // Build messages XML
  const messagesXml = items
    .filter(item => item.itemType === 'message')
    .map(item => {
      const msg = item as any;
      return `      <tns:messages>
        <tns:sequenceNumber>${msg.sequenceNumber}</tns:sequenceNumber>
        <tns:role>${msg.role}</tns:role>
        <tns:content><![CDATA[${msg.content}]]></tns:content>
        <tns:timestamp>${msg.timestamp}</tns:timestamp>
        ${msg.aiProvider ? `<tns:aiProvider>${msg.aiProvider}</tns:aiProvider>` : ''}
        ${msg.model ? `<tns:model>${msg.model}</tns:model>` : ''}
        <tns:commitHash>${msg.commitHash}</tns:commitHash>
      </tns:messages>`;
    })
    .join('\n');

  fastify.log.info({ conversationId, itemCount: items.length, messagesCount: items.filter(i => i.itemType === 'message').length }, 'GetConversation response');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:GetConversationResponse>
${messagesXml}
    </tns:GetConversationResponse>
  </soap:Body>
</soap:Envelope>`;
};
