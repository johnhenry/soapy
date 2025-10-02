import type { FastifyPluginAsync } from 'fastify';
import { gitStorage } from '../../lib/git-storage/index.js';
import { commitMessage, getMessages } from '../../lib/git-storage/message.js';
import { createBranch, getBranches } from '../../lib/git-storage/branch.js';
import { aiOrchestrator } from '../../lib/ai-providers/index.js';
import type { MessageRole } from '../../models/message.js';

const restPlugin: FastifyPluginAsync = async (fastify) => {
  // DELETE /v1/chat/:id - Delete conversation
  fastify.delete('/v1/chat/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (await gitStorage.conversationExists(id)) {
      await gitStorage.deleteConversation(id);
      reply.code(204).send();
    } else {
      reply.code(404).send({ error: 'Conversation not found' });
    }
  });

  // GET /v1/conversations - List all conversations
  fastify.get('/v1/conversations', async (_request, reply) => {
    const conversations = await gitStorage.listConversations();

    // Get first message from each conversation for title
    const conversationsWithMeta = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await getMessages(conv.id);
        const firstMessage = messages.find((m) => m.role === 'user');
        const title = firstMessage?.content.slice(0, 50) || 'New Conversation';
        const updatedAt = messages.length > 0
          ? messages[messages.length - 1].timestamp
          : conv.createdAt;

        return {
          id: conv.id,
          title,
          updatedAt: updatedAt.toISOString(),
        };
      })
    );

    reply.send({ conversations: conversationsWithMeta });
  });

  // POST /v1/chat/:id/messages - Submit message
  fastify.post('/v1/chat/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { role: MessageRole; content: string };

    // Create conversation if it doesn't exist
    if (!(await gitStorage.conversationExists(id))) {
      await gitStorage.createConversation({
        id,
        organizationId: 'default',
        ownerId: 'default',
        createdAt: new Date(),
        mainBranch: 'main',
        branches: ['main'],
      });
    }

    // Store user message
    const result = await commitMessage(id, {
      role: body.role,
      content: body.content,
      timestamp: new Date(),
    });

    // If user message, generate AI response
    if (body.role === 'user') {
      try {
        // Try OpenAI first, fallback to Anthropic
        let aiResponse;
        let provider = 'openai';
        let model = 'gpt-4';

        if (aiOrchestrator.hasProvider('openai')) {
          aiResponse = await aiOrchestrator.generate('openai', body.content);
        } else if (aiOrchestrator.hasProvider('anthropic')) {
          provider = 'anthropic';
          model = 'claude-3-5-sonnet-20241022';
          aiResponse = await aiOrchestrator.generate('anthropic', body.content);
        } else {
          // No AI provider available, just return user message stored
          return reply.code(201).send({
            conversationId: id,
            sequenceNumber: result.sequenceNumber,
            commitHash: result.commitHash,
            timestamp: result.timestamp.toISOString(),
          });
        }

        // Store assistant response
        await commitMessage(id, {
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          aiProvider: provider,
          model: aiResponse.model || model,
        });
      } catch (error) {
        console.error('AI generation error:', error);
        // Continue even if AI fails - user message is already stored
      }
    }

    reply.code(201).send({
      conversationId: id,
      sequenceNumber: result.sequenceNumber,
      commitHash: result.commitHash,
      timestamp: result.timestamp.toISOString(),
    });
  });

  // GET /v1/chat/:id - Get conversation
  fastify.get('/v1/chat/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { format, branch } = request.query as { format?: string; branch?: string };

    // Get messages from Git storage
    let messages: Awaited<ReturnType<typeof getMessages>> = [];
    if (await gitStorage.conversationExists(id)) {
      messages = await getMessages(id, branch);
    }

    // Format messages - include all metadata regardless of format
    const formattedMessages = messages.map((msg) => ({
      sequenceNumber: msg.sequenceNumber,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      commitHash: msg.commitHash,
      ...(msg.aiProvider && { aiProvider: msg.aiProvider }),
      ...(msg.model && { model: msg.model }),
    }));

    reply.send({
      conversationId: id,
      format: format || 'openai',
      messages: formattedMessages,
    });
  });

  // GET /v1/chat/:id/stream - Stream conversation
  fastify.get('/v1/chat/:id/stream', async (_request, reply) => {
    reply.type('text/event-stream').send('data: {"type":"start"}\n\n');
  });

  // POST /v1/chat/:id/branch - Create branch
  fastify.post('/v1/chat/:id/branch', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { branchName: string; fromMessage: number };

    const result = await createBranch(
      id,
      body.branchName,
      body.fromMessage,
      'rest-user' // TODO: Get from auth context
    );

    reply.code(201).send({
      conversationId: id,
      branchName: body.branchName,
      branchRef: result.branchRef,
      createdAt: result.createdAt.toISOString(),
    });
  });

  // GET /v1/chat/:id/branches - List branches
  fastify.get('/v1/chat/:id/branches', async (request, reply) => {
    const { id } = request.params as { id: string };

    const branches = await getBranches(id);

    reply.send({
      conversationId: id,
      branches: branches.map((b) => ({
        name: b.name,
        sourceMessageNumber: b.sourceMessageNumber,
        createdAt: b.createdAt.toISOString(),
        messageCount: b.messageCount,
      })),
    });
  });

  // GET /v1/chat/:id/branding - Get branding
  fastify.get('/v1/chat/:id/branding', async (request, reply) => {
    const { id } = request.params as { id: string };

    reply.send({
      conversationId: id,
      branding: {
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#FF5733',
      },
    });
  });

  // POST /v1/chat/:id/tools/call - Submit tool call
  fastify.post('/v1/chat/:id/tools/call', async (request, reply) => {
    const { id } = request.params as { id: string };

    reply.code(201).send({
      conversationId: id,
      sequenceNumber: 2,
      commitHash: 'tool123',
      timestamp: new Date().toISOString(),
    });
  });

  // POST /v1/chat/:id/tools/result - Submit tool result
  fastify.post('/v1/chat/:id/tools/result', async (request, reply) => {
    const { id } = request.params as { id: string };

    reply.code(201).send({
      conversationId: id,
      sequenceNumber: 3,
      commitHash: 'result123',
      timestamp: new Date().toISOString(),
    });
  });

  // POST /v1/chat/:id/files - Upload file
  fastify.post('/v1/chat/:id/files', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      filename: string;
      contentType: string;
      data: string; // Base64-encoded
    };

    // Decode base64 to get file size
    const buffer = Buffer.from(body.data, 'base64');
    const size = buffer.length;

    // Generate SHA-256 hash
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    reply.code(201).send({
      conversationId: id,
      commitHash: `file-${hash.substring(0, 8)}`,
      fileMetadata: {
        filename: body.filename,
        path: `files/${body.filename}`,
        size,
        contentType: body.contentType,
        hash: `sha256-${hash}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'rest-user',
      },
    });
  });

  // GET /v1/chat/:id/files - List files
  fastify.get('/v1/chat/:id/files', async (request, reply) => {
    const { id } = request.params as { id: string };

    reply.send({
      conversationId: id,
      files: [],
    });
  });

  // GET /v1/chat/:id/files/:filename - Download file
  fastify.get('/v1/chat/:id/files/:filename', async (request, reply) => {
    const { filename } = request.params as { id: string; filename: string };

    // Stub implementation - return a small sample file
    const sampleData = Buffer.from('Hello from Soapy file storage!', 'utf-8');

    reply
      .code(200)
      .header('Content-Type', 'text/plain')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(sampleData);
  });
};

export default restPlugin;
