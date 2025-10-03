import type { SoapOperationHandler } from './registry.js';
import { commitToolCall } from '../../../lib/git-storage/message.js';

export const CommitToolCallHandler: SoapOperationHandler = async (request, context) => {
  const { extractText, extractCDATA } = context;

  const conversationId = extractText(request, 'conversationId');
  const toolName = extractText(request, 'toolName');
  const parametersJson = extractCDATA(request, 'parameters');
  const parameters = parametersJson ? JSON.parse(parametersJson) : {};

  // Commit tool call to git storage
  const result = await commitToolCall(conversationId, {
    toolName,
    parameters,
    requestedAt: new Date(),
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitToolCallResponse>
      <tns:commitHash>${result.commitHash}</tns:commitHash>
      <tns:sequenceNumber>${result.sequenceNumber}</tns:sequenceNumber>
      <tns:timestamp>${result.timestamp.toISOString()}</tns:timestamp>
    </tns:CommitToolCallResponse>
  </soap:Body>
</soap:Envelope>`;
};
