#!/usr/bin/env node

/**
 * soapy - Main CLI tool with git-style sub-commands
 * 
 * Usage: soapy <command> [options]
 * Commands: health, git, convert, ai
 */

const commands = {
  health: './soapy-health.js',
  git: './soapy-git.js',
  convert: './soapy-convert.js',
  ai: './soapy-ai.js',
};

const command = process.argv[2];

if (!command || command === '--help' || command === '-h') {
  console.log(`
Usage: soapy <command> [options]

Commands:
  health              Check system health
  git                 Git storage operations
  convert             Format conversion operations
  ai                  AI provider operations

Options:
  --help, -h          Show this help message

Examples:
  soapy health --json
  soapy git list-conversations
  soapy convert openai-to-anthropic < input.json
  soapy ai generate --provider openai --prompt "Hello"

For command-specific help:
  soapy <command> --help
  `);
  process.exit(0);
}

if (!(command in commands)) {
  console.error(`Error: Unknown command '${command}'`);
  console.error(`Run 'soapy --help' for usage information`);
  process.exit(1);
}

// Remove the command from argv and execute the sub-command
process.argv.splice(2, 1);

// Dynamic import of the sub-command
const commandPath = commands[command as keyof typeof commands];
import(commandPath).catch((error) => {
  console.error(`Error loading command '${command}':`, error.message);
  process.exit(1);
});
