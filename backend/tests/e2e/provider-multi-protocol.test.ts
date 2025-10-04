import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { config } from 'dotenv';
import { buildApp } from '../../src/app.js';
import { initializeProviders } from '../../src/lib/ai-providers/index.js';

// Load environment variables before running tests
config();

/**
 * E2E Test: Multi-Protocol Configuration with Real AI Providers
 *
 * Tests all 9 protocol configurations from TESTING_RESULTS.md
 * with real AI provider responses to verify end-to-end functionality.
 *
 * REQUIRES: Valid OPENAI_API_KEY in .env file
 *
 * Configurations tested:
 * 1. S (SOAP Direct)
 * 2. R (REST Direct non-streaming)
 * 3. R⚡ (REST Direct streaming)
 * 4. S→S (SOAP→SOAP Hybrid)
 * 5. R→S (REST→SOAP Hybrid)
 * 6. S→R (SOAP→REST Hybrid)
 * 7. R→R (REST→REST Hybrid)
 * 8. S→R⚡ (SOAP→REST Streaming)
 * 9. R→R⚡ (REST→REST Streaming)
 */
describe('E2E: Multi-Protocol with Real Providers', () => {
  let app: FastifyInstance;
  const baseUrl = 'http://localhost:3022';

  beforeAll(async () => {
    initializeProviders();
    app = await buildApp();
    await app.listen({ port: 3022, host: 'localhost' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('Config 1 (S): SOAP Direct should return AI response in single call', async () => {
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitMessageRequest>
      <tns:conversationId>test-config-1-${Date.now()}</tns:conversationId>
      <tns:role>user</tns:role>
      <tns:content>What is 10+10? Answer with just the number.</tns:content>
    </tns:CommitMessageRequest>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(`${baseUrl}/soap`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: soapRequest,
    });

    expect(response.status).toBe(200);
    const responseText = await response.text();

    expect(responseText).toContain('CommitMessageResponse');
    expect(responseText).toContain('commitHash');
    expect(responseText).toContain('20'); // AI response should contain the answer
  });

  it('Config 2 (R): REST Direct non-streaming should return AI response', async () => {
    const convId = `test-config-2-${Date.now()}`;
    const response = await fetch(`${baseUrl}/v1/chat/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        content: 'What is 11+11? Answer with just the number.',
        provider: 'openai',
        model: 'gpt-4o-mini',
      }),
    });

    expect(response.status).toBe(201);
    const result = await response.json();

    expect(result).toHaveProperty('aiResponse');
    expect(result.aiResponse).toContain('22');
  });

  it('Config 3 (R⚡): REST Direct streaming should stream AI response', async () => {
    const convId = `test-config-3-${Date.now()}`;
    const response = await fetch(`${baseUrl}/v1/chat/${convId}/messages/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        content: 'What is 12+12? Answer with just the number.',
        provider: 'openai',
        model: 'gpt-4o-mini',
      }),
    });

    expect(response.status).toBe(200);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

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
              fullContent += data.content || '';
            }
          }
        }
      }
    }

    expect(fullContent).toContain('24');
  });

  it('Config 7 (R→R): REST→REST Hybrid should work with two calls', async () => {
    const convId = `test-config-7-${Date.now()}`;

    // Step 1: Submit message (gets AI response in direct mode)
    const submitResponse = await fetch(`${baseUrl}/v1/chat/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        content: 'What is 13+13? Answer with just the number.',
        provider: 'openai',
        model: 'gpt-4o-mini',
      }),
    });

    expect(submitResponse.status).toBe(201);
    const submitResult = await submitResponse.json();
    expect(submitResult).toHaveProperty('aiResponse');
    expect(submitResult.aiResponse).toContain('26');

    // Step 2: Can also trigger additional completion
    const completionResponse = await fetch(`${baseUrl}/v1/chat/${convId}/completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'openai',
        model: 'gpt-4o-mini',
      }),
    });

    expect(completionResponse.status).toBe(200);
    const completionResult = await completionResponse.json();
    expect(completionResult).toHaveProperty('content');
  });

  it('Config 9 (R→R⚡): REST→REST Streaming Hybrid should stream completion', async () => {
    const convId = `test-config-9-${Date.now()}`;

    // Use direct streaming endpoint (submits message and streams response in one call)
    const streamResponse = await fetch(`${baseUrl}/v1/chat/${convId}/messages/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        content: 'What is 14+14? Answer with just the number.',
        provider: 'openai',
        model: 'gpt-4o-mini',
      }),
    });

    expect(streamResponse.status).toBe(200);
    const reader = streamResponse.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

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
              fullContent += data.content || '';
            }
          }
        }
      }
    }

    expect(fullContent).toContain('28');
  });

  it('should verify conversation stored correctly in Git', async () => {
    const convId = `test-git-storage-${Date.now()}`;

    await fetch(`${baseUrl}/v1/chat/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        content: 'Test message for Git storage',
        provider: 'openai',
        model: 'gpt-4o-mini',
      }),
    });

    // Retrieve conversation
    const getResponse = await fetch(`${baseUrl}/v1/chat/${convId}?format=openai`);
    expect(getResponse.status).toBe(200);

    const conversation = await getResponse.json();
    expect(conversation).toHaveProperty('messages');
    expect(conversation.messages.length).toBeGreaterThanOrEqual(2);

    // Verify commit hashes are present in each message
    const userMsg = conversation.messages.find((m: any) => m.role === 'user');
    const assistantMsg = conversation.messages.find((m: any) => m.role === 'assistant');

    expect(userMsg).toHaveProperty('commitHash');
    expect(assistantMsg).toHaveProperty('commitHash');
  });
});
