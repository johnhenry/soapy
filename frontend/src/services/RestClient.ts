import type { Message, Conversation, Branch, ToolCall, ToolResult, Branding, FileAttachment, OutputFormat } from '../types';

export class RestClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  async listConversations(): Promise<Array<{ id: string; title: string; updatedAt: string }>> {
    const response = await this.fetch('/v1/conversations');
    const data = await response.json();
    return data.conversations || [];
  }

  async deleteConversation(id: string): Promise<void> {
    await this.fetch(`/v1/chat/${id}`, {
      method: 'DELETE',
    });
  }

  private async fetch(path: string, options?: RequestInit) {
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      ...options?.headers,
    };

    // Only add Content-Type for methods that have a body
    if (options?.method && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response;
  }

  async getConversation(id: string, format: OutputFormat = 'openai'): Promise<Conversation> {
    const response = await this.fetch(`/v1/chat/${id}?format=${format}`);
    return response.json();
  }

  async getMessages(id: string, format: OutputFormat = 'openai', branch?: string): Promise<Message[]> {
    const branchParam = branch ? `&branch=${encodeURIComponent(branch)}` : '';
    const response = await this.fetch(`/v1/chat/${id}?format=${format}${branchParam}`);
    const data = await response.json();
    return data.messages || [];
  }

  async sendMessage(id: string, role: string, content: string, branch?: string): Promise<{ sequenceNumber: number; commitHash: string }> {
    const response = await this.fetch(`/v1/chat/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content, branch }),
    });
    return response.json();
  }

  async createBranch(id: string, branchName: string, fromMessage: number): Promise<Branch> {
    const response = await this.fetch(`/v1/chat/${id}/branch`, {
      method: 'POST',
      body: JSON.stringify({ branchName, fromMessage }),
    });
    return response.json();
  }

  async getBranches(id: string): Promise<Branch[]> {
    const response = await this.fetch(`/v1/chat/${id}/branches`);
    const data = await response.json();
    return data.branches || [];
  }

  async deleteBranch(id: string, branchName: string): Promise<void> {
    await this.fetch(`/v1/chat/${id}/branch/${encodeURIComponent(branchName)}`, {
      method: 'DELETE',
    });
  }

  async getBranding(id: string): Promise<Branding> {
    const response = await this.fetch(`/v1/chat/${id}/branding`);
    const data = await response.json();
    return data.branding;
  }

  async submitToolCall(id: string, toolName: string, parameters: Record<string, unknown>): Promise<{ sequenceNumber: number; commitHash: string }> {
    const response = await this.fetch(`/v1/chat/${id}/tools/call`, {
      method: 'POST',
      body: JSON.stringify({ toolName, parameters }),
    });
    return response.json();
  }

  async submitToolResult(id: string, toolCallRef: number, result: Record<string, unknown>, status: 'success' | 'failure'): Promise<{ sequenceNumber: number; commitHash: string }> {
    const response = await this.fetch(`/v1/chat/${id}/tools/result`, {
      method: 'POST',
      body: JSON.stringify({ toolCallRef, result, status }),
    });
    return response.json();
  }

  async uploadFile(id: string, file: File): Promise<FileAttachment> {
    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const response = await this.fetch(`/v1/chat/${id}/files`, {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        data: base64,
      }),
    });

    const data = await response.json();
    return data.fileMetadata;
  }

  async listFiles(id: string): Promise<FileAttachment[]> {
    const response = await this.fetch(`/v1/chat/${id}/files`);
    const data = await response.json();
    return data.files || [];
  }

  async downloadFile(id: string, filename: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/v1/chat/${id}/files/${filename}`, {
      headers: { 'X-API-Key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.blob();
  }

  streamMessages(id: string, onMessage: (data: unknown) => void, onError: (error: Error) => void): () => void {
    const eventSource = new EventSource(`${this.baseUrl}/v1/chat/${id}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        onError(error as Error);
      }
    };

    eventSource.onerror = () => {
      onError(new Error('Stream connection error'));
      eventSource.close();
    };

    return () => eventSource.close();
  }
}
