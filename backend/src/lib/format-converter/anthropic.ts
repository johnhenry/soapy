import type { Message } from '../../models/message.js';
import type { ToolCall } from '../../models/tool-call.js';
import type { ToolResult } from '../../models/tool-result.js';

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_result'; tool_use_id: string; content: string }
  >;
}

export interface AnthropicFormat {
  model: string;
  messages: AnthropicMessage[];
  max_tokens?: number;
}

export function toAnthropic(
  messages: Message[],
  toolCalls: ToolCall[] = [],
  toolResults: ToolResult[] = []
): AnthropicFormat {
  const anthropicMessages: AnthropicMessage[] = [];

  for (const msg of messages) {
    // Anthropic only supports user and assistant roles
    if (msg.role === 'system') {
      // Skip system messages or convert to user message
      continue;
    }

    if (msg.role === 'tool') {
      // Tool messages are handled as content blocks
      continue;
    }

    const content: AnthropicMessage['content'] = [
      {
        type: 'text',
        text: msg.content,
      },
    ];

    // Add image attachments if present
    if (msg.attachments) {
      for (const attachment of msg.attachments) {
        if (attachment.contentType.startsWith('image/') && attachment.data) {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: attachment.contentType,
              data: attachment.data
            }
          });
        }
      }
    }

    // Find associated tool calls
    const msgToolCalls = toolCalls.filter(
      (tc) => tc.sequenceNumber === msg.sequenceNumber
    );

    for (const tc of msgToolCalls) {
      content.push({
        type: 'tool_use',
        id: `toolu_${tc.sequenceNumber}`,
        name: tc.toolName,
        input: tc.parameters,
      });
    }

    // Find associated tool results
    const msgToolResults = toolResults.filter(
      (tr) => tr.sequenceNumber === msg.sequenceNumber
    );

    for (const tr of msgToolResults) {
      content.push({
        type: 'tool_result',
        tool_use_id: `toolu_${tr.toolCallRef}`,
        content: JSON.stringify(tr.result),
      });
    }

    anthropicMessages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content,
    });
  }

  return {
    model: messages[0]?.model || 'claude-3-opus-20240229',
    messages: anthropicMessages,
    max_tokens: 4096,
  };
}
