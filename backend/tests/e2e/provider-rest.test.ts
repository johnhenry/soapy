import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { config } from 'dotenv';
import { buildApp } from '../../src/app.js';
import { initializeProviders } from '../../src/lib/ai-providers/index.js';

// Load environment variables before running tests
config();

/**
 * E2E Test: REST API with Real AI Providers
 *
 * Tests the complete flow of submitting messages via REST API
 * and receiving real AI responses from configured providers.
 *
 * REQUIRES: Valid API keys in .env file
 * - OPENAI_API_KEY or ANTHROPIC_API_KEY or OLLAMA_BASE_URL
 */
describe('E2E: REST API with Real Providers', () => {
  let app: FastifyInstance;
  const baseUrl = 'http://localhost:3021';
  const conversationId = 'test-rest-provider-' + Date.now();

  beforeAll(async () => {
    initializeProviders();
    app = await buildApp();
    await app.listen({ port: 3021, host: 'localhost' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should submit user message and get AI response via REST', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        content: 'What is 2+2? Answer with just the number.',
        provider: 'openai',
        model: 'gpt-4o-mini',
      }),
    });

    expect(response.status).toBe(201);
    const result = await response.json();

    // Verify response structure
    expect(result).toHaveProperty('conversationId', conversationId);
    expect(result).toHaveProperty('sequenceNumber');
    expect(result).toHaveProperty('commitHash');
    expect(result).toHaveProperty('aiResponse');
    expect(result).toHaveProperty('aiSequenceNumber');
    expect(result).toHaveProperty('aiCommitHash');

    // Verify AI actually responded
    expect(result.aiResponse).toBeTruthy();
    expect(result.aiResponse.length).toBeGreaterThan(0);
    expect(result.aiResponse).toContain('4');
  });

  it('should retrieve conversation with messages in OpenAI format', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}?format=openai`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('messages');
    expect(Array.isArray(data.messages)).toBe(true);
    expect(data.messages.length).toBeGreaterThanOrEqual(2);

    // Verify message structure
    const userMsg = data.messages.find((m: any) => m.role === 'user');
    const assistantMsg = data.messages.find((m: any) => m.role === 'assistant');

    expect(userMsg).toBeTruthy();
    expect(assistantMsg).toBeTruthy();
    expect(assistantMsg.content).toContain('4');
  });

  it('should support streaming responses', async () => {
    const streamConvId = 'test-rest-stream-' + Date.now();

    const response = await fetch(`${baseUrl}/v1/chat/${streamConvId}/messages/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        content: 'Count from 1 to 3, one number per line.',
        provider: 'openai',
        model: 'gpt-4o-mini',
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let gotDelta = false;
    let gotDone = false;

    if (reader) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'delta') {
              gotDelta = true;
              fullContent += data.content || '';
            } else if (data.type === 'done') {
              gotDone = true;
            }
          }
        }
      }
    }

    expect(gotDelta).toBe(true);
    expect(gotDone).toBe(true);
    expect(fullContent.length).toBeGreaterThan(0);
  });

  it('should handle multiple providers (if configured)', async () => {
    const providers = ['openai', 'anthropic', 'ollama'];
    const availableProviders: string[] = [];

    for (const provider of providers) {
      const testConvId = `test-provider-${provider}-${Date.now()}`;
      try {
        const response = await fetch(`${baseUrl}/v1/chat/${testConvId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'user',
            content: 'Say "OK"',
            provider,
            model: provider === 'openai' ? 'gpt-4o-mini' : provider === 'anthropic' ? 'claude-3-haiku-20240307' : 'llama2',
          }),
        });

        if (response.status === 201) {
          const result = await response.json();
          if (result.aiResponse) {
            availableProviders.push(provider);
          }
        }
      } catch (err) {
        // Provider not available, skip
      }
    }

    // Should have at least one provider available
    expect(availableProviders.length).toBeGreaterThan(0);
  });
});
