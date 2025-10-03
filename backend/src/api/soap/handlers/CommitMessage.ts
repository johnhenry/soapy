import type { SoapOperationHandler } from './registry.js';
import { commitMessage, getConversationItems } from '../../../lib/git-storage/message.js';
import { gitStorage } from '../../../lib/git-storage/index.js';
import { aiOrchestrator } from '../../../lib/ai-providers/index.js';

export const CommitMessageHandler: SoapOperationHandler = async (request, context) => {
  const { extractText, extractCDATA, fastify } = context;

  const conversationId = extractText(request, 'conversationId');
  const role = extractText(request, 'role') as 'user' | 'assistant' | 'system';
  const content = extractCDATA(request, 'content');
  const aiProvider = (extractText(request, 'aiProvider') || 'openai') as any;
  const model = extractText(request, 'model') || (aiProvider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022');

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

  // Check for uploaded files (from CommitFile calls) and include them as attachments
  let attachments: Array<{ filename: string; contentType: string; size: number; data: string; path: string }> | undefined;
  try {
    const { join } = await import('path');
    const fs = await import('fs/promises');
    const conversationDir = join(process.cwd(), 'conversations', conversationId);
    const filesDir = join(conversationDir, 'files');

    try {
      const fileList = await fs.readdir(filesDir);
      if (fileList.length > 0) {
        attachments = [];
        for (const filename of fileList) {
          const filePath = join(filesDir, filename);
          const stats = await fs.stat(filePath);
          const buffer = await fs.readFile(filePath);

          // Infer content type from extension
          const ext = filename.split('.').pop()?.toLowerCase();
          const contentTypeMap: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'json': 'application/json',
          };
          const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';

          attachments.push({
            filename,
            contentType,
            size: stats.size,
            data: buffer.toString('base64'),
            path: `files/${filename}`,
          });

          // Delete the file after reading it so it's only attached once
          await fs.unlink(filePath);
        }
        fastify.log.info({ conversationId, attachmentCount: attachments.length }, 'Attaching uploaded files to message');
      }
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        fastify.log.warn(err, 'Error reading files directory');
      }
    }
  } catch (err) {
    fastify.log.warn(err, 'Failed to check for uploaded files');
  }

  // Commit user message with attachments
  // Note: commitMessage will re-save the attachments and add them to git
  const userResult = await commitMessage(conversationId, {
    role,
    content,
    timestamp: new Date(),
    attachments,
  });

  fastify.log.info({ conversationId, sequenceNumber: userResult.sequenceNumber }, 'User message committed');

  // If this is a user message, get AI response
  let aiResponse = '';
  let aiResult: any = null;

  if (role === 'user') {
    try {
      // Get conversation items for context
      const items = await getConversationItems(conversationId);

      // Format messages for AI (simple text-only for now)
      const messages = items
        .filter(item => item.itemType === 'message')
        .map(item => {
          const msg = item as any;
          return {
            role: msg.role,
            content: msg.content,
          };
        });

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
