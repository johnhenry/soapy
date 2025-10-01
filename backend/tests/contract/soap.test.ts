import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('SOAP WSDL Contract Tests', () => {
  let app: FastifyInstance;
  const baseUrl = 'http://localhost:3001';

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 3001, host: 'localhost' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should serve WSDL at /soap?wsdl', async () => {
    const response = await fetch(`${baseUrl}/soap?wsdl`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/xml');

    const wsdl = await response.text();
    expect(wsdl).toContain('<?xml');
    expect(wsdl).toContain('definitions');
    expect(wsdl).toContain('SoapyService');
  });

  it('should define CommitMessage operation in WSDL', async () => {
    const response = await fetch(`${baseUrl}/soap?wsdl`);
    const wsdl = await response.text();

    expect(wsdl).toContain('CommitMessage');
    expect(wsdl).toContain('CommitMessageRequest');
    expect(wsdl).toContain('CommitMessageResponse');
  });

  it('should define BranchConversation operation in WSDL', async () => {
    const response = await fetch(`${baseUrl}/soap?wsdl`);
    const wsdl = await response.text();

    expect(wsdl).toContain('BranchConversation');
    expect(wsdl).toContain('BranchConversationRequest');
    expect(wsdl).toContain('BranchConversationResponse');
  });

  it('should define GetConversation operation in WSDL', async () => {
    const response = await fetch(`${baseUrl}/soap?wsdl`);
    const wsdl = await response.text();

    expect(wsdl).toContain('GetConversation');
    expect(wsdl).toContain('GetConversationRequest');
    expect(wsdl).toContain('GetConversationResponse');
  });

  it('should define GetBranding operation in WSDL', async () => {
    const response = await fetch(`${baseUrl}/soap?wsdl`);
    const wsdl = await response.text();

    expect(wsdl).toContain('GetBranding');
    expect(wsdl).toContain('GetBrandingRequest');
    expect(wsdl).toContain('GetBrandingResponse');
  });

  it('should define CommitToolCall operation in WSDL', async () => {
    const response = await fetch(`${baseUrl}/soap?wsdl`);
    const wsdl = await response.text();

    expect(wsdl).toContain('CommitToolCall');
    expect(wsdl).toContain('CommitToolCallRequest');
    expect(wsdl).toContain('CommitToolCallResponse');
  });

  it('should define CommitToolResult operation in WSDL', async () => {
    const response = await fetch(`${baseUrl}/soap?wsdl`);
    const wsdl = await response.text();

    expect(wsdl).toContain('CommitToolResult');
    expect(wsdl).toContain('CommitToolResultRequest');
    expect(wsdl).toContain('CommitToolResultResponse');
  });
});
