export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  sequenceNumber: number;
  role: MessageRole;
  content: string;
  timestamp: string;
  aiProvider?: string;
  model?: string;
  commitHash: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    path: string;
  }>;
}

// Union type for conversation items (messages, tool calls, tool results)
export type ConversationItem =
  | (Message & { itemType: 'message' })
  | (ToolCall & { itemType: 'tool_call' })
  | (ToolResult & { itemType: 'tool_result' });

export interface Conversation {
  id: string;
  organizationId: string;
  ownerId: string;
  createdAt: string;
  mainBranch: string;
  branches: string[];
}

export interface Branch {
  name: string;
  sourceMessageNumber: number;
  createdAt: string;
  creatorId: string;
  messageCount: number;
}

export interface ToolCall {
  sequenceNumber: number;
  toolName: string;
  parameters: Record<string, unknown>;
  requestedAt: string;
  commitHash: string;
}

export interface ToolResult {
  sequenceNumber: number;
  toolCallRef: number;
  result: Record<string, unknown>;
  executedAt: string;
  status: 'success' | 'failure';
  retryCount: number;
  commitHash: string;
}

export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'lmstudio' | 'openai-compatible';

export type OutputFormat = 'openai' | 'anthropic' | 'soap';

export interface FileAttachment {
  filename: string;
  path: string;
  size: number;
  contentType: string;
  hash: string;
  uploadedAt: string;
  uploadedBy: string;
  commitHash: string;
}

export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  protocol: 'rest' | 'soap'; // Deprecated: use requestProtocol + responseProtocol
  requestProtocol: 'rest' | 'soap';
  responseProtocol: 'rest' | 'soap';
  directResponse: boolean; // True = single round-trip, False = ID-based hybrid
  streaming: boolean; // Only applies when responseProtocol = 'rest'
  // Provider-specific base URLs (for local/custom providers)
  ollamaBaseUrl?: string;
  lmstudioBaseUrl?: string;
  openaiCompatibleBaseUrl?: string;
}
