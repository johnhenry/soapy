import type { SoapOperationHandler } from './registry.js';
import { commitToolResult } from '../../../lib/git-storage/message.js';

export const CommitToolResultHandler: SoapOperationHandler = async (request, context) => {
  const { extractText, extractCDATA } = context;

  const conversationId = extractText(request, 'conversationId');
  const toolCallRef = parseInt(extractText(request, 'toolCallRef'), 10);
  const resultJson = extractCDATA(request, 'result');
  const resultData = resultJson ? JSON.parse(resultJson) : {};
  const status = extractText(request, 'status') as 'success' | 'error' | 'timeout';

  // Commit tool result to git storage
  const result = await commitToolResult(conversationId, {
    toolCallRef,
    result: resultData,
    status,
    executedAt: new Date(),
    retryCount: 0,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    <tns:CommitToolResultResponse>
      <tns:commitHash>${result.commitHash}</tns:commitHash>
      <tns:sequenceNumber>${result.sequenceNumber}</tns:sequenceNumber>
      <tns:timestamp>${result.timestamp.toISOString()}</tns:timestamp>
    </tns:CommitToolResultResponse>
  </soap:Body>
</soap:Envelope>`;
};
