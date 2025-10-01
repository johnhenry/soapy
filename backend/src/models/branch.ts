export interface Branch {
  name: string;
  sourceMessageNumber: number;
  createdAt: Date;
  creatorId: string;
  messageCount: number;
}

export function validateBranch(branch: unknown): branch is Branch {
  if (typeof branch !== 'object' || branch === null) return false;
  const b = branch as Partial<Branch>;
  return (
    typeof b.name === 'string' &&
    b.name.length > 0 &&
    typeof b.sourceMessageNumber === 'number' &&
    b.sourceMessageNumber >= 0 &&
    b.createdAt instanceof Date &&
    typeof b.creatorId === 'string' &&
    typeof b.messageCount === 'number' &&
    b.messageCount >= 0
  );
}
