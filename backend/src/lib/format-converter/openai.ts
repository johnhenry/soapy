import type { Message } from '../../models/message.js';
import type { ToolCall } from '../../models/tool-call.js';
import type { ToolResult } from '../../models/tool-result.js';

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

export interface OpenAIFormat {
  model: string;
  messages: OpenAIMessage[];
}

export function toOpenAI(
  messages: Message[],
  toolCalls: ToolCall[] = [],
  toolResults: ToolResult[] = []
): OpenAIFormat {
  const openaiMessages: OpenAIMessage[] = [];

  // Convert regular messages
  for (const msg of messages) {
    const openaiMsg: OpenAIMessage = {
      role: msg.role,
      content: msg.content,
    };

    // Find associated tool calls for this message
    const msgToolCalls = toolCalls.filter(
      (tc) => tc.sequenceNumber === msg.sequenceNumber
    );

    if (msgToolCalls.length > 0) {
      openaiMsg.tool_calls = msgToolCalls.map((tc) => ({
        id: `call_${tc.sequenceNumber}`,
        type: 'function' as const,
        function: {
          name: tc.toolName,
          arguments: JSON.stringify(tc.parameters),
        },
      }));
    }

    openaiMessages.push(openaiMsg);
  }

  // Add tool results as tool messages
  for (const result of toolResults) {
    openaiMessages.push({
      role: 'tool',
      content: JSON.stringify(result.result),
      tool_call_id: `call_${result.toolCallRef}`,
      name: toolCalls.find((tc) => tc.sequenceNumber === result.toolCallRef)?.toolName || 'unknown',
    });
  }

  return {
    model: messages[0]?.model || 'gpt-4',
    messages: openaiMessages,
  };
}
