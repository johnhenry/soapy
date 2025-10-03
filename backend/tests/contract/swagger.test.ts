import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('Swagger/OpenAPI Documentation Tests', () => {
  let app: FastifyInstance;
  const baseUrl = 'http://localhost:3018';

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 3018, host: 'localhost' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should serve Swagger UI at /docs', async () => {
    const response = await fetch(`${baseUrl}/docs`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');

    const html = await response.text();
    expect(html).toContain('Swagger UI');
    expect(html).toContain('swagger-ui');
  });

  it('should serve OpenAPI JSON at /docs/json', async () => {
    const response = await fetch(`${baseUrl}/docs/json`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const spec = await response.json();
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('Soapy REST API');
  });

  it('should include all expected paths in OpenAPI spec', async () => {
    const response = await fetch(`${baseUrl}/docs/json`);
    const spec = await response.json();

    const expectedPaths = [
      '/chat/{chatId}',
      '/chat/{chatId}/message',
      '/chat/{chatId}/completion',
      '/chat/{chatId}/branch',
      '/chat/{chatId}/branches',
      '/chat/{chatId}/branding',
      '/chat/{chatId}/files',
      '/chat/{chatId}/files/{filename}',
      '/chat/{chatId}/tool-call',
      '/chat/{chatId}/tool-result',
      '/conversation/{conversationId}',
    ];

    const paths = Object.keys(spec.paths);
    expect(paths.length).toBe(expectedPaths.length);

    for (const expectedPath of expectedPaths) {
      expect(paths).toContain(expectedPath);
    }
  });

  it('should include expected tags in OpenAPI spec', async () => {
    const response = await fetch(`${baseUrl}/docs/json`);
    const spec = await response.json();

    const expectedTags = [
      'Conversations',
      'Messages',
      'Branches',
      'Branding',
      'Files',
      'Tools',
    ];

    const tags = spec.tags.map((t: { name: string }) => t.name);
    
    for (const expectedTag of expectedTags) {
      expect(tags).toContain(expectedTag);
    }
  });

  it('should include security definitions in OpenAPI spec', async () => {
    const response = await fetch(`${baseUrl}/docs/json`);
    const spec = await response.json();

    expect(spec.components).toBeDefined();
    expect(spec.components.securitySchemes).toBeDefined();
    expect(spec.components.securitySchemes.ApiKeyAuth).toBeDefined();
    expect(spec.components.securitySchemes.ApiKeyAuth.type).toBe('apiKey');
    expect(spec.components.securitySchemes.ApiKeyAuth.in).toBe('header');
    expect(spec.components.securitySchemes.ApiKeyAuth.name).toBe('X-API-Key');
  });

  it('should include server definitions in OpenAPI spec', async () => {
    const response = await fetch(`${baseUrl}/docs/json`);
    const spec = await response.json();

    expect(spec.servers).toBeDefined();
    expect(spec.servers.length).toBeGreaterThan(0);
    expect(spec.servers[0].url).toContain('/v1');
  });
});
