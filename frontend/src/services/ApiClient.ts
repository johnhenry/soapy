import { RestClient } from './RestClient';
import { SoapClient } from './SoapClient';
import type { Message, Conversation, Branch, ToolCall, ToolResult, FileAttachment, ConversationItem } from '../types';

/**
 * Protocol-agnostic API client that switches between REST and SOAP implementations
 */
export class ApiClient {
  private restClient: RestClient;
  private soapClient: SoapClient;
  private protocol: 'rest' | 'soap';

  constructor(baseUrl: string, apiKey: string, protocol: 'rest' | 'soap' = 'rest') {
    this.restClient = new RestClient(baseUrl, apiKey);
    this.soapClient = new SoapClient(baseUrl, apiKey);
    this.protocol = protocol;
  }

  /**
   * Update the protocol dynamically
   */
  setProtocol(protocol: 'rest' | 'soap') {
    this.protocol = protocol;
  }

  /**
   * Get the active client based on current protocol
   */
  private get client(): RestClient | SoapClient {
    return this.protocol === 'soap' ? this.soapClient : this.restClient;
  }

  async listConversations(): Promise<Array<{ id: string; title: string; updatedAt: string }>> {
    return this.client.listConversations();
  }

  async deleteConversation(id: string): Promise<void> {
    // SOAP doesn't support this yet, fall back to REST
    if (this.protocol === 'soap') {
      console.warn('deleteConversation not supported in SOAP, using REST');
      return this.restClient.deleteConversation(id);
    }
    return this.client.deleteConversation(id);
  }

  async getConversation(id: string, branch?: string): Promise<Conversation> {
    if (this.protocol === 'soap') {
      return this.soapClient.getConversation(id, 'soap', branch);
    }
    return this.restClient.getConversation(id, 'openai');
  }

  async getMessages(id: string, branch?: string): Promise<Message[]> {
    if (this.protocol === 'soap') {
      return this.soapClient.getMessages(id, 'soap', branch);
    }
    return this.restClient.getMessages(id, 'openai', branch);
  }

  async getConversationItems(id: string, branch?: string): Promise<ConversationItem[]> {
    if (this.protocol === 'soap') {
      return this.soapClient.getConversationItems(id, 'soap', branch);
    }
    return this.restClient.getConversationItems(id, 'openai', branch);
  }

  async sendMessage(
    id: string,
    role: string,
    content: string,
    branch?: string,
    provider?: 'openai' | 'anthropic',
    model?: string,
    files?: File[]
  ): Promise<{ sequenceNumber: number; commitHash: string }> {
    return this.client.sendMessage(id, role, content, branch, provider, model, files);
  }

  async *sendMessageStream(
    id: string,
    role: string,
    content: string,
    branch?: string,
    provider?: 'openai' | 'anthropic',
    model?: string
  ): AsyncGenerator<{ type: string; content?: string; sequenceNumber?: number; commitHash?: string; message?: string }> {
    // SOAP doesn't support real streaming, but we can still use the generator interface
    yield* this.client.sendMessageStream(id, role, content, branch, provider, model);
  }

  async createBranch(id: string, branchName: string, fromMessage: number): Promise<Branch> {
    return this.client.createBranch(id, branchName, fromMessage);
  }

  async getBranches(id: string): Promise<Branch[]> {
    // SOAP doesn't support this yet, fall back to REST
    if (this.protocol === 'soap') {
      console.warn('getBranches not supported in SOAP, using REST');
      return this.restClient.getBranches(id);
    }
    return this.client.getBranches(id);
  }

  async deleteBranch(id: string, branchName: string): Promise<void> {
    // SOAP doesn't support this yet, fall back to REST
    if (this.protocol === 'soap') {
      console.warn('deleteBranch not supported in SOAP, using REST');
      return this.restClient.deleteBranch(id, branchName);
    }
    return this.client.deleteBranch(id, branchName);
  }

  async getBranding(id: string): Promise<any> {
    return this.client.getBranding(id);
  }

  async submitToolCall(id: string, toolName: string, parameters: Record<string, unknown>): Promise<{ sequenceNumber: number; commitHash: string }> {
    return this.client.submitToolCall(id, toolName, parameters);
  }

  async submitToolResult(id: string, toolCallRef: number, result: Record<string, unknown>, status: 'success' | 'failure'): Promise<{ sequenceNumber: number; commitHash: string }> {
    return this.client.submitToolResult(id, toolCallRef, result, status);
  }

  async uploadFile(id: string, file: File): Promise<FileAttachment> {
    return this.client.uploadFile(id, file);
  }

  async listFiles(id: string): Promise<FileAttachment[]> {
    // SOAP doesn't support this yet, fall back to REST
    if (this.protocol === 'soap') {
      console.warn('listFiles not supported in SOAP, using REST');
      return this.restClient.listFiles(id);
    }
    return this.client.listFiles(id);
  }

  async downloadFile(id: string, filename: string): Promise<Blob> {
    return this.client.downloadFile(id, filename);
  }

  streamMessages(id: string, onMessage: (data: unknown) => void, onError: (error: Error) => void): () => void {
    // SOAP doesn't support SSE streaming, fall back to REST
    if (this.protocol === 'soap') {
      console.warn('streamMessages not supported in SOAP, using REST');
      return this.restClient.streamMessages(id, onMessage, onError);
    }
    return this.client.streamMessages(id, onMessage, onError);
  }
}
