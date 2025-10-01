import type { FastifyPluginAsync } from 'fastify';

const restPlugin: FastifyPluginAsync = async (fastify) => {
  // POST /v1/chat/:id/messages - Submit message
  fastify.post('/v1/chat/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };

    reply.code(201).send({
      conversationId: id,
      sequenceNumber: 1,
      commitHash: 'abc123',
      timestamp: new Date().toISOString(),
    });
  });

  // GET /v1/chat/:id - Get conversation
  fastify.get('/v1/chat/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { format } = request.query as { format?: string };

    reply.send({
      conversationId: id,
      format: format || 'openai',
      messages: [],
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

    reply.code(201).send({
      conversationId: id,
      branchName: body.branchName,
      branchRef: `refs/heads/${body.branchName}`,
      createdAt: new Date().toISOString(),
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
};

export default restPlugin;
