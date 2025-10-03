import type { SoapOperationHandler } from './registry.js';

export const GetBrandingHandler: SoapOperationHandler = async (request, context) => {
  // Branding not implemented yet - return empty/default
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:GetBrandingResponse>
      <tns:branding>
        <tns:logoUrl></tns:logoUrl>
        <tns:primaryColor>#3b82f6</tns:primaryColor>
        <tns:versionTimestamp>${new Date().toISOString()}</tns:versionTimestamp>
      </tns:branding>
    </tns:GetBrandingResponse>
  </soap:Body>
</soap:Envelope>`;
};
