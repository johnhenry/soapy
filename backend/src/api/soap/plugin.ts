import type { FastifyPluginAsync } from 'fastify';
import { getWsdlContent } from './service.js';
import { commitMessage, getConversationItems, getMessages, commitToolCall, commitToolResult } from '../../lib/git-storage/message.js';
import { createBranch as gitCreateBranch } from '../../lib/git-storage/branch.js';

const soapPlugin: FastifyPluginAsync = async (fastify) => {
  // Add content type parser for XML
  fastify.addContentTypeParser(
    'text/xml',
    { parseAs: 'string' },
    async (_req: unknown, body: unknown) => {
      return body;
    }
  );

  // Serve WSDL
  fastify.get('/soap', async (request, reply) => {
    const isWsdlRequest = request.query && (request.query as { wsdl?: string }).wsdl !== undefined;

    if (isWsdlRequest) {
      const wsdlContent = getWsdlContent();
      reply.type('text/xml').send(wsdlContent);
    } else {
      reply.code(400).send({ error: 'Missing ?wsdl parameter' });
    }
  });

  // Helper to extract text from XML
  const extractText = (xml: string, tagName: string): string => {
    const match = xml.match(new RegExp(`<(?:\\w+:)?${tagName}(?:\\s[^>]*)?>([^<]*)</(?:\\w+:)?${tagName}>`));
    return match ? match[1].trim() : '';
  };

  // Helper to extract CDATA content
  const extractCDATA = (xml: string, tagName: string): string => {
    const match = xml.match(new RegExp(`<(?:\\w+:)?${tagName}(?:\\s[^>]*)?><!\\[CDATA\\[([^\\]]*)]\\]></(?:\\w+:)?${tagName}>`));
    if (match) return match[1];
    // Fallback to regular text
    return extractText(xml, tagName);
  };

  // Helper to escape XML
  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Handle SOAP requests
  fastify.post('/soap', async (request, reply) => {
    try {
      const soapRequest = request.body as string;

      // Parse SOAP envelope to determine operation
      let operationMatch = soapRequest.match(/<(\w+):(\w+Request)>/);
      if (!operationMatch) {
        operationMatch = soapRequest.match(/<(\w+Request)>/);
      }

      if (!operationMatch) {
        reply.code(400).type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>Could not parse SOAP request</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`);
        return;
      }

      const operation = operationMatch[operationMatch.length - 1].replace('Request', '');
      fastify.log.info(`SOAP operation: ${operation}`);

      let response: string;

      switch (operation) {
        case 'GetConversation': {
          const conversationId = extractText(soapRequest, 'conversationId');
          const branchName = extractText(soapRequest, 'branchName');

          // Check if conversation exists first
          const { gitStorage } = await import('../../lib/git-storage/index.js');
          if (!(await gitStorage.conversationExists(conversationId))) {
            // Return empty conversation for non-existent conversations
            response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:GetConversationResponse>
    </tns:GetConversationResponse>
  </soap:Body>
</soap:Envelope>`;
            break;
          }

          // Get actual conversation items from git storage
          let items;
          try {
            items = await getConversationItems(conversationId, branchName || undefined);
          } catch (error: any) {
            // Handle case where conversation exists but has no commits yet
            if (error.code === 'NotFoundError' || error.message?.includes('Could not find HEAD')) {
              response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:GetConversationResponse>
    </tns:GetConversationResponse>
  </soap:Body>
</soap:Envelope>`;
              break;
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

          response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:GetConversationResponse>
${messagesXml}
    </tns:GetConversationResponse>
  </soap:Body>
</soap:Envelope>`;

          // Debug: log the response
          fastify.log.info({ conversationId, itemCount: items.length, messagesCount: items.filter(i => i.itemType === 'message').length }, 'GetConversation response');
          break;
        }

        case 'CommitMessage': {
          const conversationId = extractText(soapRequest, 'conversationId');
          const role = extractText(soapRequest, 'role') as 'user' | 'assistant' | 'system';
          const content = extractCDATA(soapRequest, 'content');
          const aiProvider = extractText(soapRequest, 'aiProvider') || undefined;
          const model = extractText(soapRequest, 'model') || undefined;

          // Create conversation if it doesn't exist
          const { gitStorage } = await import('../../lib/git-storage/index.js');
          if (!(await gitStorage.conversationExists(conversationId))) {
            await gitStorage.createConversation({
              id: conversationId,
              organizationId: 'default',
              ownerId: 'default',
              createdAt: new Date(),
              mainBranch: 'main',
              branches: ['main'],
            });
          }

          // Commit message to git storage
          const result = await commitMessage(conversationId, {
            role,
            content,
            timestamp: new Date(),
            aiProvider,
            model,
          });

          response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitMessageResponse>
      <tns:commitHash>${result.commitHash}</tns:commitHash>
      <tns:sequenceNumber>${result.sequenceNumber}</tns:sequenceNumber>
      <tns:timestamp>${result.timestamp.toISOString()}</tns:timestamp>
    </tns:CommitMessageResponse>
  </soap:Body>
</soap:Envelope>`;
          break;
        }

        case 'BranchConversation': {
          const conversationId = extractText(soapRequest, 'conversationId');
          const branchName = extractText(soapRequest, 'branchName');
          const fromMessageNumber = parseInt(extractText(soapRequest, 'fromMessageNumber'), 10);
          const creatorId = 'soap-client'; // TODO: Get from auth context

          // Create branch in git storage
          const branch = await gitCreateBranch(conversationId, branchName, fromMessageNumber, creatorId);

          response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:BranchConversationResponse>
      <tns:branchRef>${branch.branchRef}</tns:branchRef>
      <tns:createdAt>${branch.createdAt.toISOString()}</tns:createdAt>
    </tns:BranchConversationResponse>
  </soap:Body>
</soap:Envelope>`;
          break;
        }

        case 'GetBranding':
          // Branding not implemented yet - return empty/default
          response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:GetBrandingResponse>
      <tns:branding>
        <tns:logoUrl></tns:logoUrl>
        <tns:primaryColor>#3b82f6</tns:primaryColor>
        <tns:versionTimestamp>${new Date().toISOString()}</tns:versionTimestamp>
      </tns:branding>
    </tns:GetBrandingResponse>
  </soap:Body>
</soap:Envelope>`;
          break;

        case 'CommitToolCall': {
          const conversationId = extractText(soapRequest, 'conversationId');
          const toolName = extractText(soapRequest, 'toolName');
          const parametersJson = extractCDATA(soapRequest, 'parameters');
          const parameters = parametersJson ? JSON.parse(parametersJson) : {};

          // Commit tool call to git storage
          const result = await commitToolCall(conversationId, {
            toolName,
            parameters,
            requestedAt: new Date(),
          });

          response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitToolCallResponse>
      <tns:commitHash>${result.commitHash}</tns:commitHash>
      <tns:sequenceNumber>${result.sequenceNumber}</tns:sequenceNumber>
      <tns:timestamp>${result.timestamp.toISOString()}</tns:timestamp>
    </tns:CommitToolCallResponse>
  </soap:Body>
</soap:Envelope>`;
          break;
        }

        case 'CommitToolResult': {
          const conversationId = extractText(soapRequest, 'conversationId');
          const toolCallRef = parseInt(extractText(soapRequest, 'toolCallRef'), 10);
          const resultJson = extractCDATA(soapRequest, 'result');
          const resultData = resultJson ? JSON.parse(resultJson) : {};
          const status = extractText(soapRequest, 'status') as 'success' | 'error' | 'timeout';

          // Commit tool result to git storage
          const result = await commitToolResult(conversationId, {
            toolCallRef,
            result: resultData,
            status,
            executedAt: new Date(),
            retryCount: 0,
          });

          response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitToolResultResponse>
      <tns:commitHash>${result.commitHash}</tns:commitHash>
      <tns:sequenceNumber>${result.sequenceNumber}</tns:sequenceNumber>
      <tns:timestamp>${result.timestamp.toISOString()}</tns:timestamp>
    </tns:CommitToolResultResponse>
  </soap:Body>
</soap:Envelope>`;
          break;
        }

        case 'CommitFile': {
          const conversationId = extractText(soapRequest, 'conversationId');
          const filename = extractText(soapRequest, 'filename');
          const contentType = extractText(soapRequest, 'contentType');
          const base64Data = extractText(soapRequest, 'data');

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

          response = `<?xml version="1.0" encoding="UTF-8"?>
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
          break;
        }

        case 'GetFile': {
          const conversationId = extractText(soapRequest, 'conversationId');
          const filename = extractText(soapRequest, 'filename');

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

            response = `<?xml version="1.0" encoding="UTF-8"?>
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
            response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>File not found: ${escapeXml(errorMessage)}</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
            reply.code(404);
          }
          break;
        }

        case 'ListConversations': {
          // Get all conversations from git storage
          const { gitStorage } = await import('../../lib/git-storage/index.js');
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

          response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:ListConversationsResponse>
${conversationsXml}
    </tns:ListConversationsResponse>
  </soap:Body>
</soap:Envelope>`;
          break;
        }

        default:
          response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>Unknown operation ${operation}</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
          reply.code(501);
      }

      reply.type('text/xml').send(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error, 'SOAP processing error');

      reply.code(500).type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>${escapeXml(errorMessage)}</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`);
    }
  });
};

export default soapPlugin;
