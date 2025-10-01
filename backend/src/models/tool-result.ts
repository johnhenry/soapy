export type ToolResultStatus = 'success' | 'error' | 'timeout';

export interface ToolResult {
  sequenceNumber: number;
  toolCallRef: number;
  result: Record<string, unknown>;
  executedAt: Date;
  status: ToolResultStatus;
  retryCount: number;
  commitHash: string;
}

export function validateToolResult(tr: unknown): tr is ToolResult {
  if (typeof tr !== 'object' || tr === null) return false;
  const t = tr as Partial<ToolResult>;
  return (
    typeof t.sequenceNumber === 'number' &&
    t.sequenceNumber >= 0 &&
    typeof t.toolCallRef === 'number' &&
    t.toolCallRef >= 0 &&
    typeof t.result === 'object' &&
    t.result !== null &&
    t.executedAt instanceof Date &&
    typeof t.status === 'string' &&
    ['success', 'error', 'timeout'].includes(t.status) &&
    typeof t.retryCount === 'number' &&
    t.retryCount >= 0 &&
    typeof t.commitHash === 'string'
  );
}
