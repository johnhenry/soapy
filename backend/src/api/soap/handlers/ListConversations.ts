import type { SoapOperationHandler } from './registry.js';
import { getMessages } from '../../../lib/git-storage/message.js';
import { gitStorage } from '../../../lib/git-storage/index.js';

export const ListConversationsHandler: SoapOperationHandler = async (request, context) => {
  const { escapeXml } = context;

  // Get all conversations from git storage
  const conversations = await gitStorage.listConversations();

  // Get first message from each conversation for title
  const conversationsWithMeta = await Promise.all(
    conversations.map(async (conv) => {
      try {
        const messages = await getMessages(conv.id);
        const firstMessage = messages.find((m) => m.role === 'user');
        const title = firstMessage?.content.slice(0, 50) || 'New Conversation';
        const updatedAt = messages.length > 0
          ? messages[messages.length - 1].timestamp
          : conv.createdAt;

        return {
          id: conv.id,
          title: escapeXml(title),
          updatedAt: updatedAt.toISOString(),
        };
      } catch (error) {
        // If conversation has no messages yet, use defaults
        return {
          id: conv.id,
          title: 'New Conversation',
          updatedAt: conv.createdAt.toISOString(),
        };
      }
    })
  );

  // Build conversations XML
  const conversationsXml = conversationsWithMeta
    .map(conv => `      <tns:conversations>
        <tns:id>${conv.id}</tns:id>
        <tns:title>${conv.title}</tns:title>
        <tns:updatedAt>${conv.updatedAt}</tns:updatedAt>
      </tns:conversations>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:ListConversationsResponse>
${conversationsXml}
    </tns:ListConversationsResponse>
  </soap:Body>
</soap:Envelope>`;
};
