#!/usr/bin/env node

/**
 * soapy convert - Format conversion CLI
 * 
 * Commands:
 *   openai-to-anthropic    Convert OpenAI format to Anthropic
 *   anthropic-to-openai    Convert Anthropic format to OpenAI
 *   to-openai             Convert internal format to OpenAI
 *   to-anthropic          Convert internal format to Anthropic
 */

import { convertToOpenAI, convertToAnthropic } from '../lib/format-converter/index.js';
import type { Message } from '../models/message.js';
import type { ToolCall } from '../models/tool-call.js';
import type { ToolResult } from '../models/tool-result.js';

const command = process.argv[2];
const showWarnings = process.argv.includes('--warnings');

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    
    process.stdin.on('end', () => {
      resolve(data);
    });
    
    process.stdin.on('error', reject);
  });
}

async function convertToOpenAIFormat() {
  try {
    const input = await readStdin();
    const data = JSON.parse(input);
    
    const messages: Message[] = data.messages || [];
    const toolCalls: ToolCall[] = data.toolCalls || [];
    const toolResults: ToolResult[] = data.toolResults || [];
    
    const result = convertToOpenAI(messages, toolCalls, toolResults, { warnings: showWarnings });
    
    if (showWarnings && result.warnings.length > 0) {
      console.error('Warnings:', result.warnings);
    }
    
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function convertToAnthropicFormat() {
  try {
    const input = await readStdin();
    const data = JSON.parse(input);
    
    const messages: Message[] = data.messages || [];
    const toolCalls: ToolCall[] = data.toolCalls || [];
    const toolResults: ToolResult[] = data.toolResults || [];
    
    const result = convertToAnthropic(messages, toolCalls, toolResults, { warnings: showWarnings });
    
    if (showWarnings && result.warnings.length > 0) {
      console.error('Warnings:', result.warnings);
    }
    
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function openaiToAnthropic() {
  try {
    const input = await readStdin();
    const openaiData = JSON.parse(input);
    
    // Convert OpenAI format to internal format first
    // This is a simplified conversion for demonstration
    const messages: Message[] = openaiData.messages.map((msg: any, idx: number) => ({
      sequenceNumber: idx + 1,
      role: msg.role,
      content: msg.content || '',
      timestamp: new Date(),
      commitHash: '',
    }));
    
    const result = convertToAnthropic(messages, [], [], { warnings: showWarnings });
    
    if (showWarnings && result.warnings.length > 0) {
      console.error('Warnings:', result.warnings);
    }
    
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function anthropicToOpenai() {
  try {
    const input = await readStdin();
    const anthropicData = JSON.parse(input);
    
    // Convert Anthropic format to internal format first
    const messages: Message[] = anthropicData.messages.map((msg: any, idx: number) => {
      const textContent = msg.content.find((c: any) => c.type === 'text');
      return {
        sequenceNumber: idx + 1,
        role: msg.role,
        content: textContent?.text || '',
        timestamp: new Date(),
        commitHash: '',
      };
    });
    
    const result = convertToOpenAI(messages, [], [], { warnings: showWarnings });
    
    if (showWarnings && result.warnings.length > 0) {
      console.error('Warnings:', result.warnings);
    }
    
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

// Command router
if (!command || command === '--help' || command === '-h') {
  console.log(`
Usage: soapy convert <command> [options] < input.json

Commands:
  to-openai               Convert internal format to OpenAI
  to-anthropic            Convert internal format to Anthropic
  openai-to-anthropic     Convert OpenAI to Anthropic format
  anthropic-to-openai     Convert Anthropic to OpenAI format

Options:
  --warnings              Show conversion warnings
  --help, -h              Show this help message

Examples:
  echo '{"messages":[...]}' | soapy convert to-openai
  cat conversation.json | soapy convert to-anthropic --warnings
  cat openai.json | soapy convert openai-to-anthropic > anthropic.json
  `);
  process.exit(0);
}

// Execute command
switch (command) {
  case 'to-openai':
    convertToOpenAIFormat();
    break;
  case 'to-anthropic':
    convertToAnthropicFormat();
    break;
  case 'openai-to-anthropic':
    openaiToAnthropic();
    break;
  case 'anthropic-to-openai':
    anthropicToOpenai();
    break;
  default:
    console.error(`Error: Unknown command '${command}'`);
    console.error(`Run 'soapy convert --help' for usage information`);
    process.exit(1);
}
