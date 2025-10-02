export type MessageRole = 'user' | 'assistant' | 'system';

export type OutputFormat = 'openai' | 'anthropic' | 'soap';

export interface Message {
  sequenceNumber: number;
  role: MessageRole;
  content: string;
  timestamp: string;
  aiProvider?: string;
  model?: string;
  commitHash: string;
}

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

export interface Branding {
  logoUrl: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  footerText?: string;
  versionTimestamp: string;
}

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
  format: OutputFormat;
  protocol: 'rest' | 'soap';
}
