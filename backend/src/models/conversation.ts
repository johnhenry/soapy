export interface Conversation {
  id: string;
  organizationId: string;
  ownerId: string;
  createdAt: Date;
  branches: string[];
}

export function validateConversation(conv: unknown): conv is Conversation {
  if (typeof conv !== 'object' || conv === null) return false;
  const c = conv as Partial<Conversation>;
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.organizationId === 'string' &&
    c.organizationId.length > 0 &&
    typeof c.ownerId === 'string' &&
    c.createdAt instanceof Date &&
    Array.isArray(c.branches)
  );
}
