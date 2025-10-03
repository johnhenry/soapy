import type { SoapOperationHandler } from './registry.js';
import { aiOrchestrator } from '../../../lib/ai-providers/index.js';

export const ListProvidersHandler: SoapOperationHandler = async (request, context) => {
  const { fastify } = context;

  // Get available providers from orchestrator
  const providers = aiOrchestrator.getAvailableProviders();

  fastify.log.info({ providerCount: providers.length, providers }, 'ListProviders response');

  // Build providers XML
  const providersXml = providers
    .map(provider => `      <tns:providers>${provider}</tns:providers>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:ListProvidersResponse>
${providersXml}
    </tns:ListProvidersResponse>
  </soap:Body>
</soap:Envelope>`;
};
