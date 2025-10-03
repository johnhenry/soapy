import type { Message } from '../../models/message.js';
import type { ToolCall } from '../../models/tool-call.js';
import type { ToolResult } from '../../models/tool-result.js';

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
  }>;
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
    // Check if message has image attachments
    const hasImages = msg.attachments?.some(att => att.contentType.startsWith('image/'));
    
    let content: OpenAIMessage['content'];
    if (hasImages && msg.attachments) {
      // Use content array format for vision
      const contentParts: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
        { type: 'text', text: msg.content }
      ];
      
      // Add image attachments
      for (const attachment of msg.attachments) {
        if (attachment.contentType.startsWith('image/')) {
          const imageUrl = attachment.data 
            ? `data:${attachment.contentType};base64,${attachment.data}`
            : attachment.path || '';
          
          contentParts.push({
            type: 'image_url',
            image_url: { url: imageUrl }
          });
        }
      }
      
      content = contentParts;
    } else {
      // Use string format for text-only messages
      content = msg.content;
    }

    const openaiMsg: OpenAIMessage = {
      role: msg.role,
      content,
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
