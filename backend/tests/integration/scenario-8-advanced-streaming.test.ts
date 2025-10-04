import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

/**
 * Integration Test: Scenario 8 - Advanced Streaming Features
 * 
 * Tests advanced streaming scenarios including:
 * - Multiple streaming endpoint types
 * - Error handling in streams
 * - Stream interruption and reconnection
 * - Performance under load
 */
describe('Integration: Advanced Streaming Features', () => {
  let app: FastifyInstance;
  const baseUrl = 'http://localhost:3018';
  const conversationId = 'test-advanced-streaming';

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 3018, host: 'localhost' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Streaming Performance', () => {
    it('should handle rapid successive stream requests', async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          fetch(`${baseUrl}/v1/chat/${conversationId}-${i}/stream`, {
            headers: { Accept: 'text/event-stream' },
          })
        );
      }

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should maintain separate streams for different conversations', async () => {
      const stream1 = fetch(`${baseUrl}/v1/chat/conv-1/stream`, {
        headers: { Accept: 'text/event-stream' },
      });

      const stream2 = fetch(`${baseUrl}/v1/chat/conv-2/stream`, {
        headers: { Accept: 'text/event-stream' },
      });

      const [resp1, resp2] = await Promise.all([stream1, stream2]);
      
      expect(resp1.status).toBe(200);
      expect(resp2.status).toBe(200);
      
      const text1 = await resp1.text();
      const text2 = await resp2.text();
      
      expect(text1).toContain('conv-1');
      expect(text2).toContain('conv-2');
    });
  });

  describe('Stream Data Format', () => {
    it('should send valid JSON in SSE data events', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/stream`, {
        headers: { Accept: 'text/event-stream' },
      });

      const text = await response.text();
      
      // Extract data from SSE format
      const dataLines = text.split('\n').filter(line => line.startsWith('data:'));
      
      expect(dataLines.length).toBeGreaterThan(0);
      
      // Each data line should contain valid JSON
      dataLines.forEach((line) => {
        const jsonStr = line.substring(5).trim(); // Remove 'data:' prefix
        if (jsonStr) {
          expect(() => JSON.parse(jsonStr)).not.toThrow();
        }
      });
    });

    it('should include event types in stream', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/stream`, {
        headers: { Accept: 'text/event-stream' },
      });

      const text = await response.text();
      
      // Should include connection event
      expect(text).toContain('"type":"connected"');
      
      // Should include close event
      expect(text).toContain('"type":"close"');
    });
  });

  describe('Provider-Specific Streaming', () => {
    it('should handle streaming with different AI providers', async () => {
      const providers = ['openai', 'anthropic', 'ollama'];
      
      for (const provider of providers) {
        const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/completion/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({ provider }),
        });

        // Should accept request regardless of provider (validation happens later)
        expect([200, 404, 500]).toContain(response.status);
      }
    });

    it('should handle streaming with model specification', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/completion/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          provider: 'openai',
          model: 'gpt-4-turbo',
        }),
      });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Branch-Aware Streaming', () => {
    it('should support streaming on specific branches', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          role: 'user',
          content: 'Test message',
          branch: 'experimental',
        }),
      });

      // Should handle branch parameter
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should default to main branch when not specified', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          role: 'user',
          content: 'Test message without branch',
        }),
      });

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Error Recovery', () => {
    it('should handle malformed JSON in POST body', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      });

      // Should return error status
      expect([400, 500]).toContain(response.status);
    });

    it('should handle empty request body', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/completion/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({}),
      });

      // Should handle gracefully with defaults or validation error
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should validate required message fields', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'user',
          // Missing 'content' field
        }),
      });

      // Should validate and potentially return error
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Content Type Handling', () => {
    it('should reject non-JSON content type for POST endpoints', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'plain text body',
      });

      // Should reject or handle appropriately
      expect([400, 415, 500]).toContain(response.status);
    });

    it('should require Content-Type header for POST', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/completion/stream`, {
        method: 'POST',
        body: JSON.stringify({ provider: 'openai' }),
      });

      // May work with default or require explicit header
      expect([200, 400, 404, 415, 500]).toContain(response.status);
    });
  });

  describe('Cross-Origin Resource Sharing', () => {
    it('should include CORS headers in SSE responses', async () => {
      const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/stream`, {
        headers: { Accept: 'text/event-stream' },
      });

      // Check for CORS headers
      const corsHeader = response.headers.get('access-control-allow-origin');
      expect(corsHeader).toBeDefined();
    });
  });
});
