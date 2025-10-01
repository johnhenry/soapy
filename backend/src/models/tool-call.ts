export interface ToolCall {
  sequenceNumber: number;
  toolName: string;
  parameters: Record<string, unknown>;
  requestedAt: Date;
  commitHash: string;
}

export function validateToolCall(tc: unknown): tc is ToolCall {
  if (typeof tc !== 'object' || tc === null) return false;
  const t = tc as Partial<ToolCall>;
  return (
    typeof t.sequenceNumber === 'number' &&
    t.sequenceNumber >= 0 &&
    typeof t.toolName === 'string' &&
    t.toolName.length > 0 &&
    typeof t.parameters === 'object' &&
    t.parameters !== null &&
    t.requestedAt instanceof Date &&
    typeof t.commitHash === 'string'
  );
}
