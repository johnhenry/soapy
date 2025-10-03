import type { SoapOperationHandler } from './registry.js';
import { commitMessage, getConversationItems } from '../../../lib/git-storage/message.js';
import { gitStorage } from '../../../lib/git-storage/index.js';
import { aiOrchestrator } from '../../../lib/ai-providers/index.js';

export const CommitMessageHandler: SoapOperationHandler = async (request, context) => {
  const { extractText: extract, extractCDATA, fastify } = context;

  const conversationId = extract(request, 'conversationId');
  const role = extract(request, 'role') as 'user' | 'assistant' | 'system';
  const content = extractCDATA(request, 'content');
  const aiProvider = (extract(request, 'aiProvider') || 'openai') as any;
  const model = extract(request, 'model') || (aiProvider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022');

  // Extract attachments from SOAP request (if present)
  let attachments: Array<{ filename: string; contentType: string; size: number; data: string }> | undefined;
  const attachmentRegex = /<(?:\w+:)?attachments[^>]*>([\s\S]*?)<\/(?:\w+:)?attachments>/g;
  const attachmentMatches = [...request.matchAll(attachmentRegex)];

  fastify.log.info({ attachmentMatchCount: attachmentMatches.length }, 'Checking for SOAP attachments');

  if (attachmentMatches.length > 0) {
    attachments = [];
    for (const match of attachmentMatches) {
      const attachmentXml = match[1];
      const filename = extract(attachmentXml, 'filename');
      const contentType = extract(attachmentXml, 'contentType');
      const sizeStr = extract(attachmentXml, 'size');
      const data = extract(attachmentXml, 'data');

      fastify.log.info({ filename, contentType, dataLength: data.length }, 'Parsed attachment from SOAP');

      if (filename && data) {
        attachments.push({
          filename,
          contentType,
          size: parseInt(sizeStr, 10) || 0,
          data,
        });
      }
    }
    if (attachments.length === 0) {
      attachments = undefined;
    }
  }

  // Create conversation if it doesn't exist
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

  // Commit user message with attachments from SOAP request
  const userResult = await commitMessage(conversationId, {
    role,
    content,
    timestamp: new Date(),
    attachments,
  });

  fastify.log.info({
    conversationId,
    sequenceNumber: userResult.sequenceNumber,
    attachmentCount: attachments?.length || 0
  }, 'User message committed');

  // If this is a user message, get AI response
  let aiResponse = '';
  let aiResult: any = null;

  if (role === 'user') {
    try {
      // Get conversation items for context
      const items = await getConversationItems(conversationId);

      // Format messages for AI (OpenAI vision format)
      const messages = await Promise.all(
        items
          .filter(item => item.itemType === 'message')
          .map(async (item) => {
            const msg = item as any;

            // If message has attachments (images), format as vision content
            if (msg.attachments && msg.attachments.length > 0) {
              const { join } = await import('path');
              const fs = await import('fs/promises');
              const conversationDir = join(process.cwd(), 'conversations', conversationId);

              const contentParts: any[] = [{ type: 'text', text: msg.content }];

              for (const attachment of msg.attachments) {
                // Only include images for vision
                if (attachment.contentType.startsWith('image/')) {
                  const filePath = join(conversationDir, attachment.path);
                  const buffer = await fs.readFile(filePath);
                  const base64Data = buffer.toString('base64');

                  contentParts.push({
                    type: 'image_url',
                    image_url: {
                      url: `data:${attachment.contentType};base64,${base64Data}`
                    }
                  });
                }
              }

              return {
                role: msg.role,
                content: contentParts
              };
            } else {
              return {
                role: msg.role,
                content: msg.content
              };
            }
          })
      );

      fastify.log.info({ provider: aiProvider, model, messageCount: messages.length }, 'Calling AI provider');

      // Check if provider is available
      if (!aiOrchestrator.hasProvider(aiProvider)) {
        throw new Error(`Provider ${aiProvider} not available or not configured`);
      }

      // Call AI provider via orchestrator
      const result = await aiOrchestrator.chat(aiProvider, messages as any, { model });
      aiResponse = result.content;
      const usedModel = result.model;

      // Commit AI response
      aiResult = await commitMessage(conversationId, {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        aiProvider,
        model: usedModel,
      });

      fastify.log.info({ conversationId, sequenceNumber: aiResult.sequenceNumber }, 'AI response committed');
    } catch (error) {
      fastify.log.error(error, 'AI provider error');
      // Return error but include user message result
      return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>AI provider error: ${error instanceof Error ? error.message : 'Unknown error'}</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
    }
  }

  // Return response with AI message if generated
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitMessageResponse>
      <tns:commitHash>${aiResult?.commitHash || userResult.commitHash}</tns:commitHash>
      <tns:sequenceNumber>${aiResult?.sequenceNumber || userResult.sequenceNumber}</tns:sequenceNumber>
      <tns:timestamp>${(aiResult?.timestamp || userResult.timestamp).toISOString()}</tns:timestamp>
    </tns:CommitMessageResponse>
  </soap:Body>
</soap:Envelope>`;
};
