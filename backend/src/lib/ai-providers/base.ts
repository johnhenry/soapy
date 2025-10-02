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

export interface AIProvider {
  name: string;
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
