import { toOpenAI } from './openai.js';
import { toAnthropic } from './anthropic.js';
import type { Message } from '../../models/message.js';
import type { ToolCall } from '../../models/tool-call.js';
import type { ToolResult } from '../../models/tool-result.js';

export { toOpenAI } from './openai.js';
export { toAnthropic } from './anthropic.js';

export interface ConversionOptions {
  warnings?: boolean;
}

export interface ConversionResult<T> {
  data: T;
  warnings: string[];
}

export function convertToOpenAI(
  messages: Message[],
  toolCalls: ToolCall[] = [],
  toolResults: ToolResult[] = [],
  options: ConversionOptions = {}
): ConversionResult<ReturnType<typeof toOpenAI>> {
  const warnings: string[] = [];

  // Check for system messages
  const hasSystemMessages = messages.some((m) => m.role === 'system');
  if (!hasSystemMessages && options.warnings) {
    warnings.push('No system messages found - consider adding context');
  }

  const data = toOpenAI(messages, toolCalls, toolResults);

  return { data, warnings };
}

export function convertToAnthropic(
  messages: Message[],
  toolCalls: ToolCall[] = [],
  toolResults: ToolResult[] = [],
  options: ConversionOptions = {}
): ConversionResult<ReturnType<typeof toAnthropic>> {
  const warnings: string[] = [];

  // Check for system messages (not supported in Anthropic)
  const systemMessages = messages.filter((m) => m.role === 'system');
  if (systemMessages.length > 0 && options.warnings) {
    warnings.push(
      `${systemMessages.length} system message(s) skipped - Anthropic only supports user/assistant roles`
    );
  }

  const data = toAnthropic(messages, toolCalls, toolResults);

  return { data, warnings };
}
