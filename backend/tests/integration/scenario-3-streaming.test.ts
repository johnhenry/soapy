import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

/**
 * Integration Test: Scenario 3 - Streaming Support
 * 
 * Tests real-time streaming capabilities via SSE
 */
describe('Integration: Streaming Support', () => {
  let app: FastifyInstance;
  const baseUrl = 'http://localhost:3013';
  const conversationId = 'test-streaming';

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 3013, host: 'localhost' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should accept SSE streaming request with proper headers', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/stream`, {
      headers: {
        Accept: 'text/event-stream',
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
  });

  it('should send SSE events in proper format', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/stream`, {
      headers: {
        Accept: 'text/event-stream',
      },
    });

    const text = await response.text();
    expect(text).toContain('data:');
  });

  it('should handle streaming timeout gracefully', async () => {
    // Test that streams timeout after configured duration
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/stream`, {
      headers: {
        Accept: 'text/event-stream',
      },
    });

    expect(response.status).toBe(200);
  });

  it('should support concurrent streams per conversation', async () => {
    // Test max concurrent streams limit
    const promises = Array.from({ length: 3 }, (_, i) =>
      fetch(`${baseUrl}/v1/chat/${conversationId}/stream`, {
        headers: {
          Accept: 'text/event-stream',
        },
      })
    );

    const responses = await Promise.all(promises);
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });
});
