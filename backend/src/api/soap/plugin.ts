import type { FastifyPluginAsync } from 'fastify';
import { getWsdlContent } from './service.js';
import { registerSoapHandlers, soapHandlerRegistry } from './handlers/index.js';
import type { SoapOperationContext } from './handlers/registry.js';

const soapPlugin: FastifyPluginAsync = async (fastify) => {
  // Register all SOAP operation handlers
  registerSoapHandlers();

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

  // Helper functions for SOAP operations
  const extractText = (xml: string, tagName: string): string => {
    const match = xml.match(new RegExp(`<(?:\\w+:)?${tagName}(?:\\s[^>]*)?>([^<]*)</(?:\\w+:)?${tagName}>`));
    return match ? match[1].trim() : '';
  };

  const extractCDATA = (xml: string, tagName: string): string => {
    const match = xml.match(new RegExp(`<(?:\\w+:)?${tagName}(?:\\s[^>]*)?><!\\[CDATA\\[([^\\]]*)]\\]></(?:\\w+:)?${tagName}>`));
    if (match) return match[1];
    // Fallback to regular text
    return extractText(xml, tagName);
  };

  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Create context for handlers
  const createContext = (): SoapOperationContext => ({
    fastify,
    extractText,
    extractCDATA,
    escapeXml,
  });

  // Handle SOAP requests
  fastify.post('/soap', async (request, reply) => {
    try {
      const soapRequest = request.body as string;

      // Parse SOAP envelope to determine operation
      let operationMatch = soapRequest.match(/<(\w+):(\w+Request)>/);
      if (!operationMatch) {
        operationMatch = soapRequest.match(/<(\w+Request)>/);
      }

      if (!operationMatch) {
        // SOAP Faults should return 200 status with fault envelope per SOAP standards
        reply.code(200).type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>Could not parse SOAP request</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`);
        return;
      }

      const operation = operationMatch[operationMatch.length - 1].replace('Request', '');
      fastify.log.info(`SOAP operation: ${operation}`);

      // Get handler from registry
      const handler = soapHandlerRegistry.get(operation);

      if (!handler) {
        // SOAP Faults should return 200 status with fault envelope per SOAP standards
        const response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>Unknown operation ${operation}</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
        reply.code(200).type('text/xml').send(response);
        return;
      }

      // Execute handler
      const context = createContext();
      const response = await handler(soapRequest, context);

      reply.type('text/xml').send(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error, 'SOAP processing error');

      // SOAP Faults should return 200 status with fault envelope per SOAP standards
      reply.code(200).type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>${escapeXml(errorMessage)}</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`);
    }
  });
};

export default soapPlugin;
