import type { FastifyPluginAsync } from 'fastify';
import { gitStorage } from '../../lib/git-storage/index.js';
import { commitMessage, getMessages, getConversationItems, commitToolCall, commitToolResult } from '../../lib/git-storage/message.js';
import { createBranch, getBranches, deleteBranch } from '../../lib/git-storage/branch.js';
import { aiOrchestrator } from '../../lib/ai-providers/index.js';
import type { MessageRole } from '../../models/message.js';
import { join } from 'path';
import fs from 'fs';

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
    const body = request.body as {
      role: MessageRole;
      content: string;
      branch?: string;
      provider?: 'openai' | 'anthropic';
      model?: string;
      attachments?: Array<{
        filename: string;
        contentType: string;
        size: number;
        data: string; // Base64-encoded
      }>;
    };

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
      // Debug: log attachments
      if (body.attachments) {
        console.log('Received attachments:', body.attachments.map(a => ({ filename: a.filename, size: a.size, contentType: a.contentType })));
      }

      // Store user message (with branch context and attachments)
      result = await commitMessage(id, {
        role: body.role,
        content: body.content,
        timestamp: new Date(),
        attachments: body.attachments,
      }, body.branch);

      // Note: AI response generation is now handled by POST /v1/chat/:id/completion
      // This endpoint only stores messages
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

  // POST /v1/chat/:id/completion - Get AI completion (non-streaming, supports tools)
  fastify.post('/v1/chat/:id/completion', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      provider?: 'openai' | 'anthropic';
      model?: string;
      branch?: string;
    };

    if (!(await gitStorage.conversationExists(id))) {
      reply.code(404).send({ error: 'Conversation not found' });
      return;
    }

    try {
      const provider = body.provider || 'openai';
      const model = body.model || (provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022');

      // Get conversation items (messages + tool calls + tool results)
      const items = await getConversationItems(id, body.branch);

      if (items.length === 0) {
        reply.code(400).send({ error: 'No messages in conversation' });
        return;
      }

      // Helper function to read file attachments
      const fs = await import('fs');
      const { join } = await import('path');
      const CONVERSATIONS_DIR = process.env.CONVERSATIONS_DIR || './conversations';
      const conversationDir = join(CONVERSATIONS_DIR, id);

      async function readAttachment(filename: string): Promise<string | null> {
        try {
          const filePath = join(conversationDir, 'files', filename);
          const buffer = await fs.promises.readFile(filePath);
          return buffer.toString('base64');
        } catch (error) {
          console.error('Failed to read attachment:', filename, error);
          return null;
        }
      }

      // Get available tools
      const tools = [
        {
          name: 'get_weather',
          description: 'Get the current weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and country, e.g. "Paris, France"'
              },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'The temperature unit'
              }
            },
            required: ['location']
          }
        }
      ];

      let assistantContent = '';
      let toolCalls: any[] = [];
      let usedModel = model;

      // Format messages for OpenAI (with vision support and tool calls/results)
      const openaiMessages: any[] = [];
      console.log('Building conversation context. Total items:', items.length);

      for (const item of items) {
        if (item.itemType === 'message') {
          const message = item as any;
          console.log(`Message ${message.sequenceNumber}: role=${message.role}, has attachments=${!!message.attachments}, count=${message.attachments?.length || 0}`);

          // If message has attachments (images), format as vision content
          if (message.attachments && message.attachments.length > 0) {
            const contentParts: any[] = [{ type: 'text', text: message.content }];

            for (const attachment of message.attachments) {
              console.log(`  Attachment: ${attachment.filename}, type=${attachment.contentType}, path=${attachment.path}`);
              // Only include images for vision
              if (attachment.contentType.startsWith('image/')) {
                const base64Data = await readAttachment(attachment.filename);
                if (base64Data) {
                  console.log(`  ✓ Loaded image ${attachment.filename} (${base64Data.length} chars base64)`);
                  contentParts.push({
                    type: 'image_url',
                    image_url: {
                      url: `data:${attachment.contentType};base64,${base64Data}`
                    }
                  });
                } else {
                  console.log(`  ✗ Failed to load image ${attachment.filename}`);
                }
              }
            }

            openaiMessages.push({
              role: message.role,
              content: contentParts
            });
          } else {
            openaiMessages.push({
              role: message.role,
              content: message.content
            });
          }
        } else if (item.itemType === 'tool_result') {
          // Add tool result as a tool message
          const toolResult = item as any;
          openaiMessages.push({
            role: 'tool',
            tool_call_id: `call_${toolResult.toolCallRef}`,
            content: JSON.stringify(toolResult.result)
          });
        }
        // Note: tool_call items are embedded in assistant messages, handled by OpenAI's tool_calls field
      }

      // Call AI provider with tool support
      if (provider === 'openai' && aiOrchestrator.hasProvider('openai')) {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
          model,
          messages: openaiMessages,
          tools: tools.map(t => ({
            type: 'function' as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters
            }
          })),
          tool_choice: 'auto'
        });

        const choice = completion.choices[0];
        assistantContent = choice.message.content || '';
        toolCalls = choice.message.tool_calls?.map((tc: any) => ({
          name: tc.function.name,
          parameters: JSON.parse(tc.function.arguments)
        })) || [];
        usedModel = completion.model;
      } else if (provider === 'anthropic' && aiOrchestrator.hasProvider('anthropic')) {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        // Format messages for Anthropic (with vision support and tool calls/results)
        const anthropicMessages: any[] = [];
        for (const item of items) {
          if (item.itemType === 'message') {
            const message = item as any;

            // If message has attachments (images), format as vision content
            if (message.attachments && message.attachments.length > 0) {
              const contentParts: any[] = [{ type: 'text', text: message.content }];

              for (const attachment of message.attachments) {
                // Only include images for vision
                if (attachment.contentType.startsWith('image/')) {
                  const base64Data = await readAttachment(attachment.filename);
                  if (base64Data) {
                    contentParts.push({
                      type: 'image',
                      source: {
                        type: 'base64',
                        media_type: attachment.contentType,
                        data: base64Data
                      }
                    });
                  }
                }
              }

              anthropicMessages.push({
                role: message.role,
                content: contentParts
              });
            } else {
              anthropicMessages.push({
                role: message.role,
                content: message.content
              });
            }
          } else if (item.itemType === 'tool_result') {
            // Add tool result
            const toolResult = item as any;
            anthropicMessages.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: `toolu_${toolResult.toolCallRef}`,
                content: JSON.stringify(toolResult.result)
              }]
            });
          }
        }

        const response = await anthropic.messages.create({
          model,
          max_tokens: 1000,
          messages: anthropicMessages,
          tools: tools.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters as any
          }))
        });

        const textContent = response.content.find((c: any) => c.type === 'text') as any;
        assistantContent = textContent?.text || '';
        toolCalls = response.content.filter((c: any) => c.type === 'tool_use').map((tc: any) => ({
          name: tc.name,
          parameters: tc.input
        }));
        usedModel = response.model;
      } else {
        reply.code(503).send({ error: 'AI provider not available' });
        return;
      }

      // Store assistant message
      const assistantResult = await commitMessage(id, {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        aiProvider: provider,
        model: usedModel,
      }, body.branch);

      const results: any = {
        sequenceNumber: assistantResult.sequenceNumber,
        commitHash: assistantResult.commitHash,
        content: assistantContent,
        toolCalls: []
      };

      // If there are tool calls, store them and execute
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          // Store tool call
          const toolCallResult = await commitToolCall(id, {
            toolName: toolCall.name,
            parameters: toolCall.parameters,
            requestedAt: new Date(),
          });

          // Execute tool (mock for now)
          let toolResult: any = {};
          let status: 'success' | 'failure' = 'success';

          if (toolCall.name === 'get_weather') {
            toolResult = {
              temperature: Math.floor(Math.random() * 30) + 5,
              condition: ['Sunny', 'Cloudy', 'Partly cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
              humidity: Math.floor(Math.random() * 40) + 40,
              windSpeed: Math.floor(Math.random() * 20) + 5
            };
          }

          // Store tool result
          const toolResultData = await commitToolResult(id, {
            toolCallRef: toolCallResult.sequenceNumber,
            result: toolResult,
            executedAt: new Date(),
            status,
            retryCount: 0,
          });

          results.toolCalls.push({
            sequenceNumber: toolCallResult.sequenceNumber,
            commitHash: toolCallResult.commitHash,
            toolName: toolCall.name,
            parameters: toolCall.parameters,
            result: {
              sequenceNumber: toolResultData.sequenceNumber,
              commitHash: toolResultData.commitHash,
              status,
              data: toolResult
            }
          });
        }

        // Get final response with tool results
        const updatedMessages = await getMessages(id, body.branch);
        const toolResultsFormatted = results.toolCalls.map((tc: any) => ({
          toolName: tc.toolName,
          result: tc.result.data
        }));

        let finalResponse = '';
        if (provider === 'openai') {
          const OpenAI = (await import('openai')).default;
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

          const completion = await openai.chat.completions.create({
            model: usedModel,
            messages: [
              ...updatedMessages.map(m => ({ role: m.role as any, content: m.content })),
              { role: 'assistant' as const, content: `Tool results: ${JSON.stringify(toolResultsFormatted)}` }
            ]
          });

          finalResponse = completion.choices[0].message.content || '';
        } else if (provider === 'anthropic') {
          const Anthropic = (await import('@anthropic-ai/sdk')).default;
          const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

          const response = await anthropic.messages.create({
            model: usedModel,
            max_tokens: 1000,
            messages: [
              ...updatedMessages.map(m => ({ role: m.role as any, content: m.content })),
              { role: 'assistant' as const, content: `Tool results: ${JSON.stringify(toolResultsFormatted)}` }
            ]
          });

          const finalTextContent = response.content.find((c: any) => c.type === 'text') as any;
          finalResponse = finalTextContent?.text || '';
        }

        // Store final assistant response
        const finalResult = await commitMessage(id, {
          role: 'assistant',
          content: finalResponse,
          timestamp: new Date(),
          aiProvider: provider,
          model: usedModel,
        }, body.branch);

        results.finalResponse = {
          sequenceNumber: finalResult.sequenceNumber,
          commitHash: finalResult.commitHash,
          content: finalResponse
        };
      }

      // Return to main branch if we were on a different branch
      if (body.branch) {
        const git = await import('isomorphic-git');
        const fs = await import('fs');
        const { join } = await import('path');
        const CONVERSATIONS_DIR = process.env.CONVERSATIONS_DIR || './conversations';
        const dir = join(CONVERSATIONS_DIR, id);
        await git.default.checkout({ fs: fs.default, dir, ref: 'main' });
      }

      reply.send(results);
    } catch (error) {
      console.error('Completion error:', error);
      reply.code(500).send({ error: 'AI completion failed' });
    }
  });

  // GET /v1/chat/:id - Get conversation
  fastify.get('/v1/chat/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { format, branch, includeTools } = request.query as { format?: string; branch?: string; includeTools?: string };

    if (!(await gitStorage.conversationExists(id))) {
      reply.send({
        conversationId: id,
        format: format || 'openai',
        messages: [],
      });
      return;
    }

    // If includeTools is true, return conversation items (messages + tool calls + tool results)
    if (includeTools === 'true') {
      const items = await getConversationItems(id, branch);

      const formattedItems = items.map((item) => ({
        sequenceNumber: item.sequenceNumber,
        itemType: item.itemType,
        timestamp: ('timestamp' in item ? item.timestamp :
                   'requestedAt' in item ? item.requestedAt :
                   item.executedAt).toISOString(),
        commitHash: item.commitHash,
        ...('role' in item && { role: item.role }),
        ...('content' in item && { content: item.content }),
        ...('aiProvider' in item && { aiProvider: item.aiProvider }),
        ...('model' in item && { model: item.model }),
        ...('attachments' in item && item.attachments && { attachments: item.attachments }),
        ...('toolName' in item && { toolName: item.toolName }),
        ...('parameters' in item && { parameters: item.parameters }),
        ...('requestedAt' in item && { requestedAt: item.requestedAt.toISOString() }),
        ...('toolCallRef' in item && { toolCallRef: item.toolCallRef }),
        ...('result' in item && { result: item.result }),
        ...('status' in item && { status: item.status }),
        ...('executedAt' in item && { executedAt: item.executedAt.toISOString() }),
        ...('retryCount' in item && { retryCount: item.retryCount }),
      }));

      reply.send({
        conversationId: id,
        format: format || 'openai',
        items: formattedItems,
      });
      return;
    }

    // Default: return messages only (backward compatibility)
    const messages = await getMessages(id, branch);

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
    const body = request.body as {
      role: MessageRole;
      content: string;
      branch?: string;
      provider?: 'openai' | 'anthropic';
      model?: string;
    };

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
          let provider = body.provider || 'openai';
          let model = body.model || (provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022');
          let fullResponse = '';

          // Build full conversation context with vision support
          const items = await getConversationItems(id, body.branch);
          const conversationDir = join(process.env.CONVERSATIONS_DIR || './conversations', id);

          // Helper to read file attachments
          async function readAttachment(filename: string): Promise<string | null> {
            try {
              const filePath = join(conversationDir, 'files', filename);
              const buffer = await fs.promises.readFile(filePath);
              return buffer.toString('base64');
            } catch (error) {
              console.error('[STREAM] Failed to read attachment:', filename, error);
              return null;
            }
          }

          // Format messages for AI with vision support
          const formattedMessages: any[] = [];
          console.log('[STREAM] Building conversation context. Total items:', items.length);

          for (const item of items) {
            if (item.itemType === 'message') {
              const message = item as any;
              console.log(`[STREAM] Message ${message.sequenceNumber}: role=${message.role}, has attachments=${!!message.attachments}, count=${message.attachments?.length || 0}`);

              // If message has attachments (images), format as vision content
              if (message.attachments && message.attachments.length > 0) {
                const contentParts: any[] = [{ type: 'text', text: message.content }];

                for (const attachment of message.attachments) {
                  console.log(`[STREAM]   Attachment: ${attachment.filename}, type=${attachment.contentType}`);
                  if (attachment.contentType.startsWith('image/')) {
                    const base64Data = await readAttachment(attachment.filename);
                    if (base64Data) {
                      console.log(`[STREAM]   ✓ Loaded image ${attachment.filename} (${base64Data.length} chars base64)`);
                      contentParts.push({
                        type: 'image_url',
                        image_url: {
                          url: `data:${attachment.contentType};base64,${base64Data}`
                        }
                      });
                    } else {
                      console.log(`[STREAM]   ✗ Failed to load image ${attachment.filename}`);
                    }
                  }
                }

                formattedMessages.push({
                  role: message.role,
                  content: contentParts
                });
              } else {
                formattedMessages.push({
                  role: message.role,
                  content: message.content
                });
              }
            }
          }

          // Note: Streaming with tools is not currently supported
          // Tools require non-streaming API to handle tool use properly
          if (provider === 'openai' && aiOrchestrator.hasProvider('openai')) {
            const OpenAI = (await import('openai')).default;
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            const stream = await openai.chat.completions.create({
              model,
              messages: formattedMessages,
              stream: true,
            });

            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta?.content || '';
              if (delta) {
                fullResponse += delta;
                reply.raw.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
              }
            }
          } else if (provider === 'anthropic' && aiOrchestrator.hasProvider('anthropic')) {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

            // Anthropic requires system messages to be separate
            const systemMessage = formattedMessages.find(m => m.role === 'system');
            const userMessages = formattedMessages.filter(m => m.role !== 'system');

            const stream = await anthropic.messages.stream({
              model,
              max_tokens: 4096,
              ...(systemMessage && { system: systemMessage.content }),
              messages: userMessages,
            });

            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                const delta = chunk.delta.text;
                fullResponse += delta;
                reply.raw.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
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
            model,
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
    const { id, filename } = request.params as { id: string; filename: string };

    try {
      const { join } = await import('path');
      const conversationDir = join(process.cwd(), 'conversations', id);
      const filePath = join(conversationDir, 'files', filename);

      // Check if file exists
      const fs = await import('fs');
      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ error: 'File not found' });
      }

      // Read file
      const fileData = await fs.promises.readFile(filePath);

      // Determine content type from extension
      const ext = filename.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'json': 'application/json',
      };
      const contentType = contentTypes[ext || ''] || 'application/octet-stream';

      reply
        .code(200)
        .header('Content-Type', contentType)
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(fileData);
    } catch (error) {
      console.error('File download error:', error);
      reply.code(500).send({ error: 'Failed to download file' });
    }
  });

  // Legacy stub for backward compatibility
  fastify.get('/v1/chat/:id/files-stub/:filename', async (request, reply) => {
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
