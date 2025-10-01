#!/usr/bin/env node

/**
 * soapy ai - AI provider operations CLI
 * 
 * Commands:
 *   generate    Generate text with an AI provider
 *   stream      Stream text generation
 *   test-tool   Test tool calling functionality
 */

import { aiOrchestrator, type ProviderType } from '../lib/ai-providers/index.js';

const command = process.argv[2];
const outputJson = process.argv.includes('--json');

async function generate() {
  const providerIndex = process.argv.indexOf('--provider');
  const promptIndex = process.argv.indexOf('--prompt');
  const modelIndex = process.argv.indexOf('--model');
  
  if (providerIndex === -1 || promptIndex === -1) {
    console.error('Error: --provider and --prompt are required');
    console.error('Usage: soapy ai generate --provider <openai|anthropic> --prompt <text> [--model <model>]');
    process.exit(1);
  }

  const provider = process.argv[providerIndex + 1] as ProviderType;
  const prompt = process.argv[promptIndex + 1];
  const model = modelIndex !== -1 ? process.argv[modelIndex + 1] : undefined;

  if (!aiOrchestrator.hasProvider(provider)) {
    console.error(`Error: Provider '${provider}' not configured`);
    console.error('Make sure OPENAI_API_KEY or ANTHROPIC_API_KEY is set in environment');
    process.exit(1);
  }

  try {
    const result = await aiOrchestrator.generate(provider, prompt, { model });
    
    if (outputJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n🤖 ${provider.toUpperCase()} Response:`);
      console.log(`   Model: ${result.model}`);
      console.log(`   Finish: ${result.finishReason}`);
      if (result.usage) {
        console.log(`   Tokens: ${result.usage.totalTokens} (prompt: ${result.usage.promptTokens}, completion: ${result.usage.completionTokens})`);
      }
      console.log(`\n${result.content}\n`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (outputJson) {
      console.log(JSON.stringify({ success: false, error: message }, null, 2));
    } else {
      console.error(`❌ Error: ${message}`);
    }
    process.exit(1);
  }
}

async function streamGenerate() {
  const providerIndex = process.argv.indexOf('--provider');
  const promptIndex = process.argv.indexOf('--prompt');
  
  if (providerIndex === -1 || promptIndex === -1) {
    console.error('Error: --provider and --prompt are required');
    console.error('Usage: soapy ai stream --provider <openai|anthropic> --prompt <text>');
    process.exit(1);
  }

  const providerType = process.argv[providerIndex + 1] as ProviderType;
  const prompt = process.argv[promptIndex + 1];

  const provider = aiOrchestrator.getProvider(providerType);
  if (!provider) {
    console.error(`Error: Provider '${providerType}' not configured`);
    console.error('Make sure OPENAI_API_KEY or ANTHROPIC_API_KEY is set in environment');
    process.exit(1);
  }

  try {
    console.log(`\n🤖 ${providerType.toUpperCase()} Streaming:\n`);
    
    for await (const chunk of provider.stream(prompt)) {
      process.stdout.write(chunk.delta);
      if (chunk.done) {
        console.log(`\n\n✅ Completed (${chunk.finishReason})\n`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ Error: ${message}`);
    process.exit(1);
  }
}

async function testTool() {
  const providerIndex = process.argv.indexOf('--provider');
  const toolIndex = process.argv.indexOf('--tool');
  const promptIndex = process.argv.indexOf('--prompt');
  
  if (providerIndex === -1 || toolIndex === -1 || promptIndex === -1) {
    console.error('Error: --provider, --tool, and --prompt are required');
    console.error('Usage: soapy ai test-tool --provider <openai|anthropic> --tool <name> --prompt <text>');
    process.exit(1);
  }

  const provider = process.argv[providerIndex + 1] as ProviderType;
  const toolName = process.argv[toolIndex + 1];
  const prompt = process.argv[promptIndex + 1];

  if (!aiOrchestrator.hasProvider(provider)) {
    console.error(`Error: Provider '${provider}' not configured`);
    process.exit(1);
  }

  try {
    const result = await aiOrchestrator.generate(provider, prompt, {
      tools: [
        {
          name: toolName,
          description: `Test tool: ${toolName}`,
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Test input' },
            },
            required: ['input'],
          },
        },
      ],
    });
    
    if (outputJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n🔧 Tool Call Test:`);
      console.log(`   Provider: ${provider}`);
      console.log(`   Model: ${result.model}`);
      console.log(`   Finish: ${result.finishReason}`);
      
      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(`\n   Tool Calls:`);
        result.toolCalls.forEach((call) => {
          console.log(`     - ${call.name}`);
          console.log(`       Args: ${JSON.stringify(call.arguments)}`);
        });
      }
      
      if (result.content) {
        console.log(`\n   Content: ${result.content}`);
      }
      console.log();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (outputJson) {
      console.log(JSON.stringify({ success: false, error: message }, null, 2));
    } else {
      console.error(`❌ Error: ${message}`);
    }
    process.exit(1);
  }
}

// Command router
if (!command || command === '--help' || command === '-h') {
  console.log(`
Usage: soapy ai <command> [options]

Commands:
  generate           Generate text with an AI provider
  stream            Stream text generation
  test-tool         Test tool calling functionality

Options:
  --json            Output in JSON format
  --help, -h        Show this help message

Examples:
  soapy ai generate --provider openai --prompt "Hello, world!"
  soapy ai generate --provider anthropic --prompt "Explain AI" --model claude-3-opus-20240229
  soapy ai stream --provider openai --prompt "Tell me a story"
  soapy ai test-tool --provider openai --tool search --prompt "Search for weather"
  `);
  process.exit(0);
}

// Execute command
switch (command) {
  case 'generate':
    generate();
    break;
  case 'stream':
    streamGenerate();
    break;
  case 'test-tool':
    testTool();
    break;
  default:
    console.error(`Error: Unknown command '${command}'`);
    console.error(`Run 'soapy ai --help' for usage information`);
    process.exit(1);
}
