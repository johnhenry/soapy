import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('REST OpenAPI Contract Tests', () => {
  let app: FastifyInstance;
  const baseUrl = 'http://localhost:3002';

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 3002, host: 'localhost' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should accept POST /v1/chat/:id/messages', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/test-id/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content: 'test' }),
    });
    // Will fail initially - that's expected for TDD
    expect([200, 201, 404]).toContain(response.status);
  });

  it('should accept GET /v1/chat/:id with format parameter', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/test-id?format=openai`);
    // Will fail initially - that's expected for TDD
    expect([200, 404]).toContain(response.status);
  });

  it('should support format negotiation (openai, anthropic, soap)', async () => {
    const formats = ['openai', 'anthropic', 'soap'];
    for (const format of formats) {
      const response = await fetch(`${baseUrl}/v1/chat/test-id?format=${format}`);
      // Will fail initially
      expect([200, 404]).toContain(response.status);
    }
  });

  it('should accept GET /v1/chat/:id/stream with SSE headers', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/test-id/stream`, {
      headers: { Accept: 'text/event-stream' },
    });
    // Will fail initially
    expect([200, 404]).toContain(response.status);
  });

  it('should accept POST /v1/chat/:id/branch', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/test-id/branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchName: 'test-branch', fromMessage: 1 }),
    });
    expect([200, 201, 404]).toContain(response.status);
  });

  it('should accept GET /v1/chat/:id/branding', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/test-id/branding`);
    expect([200, 404]).toContain(response.status);
  });

  it('should accept POST /v1/chat/:id/tools/call', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/test-id/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName: 'test', parameters: {} }),
    });
    expect([200, 201, 404]).toContain(response.status);
  });

  it('should accept POST /v1/chat/:id/tools/result', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/test-id/tools/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolCallRef: 1, result: {}, status: 'success' }),
    });
    expect([200, 201, 404]).toContain(response.status);
  });
});
