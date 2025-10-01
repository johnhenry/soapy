export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  sequenceNumber: number;
  role: MessageRole;
  content: string;
  timestamp: Date;
  aiProvider?: string;
  model?: string;
  commitHash: string;
}

export function validateMessage(msg: unknown): msg is Message {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Partial<Message>;
  return (
    typeof m.sequenceNumber === 'number' &&
    m.sequenceNumber >= 0 &&
    typeof m.role === 'string' &&
    ['user', 'assistant', 'system', 'tool'].includes(m.role) &&
    typeof m.content === 'string' &&
    m.timestamp instanceof Date &&
    typeof m.commitHash === 'string'
  );
}
