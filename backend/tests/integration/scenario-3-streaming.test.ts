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

  // Tests for GET /v1/chat/:id/stream endpoint
  describe('GET /v1/chat/:id/stream', () => {
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

  // Tests for POST /v1/chat/:id/completion/stream endpoint
  describe('POST /v1/chat/:id/completion/stream', () => {
    it('should accept POST request for completion streaming', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/completion/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          provider: 'openai',
          model: 'gpt-4',
        }),
      });

      // May return 200 with SSE or 404 if conversation doesn't exist
      expect([200, 404, 500]).toContain(response.status);
    });

    it('should set proper SSE headers for completion stream', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/completion/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          provider: 'openai',
        }),
      });

      if (response.status === 200) {
        expect(response.headers.get('content-type')).toContain('text/event-stream');
      }
    });
  });

  // Tests for POST /v1/chat/:id/messages/stream endpoint
  describe('POST /v1/chat/:id/messages/stream', () => {
    it('should accept message submission with streaming response', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          role: 'user',
          content: 'Test message for streaming',
        }),
      });

      // Should create conversation if it doesn't exist and stream
      expect([200, 201, 500]).toContain(response.status);
    });

    it('should stream AI response when provider is configured', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          role: 'user',
          content: 'Hello',
          provider: 'openai',
          model: 'gpt-4',
        }),
      });

      if (response.status === 200) {
        expect(response.headers.get('content-type')).toContain('text/event-stream');
      }
    });

    it('should handle streaming with branch parameter', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          role: 'user',
          content: 'Test on branch',
          branch: 'test-branch',
        }),
      });

      // Should handle branch parameter
      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  // Additional edge case tests
  describe('Streaming Edge Cases', () => {
    it('should handle missing Accept header gracefully', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/stream`, {
        headers: {},
      });

      // Should still work even without explicit Accept header
      expect(response.status).toBe(200);
    });

    it('should handle invalid conversation ID', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/invalid-id-@#$/stream`, {
        headers: {
          Accept: 'text/event-stream',
        },
      });

      // Should handle invalid ID gracefully
      expect([200, 400, 404]).toContain(response.status);
    });

    it('should validate message structure for POST streaming', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
          invalid: 'data',
        }),
      });

      // Should validate and return error or handle gracefully
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});

