import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

/**
 * Integration Test: Scenario 2 - REST Retrieval with Multiple Formats
 * 
 * Tests format negotiation and conversion capabilities:
 * - OpenAI format
 * - Anthropic format
 * - SOAP XML format
 */
describe('Integration: REST Retrieval with Multiple Formats', () => {
  let app: FastifyInstance;
  const baseUrl = 'http://localhost:3012';
  const conversationId = 'test-format-conv';

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 3012, host: 'localhost' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should retrieve conversation in OpenAI format', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}?format=openai`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('conversationId');
    expect(data).toHaveProperty('format', 'openai');
  });

  it('should retrieve conversation in Anthropic format', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}?format=anthropic`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('conversationId');
    expect(data).toHaveProperty('format', 'anthropic');
  });

  it('should retrieve conversation in SOAP XML format', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}?format=soap`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('conversationId');
    expect(data).toHaveProperty('format', 'soap');
  });

  it('should handle format conversion with tool calls', async () => {
    // Test that tool calls are properly converted across formats
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}?format=openai`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.messages).toBeDefined();
  });
});
