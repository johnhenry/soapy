import { RestClient } from './RestClient';
import { SoapClient } from './SoapClient';
import type { Message, Conversation, Branch, ToolCall, ToolResult, FileAttachment, ConversationItem, AIProvider, OutputFormat } from '../types';

/**
 * Protocol-agnostic API client that switches between REST and SOAP implementations
 * Supports separate request/response protocols and streaming
 */
export class ApiClient {
  private restClient: RestClient;
  private soapClient: SoapClient;
  private requestProtocol: 'rest' | 'soap';
  private responseProtocol: 'rest' | 'soap';
  private directResponse: boolean;
  private streaming: boolean;

  constructor(
    baseUrl: string,
    apiKey: string,
    requestProtocol: 'rest' | 'soap' = 'rest',
    responseProtocol: 'rest' | 'soap' = 'rest',
    directResponse: boolean = true,
    streaming: boolean = true
  ) {
    this.restClient = new RestClient(baseUrl, apiKey);
    this.soapClient = new SoapClient(baseUrl, apiKey);
    this.requestProtocol = requestProtocol;
    this.responseProtocol = responseProtocol;
    this.directResponse = directResponse;
    this.streaming = streaming;
  }

  /**
   * Get the request client (for submitting operations)
   */
  private get requestClient(): RestClient | SoapClient {
    return this.requestProtocol === 'soap' ? this.soapClient : this.restClient;
  }

  /**
   * Get the response client (for retrieving data)
   */
  private get responseClient(): RestClient | SoapClient {
    return this.responseProtocol === 'soap' ? this.soapClient : this.restClient;
  }

  // Read operations use responseClient
  async listConversations(): Promise<Array<{ id: string; title: string; updatedAt: string }>> {
    return this.responseClient.listConversations();
  }

  async listProviders(): Promise<AIProvider[]> {
    // Always use REST for provider list (SOAP doesn't have this endpoint)
    return this.restClient.listProviders();
  }

  async listModels(provider: AIProvider): Promise<string[]> {
    // Always use REST for model list (SOAP doesn't have this endpoint)
    return this.restClient.listModels(provider);
  }

  async getConversation(id: string, branch?: string): Promise<Conversation> {
    if (this.responseProtocol === 'soap') {
      return this.soapClient.getConversation(id, 'soap', branch);
    }
    return this.restClient.getConversation(id, 'openai');
  }

  async getMessages(id: string, branch?: string): Promise<Message[]> {
    if (this.responseProtocol === 'soap') {
      return this.soapClient.getMessages(id, 'soap', branch);
    }
    return this.restClient.getMessages(id, 'openai', branch);
  }

  async getConversationItems(id: string, branch?: string): Promise<ConversationItem[]> {
    if (this.responseProtocol === 'soap') {
      return this.soapClient.getConversationItems(id, 'soap', branch);
    }
    return this.restClient.getConversationItems(id, 'openai', branch);
  }

  // Write operations use requestClient
  async deleteConversation(id: string): Promise<void> {
    // SOAP doesn't support this yet, fall back to REST
    if (this.requestProtocol === 'soap') {
      console.warn('deleteConversation not supported in SOAP, using REST');
      return this.restClient.deleteConversation(id);
    }
    return this.requestClient.deleteConversation(id);
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
    // Use requestClient to submit the message
    return this.requestClient.sendMessage(id, role, content, branch, provider, model, files);
  }

  async *sendMessageStream(
    id: string,
    role: string,
    content: string,
    branch?: string,
    provider?: AIProvider,
    model?: string
  ): AsyncGenerator<{ type: string; content?: string; sequenceNumber?: number; commitHash?: string; message?: string }> {
    // Direct Response mode: single round-trip request
    // Hybrid mode: two separate calls (submit then fetch)

    if (this.directResponse) {
      // Direct response - single round trip
      if (this.streaming && this.requestProtocol === 'rest') {
        // Pure REST streaming (direct)
        yield* this.restClient.sendMessageStream(id, role, content, branch, provider, model);
      } else {
        // Pure SOAP direct or REST non-streaming direct
        yield* this.requestClient.sendMessageStream(id, role, content, branch, provider, model);
      }
    } else {
      // Hybrid/ID-based mode: two separate calls
      // Step 1: Submit message via requestClient
      await this.requestClient.sendMessage(id, role, content, branch, provider, model);

      // Step 2: Fetch/stream completion via responseClient
      if (this.responseProtocol === 'rest' && this.streaming) {
        // REST response with streaming (SOAP→REST streaming or REST→REST streaming)
        yield* this.restClient.getCompletionStream(id, branch, provider, model);
      } else if (this.responseProtocol === 'rest') {
        // REST response non-streaming (SOAP→REST non-streaming or REST→REST non-streaming)
        yield* this.restClient.getCompletionNonStream(id, branch, provider, model);
      } else {
        // SOAP response (REST→SOAP or SOAP→SOAP)
        yield* this.soapClient.getCompletionNonStream(id, branch, provider, model);
      }
    }
  }

  async createBranch(id: string, branchName: string, fromMessage: number): Promise<Branch> {
    return this.requestClient.createBranch(id, branchName, fromMessage);
  }

  async getBranches(id: string): Promise<Branch[]> {
    // SOAP doesn't support this yet, fall back to REST
    if (this.responseProtocol === 'soap') {
      console.warn('getBranches not supported in SOAP, using REST');
      return this.restClient.getBranches(id);
    }
    return this.responseClient.getBranches(id);
  }

  async deleteBranch(id: string, branchName: string): Promise<void> {
    // SOAP doesn't support this yet, fall back to REST
    if (this.requestProtocol === 'soap') {
      console.warn('deleteBranch not supported in SOAP, using REST');
      return this.restClient.deleteBranch(id, branchName);
    }
    return this.requestClient.deleteBranch(id, branchName);
  }

  async getBranding(id: string): Promise<any> {
    return this.responseClient.getBranding(id);
  }

  async submitToolCall(id: string, toolName: string, parameters: Record<string, unknown>): Promise<{ sequenceNumber: number; commitHash: string }> {
    return this.requestClient.submitToolCall(id, toolName, parameters);
  }

  async submitToolResult(id: string, toolCallRef: number, result: Record<string, unknown>, status: 'success' | 'failure'): Promise<{ sequenceNumber: number; commitHash: string }> {
    return this.requestClient.submitToolResult(id, toolCallRef, result, status);
  }

  async uploadFile(id: string, file: File): Promise<FileAttachment> {
    return this.requestClient.uploadFile(id, file);
  }

  async listFiles(id: string): Promise<FileAttachment[]> {
    // SOAP doesn't support this yet, fall back to REST
    if (this.responseProtocol === 'soap') {
      console.warn('listFiles not supported in SOAP, using REST');
      return this.restClient.listFiles(id);
    }
    return this.responseClient.listFiles(id);
  }

  async downloadFile(id: string, filename: string): Promise<Blob> {
    return this.responseClient.downloadFile(id, filename);
  }

  streamMessages(id: string, onMessage: (data: unknown) => void, onError: (error: Error) => void): () => void {
    // Use responseProtocol for streaming
    if (this.responseProtocol === 'soap' || !this.streaming) {
      console.warn('streamMessages requires REST response protocol with streaming enabled, using REST');
      return this.restClient.streamMessages(id, onMessage, onError);
    }
    return this.responseClient.streamMessages(id, onMessage, onError);
  }
}
