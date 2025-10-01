import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('Integration: Agent and Tool Support', () => {
  let app: FastifyInstance;
  const baseUrl = 'http://localhost:3015';
  const conversationId = 'test-tools';

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 3015, host: 'localhost' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should store tool call in Git', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolName: 'search',
        parameters: { query: 'weather', limit: 5 },
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('sequenceNumber');
    expect(data).toHaveProperty('commitHash');
  });

  it('should store tool result linked to tool call', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/tools/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolCallRef: 1,
        result: { results: ['Result 1', 'Result 2'] },
        status: 'success',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('sequenceNumber');
  });

  it('should support deterministic replay', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}?format=openai`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.messages).toBeDefined();
  });
});
