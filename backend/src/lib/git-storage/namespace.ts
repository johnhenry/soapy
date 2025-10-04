/**
 * Namespace utility for conversation paths
 * Provides backward-compatible namespace support
 */

import { join } from 'path';

const DEFAULT_NAMESPACE = 'default';

/**
 * Parse a conversation ID to extract namespace and actual ID
 * Supports both formats:
 * - "conv-123" (legacy, uses default namespace)
 * - "default/conv-123" (new namespace format)
 */
export function parseConversationId(conversationId: string): { namespace: string; id: string } {
  if (conversationId.includes('/')) {
    const parts = conversationId.split('/');
    return {
      namespace: parts[0],
      id: parts.slice(1).join('/'),
    };
  }
  
  // Legacy format - use default namespace
  return {
    namespace: DEFAULT_NAMESPACE,
    id: conversationId,
  };
}

/**
 * Create a namespaced conversation ID
 */
export function createNamespacedId(namespace: string, conversationId: string): string {
  return `${namespace}/${conversationId}`;
}

/**
 * Get the actual filesystem path for a conversation
 * This handles the namespace directory structure
 */
export function getNamespacedPath(basePath: string, conversationId: string): string {
  const { namespace, id } = parseConversationId(conversationId);
  return join(basePath, namespace, id);
}
