import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';

describe('SOAP WSDL Contract Tests', () => {
  let app: ReturnType<typeof Fastify>;
  const baseUrl = 'http://localhost:3001';

  beforeAll(async () => {
    app = Fastify({ logger: false });
    // SOAP routes will be registered here
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
    expect(wsdl).toContain('wsdl:definitions');
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
