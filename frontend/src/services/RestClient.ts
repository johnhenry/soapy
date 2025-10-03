import type { Message, Conversation, Branch, ToolCall, ToolResult, Branding, FileAttachment, OutputFormat, ConversationItem } from '../types';

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

  async getConversationItems(id: string, format: OutputFormat = 'openai', branch?: string): Promise<ConversationItem[]> {
    const branchParam = branch ? `&branch=${encodeURIComponent(branch)}` : '';
    const response = await this.fetch(`/v1/chat/${id}?format=${format}${branchParam}&includeTools=true`);
    const data = await response.json();
    return data.items || [];
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
    try {
      // Convert files to base64 attachments
      const attachments = files ? await Promise.all(
        files.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);

          // Convert to base64 in chunks to avoid stack overflow
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);

          return {
            filename: file.name,
            contentType: file.type,
            size: file.size,
            data: base64,
          };
        })
      ) : undefined;

      // First, post the user message with attachments
      const userResponse = await this.fetch(`/v1/chat/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ role, content, branch, attachments }),
      });

      const userResult = await userResponse.json();

      // If it's a user message, trigger AI completion
      if (role === 'user') {
        await this.fetch(`/v1/chat/${id}/completion`, {
          method: 'POST',
          body: JSON.stringify({ provider, model, branch }),
        });
      }

      return userResult;
    } catch (error) {
      throw error;
    }
  }

  async *sendMessageStream(
    id: string,
    role: string,
    content: string,
    branch?: string,
    provider?: 'openai' | 'anthropic',
    model?: string
  ): AsyncGenerator<{ type: string; content?: string; sequenceNumber?: number; commitHash?: string; message?: string }> {
    const response = await fetch(`${this.baseUrl}/v1/chat/${id}/messages/stream`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role, content, branch, provider, model }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            yield data;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *getCompletionStream(
    id: string,
    branch?: string,
    provider?: 'openai' | 'anthropic',
    model?: string
  ): AsyncGenerator<{ type: string; content?: string; sequenceNumber?: number; commitHash?: string; message?: string }> {
    // For hybrid mode with streaming: message was already submitted, now stream the completion
    // For now, we'll use non-streaming completion and yield it as a stream
    // TODO: Add POST /v1/chat/:id/completion/stream endpoint for true streaming
    yield* this.getCompletionNonStream(id, branch, provider, model);
  }

  async *getCompletionNonStream(
    id: string,
    branch?: string,
    provider?: 'openai' | 'anthropic',
    model?: string
  ): AsyncGenerator<{ type: string; content?: string; sequenceNumber?: number; commitHash?: string; message?: string }> {
    // Trigger AI completion
    const response = await this.fetch(`/v1/chat/${id}/completion`, {
      method: 'POST',
      body: JSON.stringify({ branch, provider, model }),
    });

    const result = await response.json();

    // Yield the completion as a "done" event with full content
    yield {
      type: 'delta',
      content: result.content || '',
    };

    yield {
      type: 'done',
      sequenceNumber: result.sequenceNumber,
      commitHash: result.commitHash,
    };
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
