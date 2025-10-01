import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wsdlPath = join(__dirname, 'soapy.wsdl');

export interface SoapService {
  CommitMessage(args: {
    conversationId: string;
    role: string;
    content: string;
    aiProvider?: string;
    model?: string;
  }): Promise<{
    commitHash: string;
    sequenceNumber: number;
    timestamp: string;
  }>;

  BranchConversation(args: {
    conversationId: string;
    branchName: string;
    fromMessageNumber: number;
  }): Promise<{
    branchRef: string;
    createdAt: string;
  }>;

  GetConversation(args: {
    conversationId: string;
    branchName?: string;
    format?: string;
  }): Promise<{
    messages: Array<{
      sequenceNumber: number;
      role: string;
      content: string;
      timestamp: string;
    }>;
  }>;

  GetBranding(args: { conversationId: string }): Promise<{
    branding: {
      logoUrl: string;
      primaryColor: string;
      secondaryColor?: string;
      accentColor?: string;
      footerText?: string;
    };
  }>;

  CommitToolCall(args: {
    conversationId: string;
    toolName: string;
    parameters: string;
  }): Promise<{
    commitHash: string;
    sequenceNumber: number;
    timestamp: string;
  }>;

  CommitToolResult(args: {
    conversationId: string;
    toolCallRef: number;
    result: string;
    status: string;
  }): Promise<{
    commitHash: string;
    sequenceNumber: number;
    timestamp: string;
  }>;
}

export const soapService: SoapService = {
  async CommitMessage(_args) {
    // Stub implementation
    return {
      commitHash: 'abc123',
      sequenceNumber: 1,
      timestamp: new Date().toISOString(),
    };
  },

  async BranchConversation(args) {
    return {
      branchRef: `refs/heads/${args.branchName}`,
      createdAt: new Date().toISOString(),
    };
  },

  async GetConversation(_args) {
    return {
      messages: [],
    };
  },

  async GetBranding(_args) {
    return {
      branding: {
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#FF5733',
      },
    };
  },

  async CommitToolCall(_args) {
    return {
      commitHash: 'tool123',
      sequenceNumber: 2,
      timestamp: new Date().toISOString(),
    };
  },

  async CommitToolResult(_args) {
    return {
      commitHash: 'result123',
      sequenceNumber: 3,
      timestamp: new Date().toISOString(),
    };
  },
};

export function getWsdlContent(): string {
  return readFileSync(wsdlPath, 'utf-8');
}

export function createSoapServer() {
  const wsdlContent = getWsdlContent();

  const services = {
    SoapyService: {
      SoapyPort: soapService,
    },
  };

  return { wsdlContent, services };
}
