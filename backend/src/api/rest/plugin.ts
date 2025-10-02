import type { FastifyPluginAsync } from 'fastify';
import { gitStorage } from '../../lib/git-storage/index.js';
import { commitMessage, getMessages } from '../../lib/git-storage/message.js';
import { createBranch, getBranches, deleteBranch } from '../../lib/git-storage/branch.js';
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
    const body = request.body as { role: MessageRole; content: string; branch?: string };

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

    let result;
    try {
      // Store user message (with branch context)
      result = await commitMessage(id, {
        role: body.role,
        content: body.content,
        timestamp: new Date(),
      }, body.branch);

      // If user message, generate AI response
      if (body.role === 'user') {
        try {
          // Try OpenAI first, fallback to Anthropic
          let aiResponse;
          let provider = 'openai';
          let model = 'gpt-4o-mini';

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

          // Store assistant response (on same branch)
          await commitMessage(id, {
            role: 'assistant',
            content: aiResponse.content,
            timestamp: new Date(),
            aiProvider: provider,
            model: aiResponse.model || model,
          }, body.branch);
        } catch (error) {
          console.error('AI generation error:', error);
          // Continue even if AI fails - user message is already stored
        }
      }
    } finally {
      // Always return to main branch after message operations
      if (body.branch) {
        const git = await import('isomorphic-git');
        const fs = await import('fs');
        const { join } = await import('path');
        const CONVERSATIONS_DIR = process.env.CONVERSATIONS_DIR || './conversations';
        const dir = join(CONVERSATIONS_DIR, id);
        await git.default.checkout({ fs: fs.default, dir, ref: 'main' });
      }
    }

    reply.code(201).send({
      conversationId: id,
      sequenceNumber: result!.sequenceNumber,
      commitHash: result!.commitHash,
      timestamp: result!.timestamp.toISOString(),
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

  // POST /v1/chat/:id/messages/stream - Submit message with streaming response
  fastify.post('/v1/chat/:id/messages/stream', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { role: MessageRole; content: string; branch?: string };

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

    // Set up SSE with CORS headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*');
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');

    let result;
    try {
      // Store user message
      result = await commitMessage(id, {
        role: body.role,
        content: body.content,
        timestamp: new Date(),
      }, body.branch);

      // Send user message confirmation
      reply.raw.write(`data: ${JSON.stringify({ type: 'user_message', sequenceNumber: result.sequenceNumber, commitHash: result.commitHash })}\n\n`);

      // If user message, generate and stream AI response
      if (body.role === 'user') {
        try {
          let provider = 'openai';
          let fullResponse = '';

          if (aiOrchestrator.hasProvider('openai')) {
            const aiProvider = aiOrchestrator.getProvider('openai');
            if (aiProvider) {
              for await (const chunk of aiProvider.stream(body.content)) {
                fullResponse += chunk.delta;
                reply.raw.write(`data: ${JSON.stringify({ type: 'delta', content: chunk.delta })}\n\n`);

                if (chunk.done) {
                  break;
                }
              }
            }
          } else if (aiOrchestrator.hasProvider('anthropic')) {
            provider = 'anthropic';
            const aiProvider = aiOrchestrator.getProvider('anthropic');
            if (aiProvider) {
              for await (const chunk of aiProvider.stream(body.content)) {
                fullResponse += chunk.delta;
                reply.raw.write(`data: ${JSON.stringify({ type: 'delta', content: chunk.delta })}\n\n`);

                if (chunk.done) {
                  break;
                }
              }
            }
          } else {
            reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'No AI provider available' })}\n\n`);
            reply.raw.end();
            return;
          }

          // Store assistant response
          const assistantResult = await commitMessage(id, {
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
            aiProvider: provider,
            model: provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-20241022',
          }, body.branch);

          reply.raw.write(`data: ${JSON.stringify({ type: 'done', sequenceNumber: assistantResult.sequenceNumber, commitHash: assistantResult.commitHash })}\n\n`);
        } catch (error) {
          console.error('AI generation error:', error);
          reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'AI generation failed' })}\n\n`);
        }
      } else {
        reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      }
    } finally {
      // Return to main branch after message operations
      if (body.branch) {
        const git = await import('isomorphic-git');
        const fs = await import('fs');
        const { join } = await import('path');
        const CONVERSATIONS_DIR = process.env.CONVERSATIONS_DIR || './conversations';
        const dir = join(CONVERSATIONS_DIR, id);
        await git.default.checkout({ fs: fs.default, dir, ref: 'main' });
      }
      reply.raw.end();
    }
  });

  // POST /v1/chat/:id/branch - Create branch
  fastify.post('/v1/chat/:id/branch', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { branchName: string; fromMessage: number };

    try {
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
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found in commit history')) {
          reply.code(400).send({ error: 'Message not found or not yet committed' });
        } else if (error.message.includes('already exists')) {
          reply.code(409).send({ error: 'Branch already exists' });
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
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

  // DELETE /v1/chat/:id/branch/:branchName - Delete branch
  fastify.delete('/v1/chat/:id/branch/:branchName', async (request, reply) => {
    const { id, branchName } = request.params as { id: string; branchName: string };

    try {
      await deleteBranch(id, branchName);
      reply.code(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Cannot delete main branch') {
        reply.code(400).send({ error: error.message });
      } else {
        throw error;
      }
    }
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
