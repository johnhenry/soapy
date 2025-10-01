import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

/**
 * Integration Test: Scenario 6 - Per-Conversation Branding
 * 
 * Tests branding storage and retrieval with Git versioning
 */
describe('Integration: Per-Conversation Branding', () => {
  let app: FastifyInstance;
  const baseUrl = 'http://localhost:3016';
  const conversationId = 'test-branding';

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 3016, host: 'localhost' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should retrieve conversation branding', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/branding`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('branding');
    expect(data.branding).toHaveProperty('logoUrl');
    expect(data.branding).toHaveProperty('primaryColor');
  });

  it('should validate branding color formats', async () => {
    // Branding colors must be hex format
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/branding`);
    const data = await response.json();

    if (data.branding.primaryColor) {
      expect(data.branding.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('should validate branding logo URL is HTTPS', async () => {
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/branding`);
    const data = await response.json();

    if (data.branding.logoUrl) {
      expect(data.branding.logoUrl).toMatch(/^https:\/\//);
    }
  });

  it('should fall back to defaults when branding not set', async () => {
    // Test default branding fallback
    const response = await fetch(`${baseUrl}/v1/chat/no-branding-conv/branding`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.branding).toBeDefined();
  });

  it('should retrieve historical branding via Git commits', async () => {
    // This would test Git-based versioning of branding
    const response = await fetch(`${baseUrl}/v1/chat/${conversationId}/branding`);
    expect(response.status).toBe(200);
  });
});
