import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { config } from 'dotenv';
import { buildApp } from '../../src/app.js';
import { initializeProviders } from '../../src/lib/ai-providers/index.js';

// Load environment variables before running tests
config();

/**
 * Integration Test: Scenario 1 - SOAP Message Submission
 *
 * Tests the complete flow of submitting a message via SOAP,
 * storing it in Git, and retrieving a commit hash.
 *
 * This is a stub test that demonstrates the TDD workflow.
 * Implementation will be added when git-storage library is ready.
 */
describe('Integration: SOAP Message Submission', () => {
  let app: FastifyInstance;
  const baseUrl = 'http://localhost:3011';

  beforeAll(async () => {
    initializeProviders();
    app = await buildApp();
    await app.listen({ port: 3011, host: 'localhost' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should retrieve WSDL contract', async () => {
    const response = await fetch(`${baseUrl}/soap?wsdl`);
    expect(response.status).toBe(200);
    
    const wsdl = await response.text();
    expect(wsdl).toContain('CommitMessage');
  });

  it('should accept SOAP CommitMessage request', async () => {
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitMessageRequest>
      <tns:conversationId>test-conv-123</tns:conversationId>
      <tns:role>user</tns:role>
      <tns:content>Hello from integration test!</tns:content>
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
    expect(responseText).toContain('soap:Envelope');
  });

  it('should return valid commit hash from SOAP submission', async () => {
    // Submit message via SOAP and verify response structure
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitMessageRequest>
      <tns:conversationId>test-conv-456</tns:conversationId>
      <tns:role>user</tns:role>
      <tns:content>Test message for commit hash verification</tns:content>
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
    
    // Verify SOAP response structure
    expect(responseText).toContain('soap:Envelope');
    expect(responseText).toContain('CommitMessageResponse');
    expect(responseText).toContain('commitHash');
    expect(responseText).toContain('sequenceNumber');
    expect(responseText).toContain('timestamp');
  });
});
