export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseURL?: string; // For OpenAI-compatible providers (Ollama, LM Studio, etc.)
}

export interface GenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

export interface GenerationResult {
  content: string;
  model: string;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  finishReason?: 'stop' | 'length' | 'tool_calls';
}

export interface ChatMessage {
  role: string;
  content: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface AIProvider {
  name: string;

  // Model management
  listModels(): Promise<string[]>;

  // Chat completion with full message history
  chat(messages: ChatMessage[], options?: GenerationOptions): Promise<GenerationResult>;

  // Streaming chat with full message history
  chatStream(
    messages: ChatMessage[],
    options?: GenerationOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;

  // Legacy methods (deprecated, use chat/chatStream instead)
  generate(prompt: string, options?: GenerationOptions): Promise<GenerationResult>;
  stream(
    prompt: string,
    options?: GenerationOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;
  toolCall(
    prompt: string,
    toolName: string,
    parameters: Record<string, unknown>,
    options?: GenerationOptions
  ): Promise<GenerationResult>;
}
