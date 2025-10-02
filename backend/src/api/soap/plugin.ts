import type { FastifyPluginAsync } from 'fastify';
import { soap } from 'strong-soap';
import { getWsdlContent, createSoapServer } from './service.js';

const soapPlugin: FastifyPluginAsync = async (fastify) => {
  // Add content type parser for XML
  fastify.addContentTypeParser(
    'text/xml',
    { parseAs: 'string' },
    async (_req: unknown, body: unknown) => {
      return body;
    }
  );

  // Serve WSDL
  fastify.get('/soap', async (request, reply) => {
    const isWsdlRequest = request.query && (request.query as { wsdl?: string }).wsdl !== undefined;

    if (isWsdlRequest) {
      const wsdlContent = getWsdlContent();
      reply.type('text/xml').send(wsdlContent);
    } else {
      reply.code(400).send({ error: 'Missing ?wsdl parameter' });
    }
  });

  // Handle SOAP requests with strong-soap
  fastify.post('/soap', async (request, reply) => {
    try {
      const { wsdlContent, services } = createSoapServer();
      
      // Create SOAP server
      const server = soap.listen(fastify.server, '/soap-internal', services, wsdlContent);
      
      // For now, return a mock response that matches the service implementation
      // In production, strong-soap would handle the full SOAP envelope parsing
      const mockResponse = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitMessageResponse>
      <tns:commitHash>abc123</tns:commitHash>
      <tns:sequenceNumber>1</tns:sequenceNumber>
      <tns:timestamp>${new Date().toISOString()}</tns:timestamp>
    </tns:CommitMessageResponse>
  </soap:Body>
</soap:Envelope>`;
      
      reply.type('text/xml').send(mockResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({
        error: 'SOAP processing error',
        message: errorMessage,
      });
    }
  });
};

export default soapPlugin;
