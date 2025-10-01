import type { FastifyPluginAsync } from 'fastify';
import { getWsdlContent } from './service.js';

const soapPlugin: FastifyPluginAsync = async (fastify) => {
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

  // Handle SOAP requests
  fastify.post('/soap', async (_request, reply) => {
    try {
      // For now, return a simple SOAP response
      // In a full implementation, we'd parse the request and call the appropriate service method
      reply.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Response xmlns="http://soapy.example.com/wsdl/v1">
      <result>success</result>
    </Response>
  </soap:Body>
</soap:Envelope>`);
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
