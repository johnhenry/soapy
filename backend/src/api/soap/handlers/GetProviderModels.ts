import type { SoapOperationHandler } from './registry.js';
import { aiOrchestrator } from '../../../lib/ai-providers/index.js';

export const GetProviderModelsHandler: SoapOperationHandler = async (request, context) => {
  const { extractText, fastify } = context;

  const provider = extractText(request, 'provider');

  // Check if provider is available
  if (!aiOrchestrator.hasProvider(provider as any)) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>Provider ${provider} not available or not configured</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
  }

  try {
    // Get models from provider
    const models = await aiOrchestrator.listModels(provider as any);

    fastify.log.info({ provider, modelCount: models.length }, 'GetProviderModels response');

    // Build models XML
    const modelsXml = models
      .map(model => `      <tns:models>
        <tns:id>${model.id}</tns:id>
        <tns:name>${model.name || model.id}</tns:name>
        <tns:provider>${provider}</tns:provider>
      </tns:models>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:GetProviderModelsResponse>
${modelsXml}
    </tns:GetProviderModelsResponse>
  </soap:Body>
</soap:Envelope>`;
  } catch (error) {
    fastify.log.error(error, 'Failed to fetch models from provider');
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>Failed to fetch models from provider: ${error instanceof Error ? error.message : 'Unknown error'}</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
  }
};
