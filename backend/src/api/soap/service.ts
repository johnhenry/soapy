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

  CommitFile(args: {
    conversationId: string;
    filename: string;
    contentType: string;
    data: string; // Base64-encoded
  }): Promise<{
    commitHash: string;
    fileMetadata: {
      filename: string;
      path: string;
      size: number;
      contentType: string;
      hash: string;
      uploadedAt: string;
      uploadedBy: string;
    };
  }>;

  GetFile(args: {
    conversationId: string;
    filename: string;
  }): Promise<{
    filename: string;
    contentType: string;
    data: string; // Base64-encoded
    metadata: {
      filename: string;
      path: string;
      size: number;
      contentType: string;
      hash: string;
      uploadedAt: string;
      uploadedBy: string;
    };
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

  async CommitFile(args) {
    // Decode base64 to get file size
    const buffer = Buffer.from(args.data, 'base64');
    const size = buffer.length;
    
    // Generate SHA-256 hash
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    return {
      commitHash: `file-${hash.substring(0, 8)}`,
      fileMetadata: {
        filename: args.filename,
        path: `files/${args.filename}`,
        size,
        contentType: args.contentType,
        hash: `sha256-${hash}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'soap-user',
      },
    };
  },

  async GetFile(args) {
    // Stub implementation - return a small sample file
    const sampleData = 'SGVsbG8gZnJvbSBTb2FweSBmaWxlIHN0b3JhZ2Uh'; // "Hello from Soapy file storage!" in base64
    
    return {
      filename: args.filename,
      contentType: 'text/plain',
      data: sampleData,
      metadata: {
        filename: args.filename,
        path: `files/${args.filename}`,
        size: 31,
        contentType: 'text/plain',
        hash: 'sha256-sample',
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'soap-user',
      },
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
