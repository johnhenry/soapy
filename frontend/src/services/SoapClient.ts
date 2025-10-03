import type { Message, Conversation, Branch, ToolCall, ToolResult, FileAttachment, ConversationItem, AIProvider, OutputFormat } from '../types';

/**
 * Browser-compatible SOAP client using raw XML/HTTP
 */
export class SoapClient {
  private soapUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.soapUrl = `${baseUrl}/soap`;
    this.apiKey = apiKey;
  }

  private async soapCall(action: string, body: string): Promise<Document> {
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soapy.example.com/wsdl/v1">
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(this.soapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `http://soapy.example.com/${action}`,
        'X-API-Key': this.apiKey,
      },
      body: envelope,
    });

    if (!response.ok) {
      throw new Error(`SOAP call failed: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    return parser.parseFromString(xmlText, 'text/xml');
  }

  private getElementText(doc: Document, tagName: string): string {
    const element = doc.getElementsByTagName(tagName)[0];
    return element?.textContent || '';
  }

  private getElementInt(doc: Document, tagName: string): number {
    const text = this.getElementText(doc, tagName);
    return parseInt(text, 10) || 0;
  }

  async listConversations(): Promise<Array<{ id: string; title: string; updatedAt: string }>> {
    const body = `<tns:ListConversationsRequest>
    </tns:ListConversationsRequest>`;

    const doc = await this.soapCall('ListConversations', body);

    const conversations: Array<{ id: string; title: string; updatedAt: string }> = [];
    const conversationElements = doc.getElementsByTagName('tns:conversations');

    for (let i = 0; i < conversationElements.length; i++) {
      const convEl = conversationElements[i];
      const getText = (tag: string) => {
        const el = convEl.getElementsByTagName(`tns:${tag}`)[0];
        return el?.textContent || '';
      };

      conversations.push({
        id: getText('id'),
        title: getText('title'),
        updatedAt: getText('updatedAt'),
      });
    }

    return conversations;
  }

  async deleteConversation(id: string): Promise<void> {
    // SOAP doesn't have deleteConversation in WSDL yet
    throw new Error('deleteConversation not implemented in SOAP protocol');
  }

  async getConversation(id: string, format: OutputFormat = 'soap', branch?: string): Promise<Conversation> {
    const branchElement = branch ? `<tns:branchName>${branch}</tns:branchName>` : '';
    const body = `<tns:GetConversationRequest>
      <tns:conversationId>${id}</tns:conversationId>
      ${branchElement}
      <tns:format>${format}</tns:format>
    </tns:GetConversationRequest>`;

    const doc = await this.soapCall('GetConversation', body);

    // Parse SOAP response (simplified)
    return {
      id,
      organizationId: '',
      ownerId: '',
      createdAt: new Date().toISOString(),
      mainBranch: 'main',
      branches: [],
    };
  }

  async getMessages(id: string, format: OutputFormat = 'soap', branch?: string): Promise<Message[]> {
    const branchElement = branch ? `<tns:branchName>${branch}</tns:branchName>` : '';
    const body = `<tns:GetConversationRequest>
      <tns:conversationId>${id}</tns:conversationId>
      ${branchElement}
      <tns:format>${format}</tns:format>
    </tns:GetConversationRequest>`;

    const doc = await this.soapCall('GetConversation', body);

    // Parse messages from SOAP XML
    const messages: Message[] = [];

    // SOAP response uses namespace prefixes (tns:messages, tns:role, etc.)
    const messageElements = doc.getElementsByTagName('tns:messages');

    for (let i = 0; i < messageElements.length; i++) {
      const msgEl = messageElements[i];
      const getText = (tag: string) => {
        const el = msgEl.getElementsByTagName(`tns:${tag}`)[0];
        return el?.textContent || '';
      };

      // Parse attachments if present
      const attachmentElements = msgEl.getElementsByTagName('tns:attachments');
      const attachments: Array<{ filename: string; contentType: string; size: number; path: string }> = [];

      for (let j = 0; j < attachmentElements.length; j++) {
        const attEl = attachmentElements[j];
        const getAttText = (tag: string) => {
          const el = attEl.getElementsByTagName(`tns:${tag}`)[0];
          return el?.textContent || '';
        };

        attachments.push({
          filename: getAttText('filename'),
          contentType: getAttText('contentType'),
          size: parseInt(getAttText('size'), 10) || 0,
          path: getAttText('path'),
        });
      }

      messages.push({
        sequenceNumber: parseInt(getText('sequenceNumber'), 10) || 0,
        role: getText('role') as 'user' | 'assistant' | 'system',
        content: getText('content'),
        timestamp: getText('timestamp'),
        aiProvider: getText('aiProvider') || undefined,
        model: getText('model') || undefined,
        commitHash: getText('commitHash'),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    }

    return messages;
  }

  async getConversationItems(id: string, format: OutputFormat = 'soap', branch?: string): Promise<ConversationItem[]> {
    // SOAP WSDL only returns messages, not tool calls/results
    const messages = await this.getMessages(id, format, branch);
    return messages.map(msg => ({ ...msg, itemType: 'message' as const }));
  }

  async sendMessage(
    id: string,
    role: string,
    content: string,
    branch?: string,
    provider?: AIProvider,
    model?: string,
    files?: File[]
  ): Promise<{ sequenceNumber: number; commitHash: string }> {
    const branchElement = branch ? `<tns:branchName>${branch}</tns:branchName>` : '';
    const providerElement = provider ? `<tns:aiProvider>${provider}</tns:aiProvider>` : '';
    const modelElement = model ? `<tns:model>${model}</tns:model>` : '';

    // Convert files to base64 and include as attachments
    let attachmentsXml = '';
    if (files && files.length > 0) {
      for (const file of files) {
        // Read file as base64
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        const base64 = btoa(binary);

        attachmentsXml += `
      <tns:attachments>
        <tns:filename>${file.name}</tns:filename>
        <tns:contentType>${file.type}</tns:contentType>
        <tns:size>${file.size}</tns:size>
        <tns:data>${base64}</tns:data>
      </tns:attachments>`;
      }
    }

    const body = `<tns:CommitMessageRequest>
      <tns:conversationId>${id}</tns:conversationId>
      <tns:role>${role}</tns:role>
      <tns:content><![CDATA[${content}]]></tns:content>
      ${branchElement}
      ${providerElement}
      ${modelElement}${attachmentsXml}
    </tns:CommitMessageRequest>`;

    const doc = await this.soapCall('CommitMessage', body);

    return {
      sequenceNumber: this.getElementInt(doc, 'sequenceNumber'),
      commitHash: this.getElementText(doc, 'commitHash'),
    };
  }

  async *sendMessageStream(
    id: string,
    role: string,
    content: string,
    branch?: string,
    provider?: AIProvider,
    model?: string
  ): AsyncGenerator<{ type: string; content?: string; sequenceNumber?: number; commitHash?: string; message?: string }> {
    // Pure SOAP direct response (non-streaming): submit message, backend returns AI response synchronously
    await this.sendMessage(id, role, content, branch, provider, model);

    // Backend CommitMessage now calls AI and stores response
    // Use GetCompletion to retrieve the AI response
    yield* this.getCompletionNonStream(id, branch, provider, model);
  }

  async *getCompletionNonStream(
    id: string,
    branch?: string,
    provider?: AIProvider,
    model?: string
  ): AsyncGenerator<{ type: string; content?: string; sequenceNumber?: number; commitHash?: string; message?: string }> {
    // Use the dedicated GetCompletion SOAP endpoint
    const body = `<tns:GetCompletionRequest>
      <conversationId>${id}</conversationId>
      ${branch ? `<branchName>${branch}</branchName>` : ''}
    </tns:GetCompletionRequest>`;

    const doc = await this.soapCall('GetCompletion', body);

    const content = this.getElementText(doc, 'tns:content');
    const sequenceNumber = this.getElementInt(doc, 'tns:sequenceNumber');
    const commitHash = this.getElementText(doc, 'tns:commitHash');

    if (content) {
      yield {
        type: 'delta',
        content,
      };

      yield {
        type: 'done',
        sequenceNumber,
        commitHash,
      };
    } else {
      yield {
        type: 'error',
        message: 'No completion found',
      };
    }
  }

  async createBranch(id: string, branchName: string, fromMessage: number): Promise<Branch> {
    const body = `<tns:BranchConversationRequest>
      <tns:conversationId>${id}</tns:conversationId>
      <tns:branchName>${branchName}</tns:branchName>
      <tns:fromMessageNumber>${fromMessage}</tns:fromMessageNumber>
    </tns:BranchConversationRequest>`;

    const doc = await this.soapCall('BranchConversation', body);

    return {
      name: branchName,
      sourceMessageNumber: fromMessage,
      createdAt: this.getElementText(doc, 'createdAt'),
      creatorId: '',
      messageCount: 0,
    };
  }

  async getBranches(id: string): Promise<Branch[]> {
    // SOAP doesn't have getBranches in WSDL yet
    throw new Error('getBranches not implemented in SOAP protocol');
  }

  async deleteBranch(id: string, branchName: string): Promise<void> {
    // SOAP doesn't have deleteBranch in WSDL yet
    throw new Error('deleteBranch not implemented in SOAP protocol');
  }

  async submitToolCall(id: string, toolName: string, parameters: Record<string, unknown>): Promise<{ sequenceNumber: number; commitHash: string }> {
    const body = `<tns:CommitToolCallRequest>
      <tns:conversationId>${id}</tns:conversationId>
      <tns:toolName>${toolName}</tns:toolName>
      <tns:parameters><![CDATA[${JSON.stringify(parameters)}]]></tns:parameters>
    </tns:CommitToolCallRequest>`;

    const doc = await this.soapCall('CommitToolCall', body);

    return {
      sequenceNumber: this.getElementInt(doc, 'tns:sequenceNumber'),
      commitHash: this.getElementText(doc, 'tns:commitHash'),
    };
  }

  async submitToolResult(id: string, toolCallRef: number, result: Record<string, unknown>, status: 'success' | 'error' | 'timeout'): Promise<{ sequenceNumber: number; commitHash: string }> {
    const body = `<tns:CommitToolResultRequest>
      <tns:conversationId>${id}</tns:conversationId>
      <tns:toolCallRef>${toolCallRef}</tns:toolCallRef>
      <tns:result><![CDATA[${JSON.stringify(result)}]]></tns:result>
      <tns:status>${status}</tns:status>
    </tns:CommitToolResultRequest>`;

    const doc = await this.soapCall('CommitToolResult', body);

    return {
      sequenceNumber: this.getElementInt(doc, 'tns:sequenceNumber'),
      commitHash: this.getElementText(doc, 'tns:commitHash'),
    };
  }

  async uploadFile(id: string, file: File): Promise<FileAttachment> {
    // Read file as base64
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);

    const body = `<tns:CommitFileRequest>
      <tns:conversationId>${id}</tns:conversationId>
      <tns:filename>${file.name}</tns:filename>
      <tns:contentType>${file.type}</tns:contentType>
      <tns:data>${base64}</tns:data>
    </tns:CommitFileRequest>`;

    const doc = await this.soapCall('CommitFile', body);

    const metadataEl = doc.getElementsByTagName('tns:fileMetadata')[0];
    const getText = (tag: string) => metadataEl?.getElementsByTagName(`tns:${tag}`)[0]?.textContent || '';

    return {
      filename: getText('filename'),
      path: getText('path'),
      size: parseInt(getText('size'), 10) || 0,
      contentType: getText('contentType'),
      hash: getText('hash'),
      uploadedAt: getText('uploadedAt'),
      uploadedBy: getText('uploadedBy'),
      commitHash: this.getElementText(doc, 'tns:commitHash'),
    };
  }

  async listFiles(id: string): Promise<FileAttachment[]> {
    // SOAP doesn't have listFiles in WSDL yet
    throw new Error('listFiles not implemented in SOAP protocol');
  }

  async downloadFile(id: string, filename: string): Promise<Blob> {
    const body = `<tns:GetFileRequest>
      <tns:conversationId>${id}</tns:conversationId>
      <tns:filename>${filename}</tns:filename>
    </tns:GetFileRequest>`;

    const doc = await this.soapCall('GetFile', body);

    const base64 = this.getElementText(doc, 'tns:data');
    const contentType = this.getElementText(doc, 'tns:contentType');

    // Decode base64 to blob
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: contentType });
  }

  streamMessages(id: string, onMessage: (data: unknown) => void, onError: (error: Error) => void): () => void {
    // SOAP doesn't support server push streaming
    throw new Error('streamMessages not supported in SOAP protocol');
  }

  async listProviders(): Promise<string[]> {
    const body = `<tns:ListProvidersRequest>
    </tns:ListProvidersRequest>`;

    const doc = await this.soapCall('ListProviders', body);

    const providers: string[] = [];
    const providerElements = doc.getElementsByTagName('tns:providers');

    for (let i = 0; i < providerElements.length; i++) {
      const provider = providerElements[i]?.textContent || '';
      if (provider) {
        providers.push(provider);
      }
    }

    return providers;
  }

  async listModels(provider: string): Promise<Array<{ id: string; name: string }>> {
    const body = `<tns:GetProviderModelsRequest>
      <tns:provider>${provider}</tns:provider>
    </tns:GetProviderModelsRequest>`;

    const doc = await this.soapCall('GetProviderModels', body);

    const models: Array<{ id: string; name: string }> = [];
    const modelElements = doc.getElementsByTagName('tns:models');

    for (let i = 0; i < modelElements.length; i++) {
      const modelEl = modelElements[i];
      const getText = (tag: string) => {
        const el = modelEl.getElementsByTagName(`tns:${tag}`)[0];
        return el?.textContent || '';
      };

      models.push({
        id: getText('id'),
        name: getText('name'),
      });
    }

    return models;
  }
}
