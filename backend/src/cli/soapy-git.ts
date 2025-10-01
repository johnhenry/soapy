#!/usr/bin/env node

/**
 * soapy git - Git storage operations CLI
 * 
 * Commands:
 *   list-conversations     List all conversations
 *   create-conversation    Create a new conversation
 *   get-messages          Get messages from a conversation
 *   create-branch         Create a branch in a conversation
 */

import { gitStorage } from '../lib/git-storage/index.js';
import { getMessages } from '../lib/git-storage/message.js';
import { getBranches } from '../lib/git-storage/branch.js';

const command = process.argv[2];
const outputJson = process.argv.includes('--json');

async function listConversations() {
  console.log('Listing conversations...');
  console.log('Note: Full implementation requires filesystem scanning');
  console.log('Current storage directory:', process.env.CONVERSATIONS_DIR || './conversations');
}

async function createConversation() {
  const idIndex = process.argv.indexOf('--id');
  const orgIndex = process.argv.indexOf('--org');
  
  if (idIndex === -1 || orgIndex === -1) {
    console.error('Error: --id and --org are required');
    console.error('Usage: soapy git create-conversation --id <id> --org <orgId> [--owner <ownerId>]');
    process.exit(1);
  }

  const id = process.argv[idIndex + 1];
  const organizationId = process.argv[orgIndex + 1];
  const ownerIndex = process.argv.indexOf('--owner');
  const ownerId = ownerIndex !== -1 ? process.argv[ownerIndex + 1] : 'system';

  const conversation = {
    id,
    organizationId,
    ownerId,
    createdAt: new Date(),
    mainBranch: 'main',
    branches: [],
  };

  try {
    await gitStorage.createConversation(conversation);
    
    if (outputJson) {
      console.log(JSON.stringify({ success: true, conversation }, null, 2));
    } else {
      console.log(`✅ Conversation created: ${id}`);
      console.log(`   Organization: ${organizationId}`);
      console.log(`   Owner: ${ownerId}`);
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

async function getMessagesFromConversation() {
  const idIndex = process.argv.indexOf('--id');
  
  if (idIndex === -1) {
    console.error('Error: --id is required');
    console.error('Usage: soapy git get-messages --id <conversationId> [--branch <branchName>]');
    process.exit(1);
  }

  const conversationId = process.argv[idIndex + 1];
  const branchIndex = process.argv.indexOf('--branch');
  const branch = branchIndex !== -1 ? process.argv[branchIndex + 1] : undefined;

  try {
    const messages = await getMessages(conversationId, branch);
    
    if (outputJson) {
      console.log(JSON.stringify({ success: true, messages }, null, 2));
    } else {
      console.log(`📝 Messages from conversation: ${conversationId}`);
      if (branch) console.log(`   Branch: ${branch}`);
      console.log(`   Total messages: ${messages.length}`);
      messages.forEach((msg) => {
        console.log(`   ${msg.sequenceNumber}. [${msg.role}] ${msg.content.slice(0, 50)}...`);
      });
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

async function listBranches() {
  const idIndex = process.argv.indexOf('--id');
  
  if (idIndex === -1) {
    console.error('Error: --id is required');
    console.error('Usage: soapy git list-branches --id <conversationId>');
    process.exit(1);
  }

  const conversationId = process.argv[idIndex + 1];

  try {
    const branches = await getBranches(conversationId);
    
    if (outputJson) {
      console.log(JSON.stringify({ success: true, branches }, null, 2));
    } else {
      console.log(`🌿 Branches in conversation: ${conversationId}`);
      console.log(`   Total branches: ${branches.length}`);
      branches.forEach((branch) => {
        console.log(`   - ${branch.name} (from message ${branch.sourceMessageNumber})`);
      });
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
Usage: soapy git <command> [options]

Commands:
  list-conversations           List all conversations
  create-conversation          Create a new conversation
  get-messages                Get messages from a conversation
  list-branches               List branches in a conversation

Options:
  --json                      Output in JSON format
  --help, -h                  Show this help message

Examples:
  soapy git list-conversations
  soapy git create-conversation --id conv-123 --org org-456
  soapy git get-messages --id conv-123 --branch experiment-1
  soapy git list-branches --id conv-123 --json
  `);
  process.exit(0);
}

// Execute command
switch (command) {
  case 'list-conversations':
    listConversations();
    break;
  case 'create-conversation':
    createConversation();
    break;
  case 'get-messages':
    getMessagesFromConversation();
    break;
  case 'list-branches':
    listBranches();
    break;
  default:
    console.error(`Error: Unknown command '${command}'`);
    console.error(`Run 'soapy git --help' for usage information`);
    process.exit(1);
}
