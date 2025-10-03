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
  try {
    const conversations = await gitStorage.listConversations();

    if (outputJson) {
      console.log(JSON.stringify({ success: true, conversations }, null, 2));
    } else {
      console.log(`📋 Conversations:`);
      console.log(`   Storage directory: ${process.env.CONVERSATIONS_DIR || './conversations'}`);
      console.log(`   Total conversations: ${conversations.length}`);
      conversations.forEach((conv) => {
        console.log(`   - ${conv.id}`);
        console.log(`     Created: ${conv.createdAt.toISOString()}`);
        console.log(`     Main branch: ${conv.mainBranch}`);
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

async function deleteConversation() {
  const idIndex = process.argv.indexOf('--id');

  if (idIndex === -1) {
    console.error('Error: --id is required');
    console.error('Usage: soapy git delete-conversation --id <conversationId>');
    process.exit(1);
  }

  const conversationId = process.argv[idIndex + 1];

  try {
    await gitStorage.deleteConversation(conversationId);

    if (outputJson) {
      console.log(JSON.stringify({ success: true, conversationId }, null, 2));
    } else {
      console.log(`✅ Conversation deleted: ${conversationId}`);
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

async function createBranchCommand() {
  const idIndex = process.argv.indexOf('--id');
  const nameIndex = process.argv.indexOf('--name');
  const fromIndex = process.argv.indexOf('--from');

  if (idIndex === -1 || nameIndex === -1 || fromIndex === -1) {
    console.error('Error: --id, --name, and --from are required');
    console.error('Usage: soapy git create-branch --id <conversationId> --name <branchName> --from <messageNumber>');
    process.exit(1);
  }

  const conversationId = process.argv[idIndex + 1];
  const branchName = process.argv[nameIndex + 1];
  const fromMessage = parseInt(process.argv[fromIndex + 1], 10);

  try {
    const branch = await createBranch(conversationId, branchName, fromMessage);

    if (outputJson) {
      console.log(JSON.stringify({ success: true, branch }, null, 2));
    } else {
      console.log(`✅ Branch created: ${branchName}`);
      console.log(`   Conversation: ${conversationId}`);
      console.log(`   From message: ${fromMessage}`);
      console.log(`   Created at: ${branch.createdAt}`);
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

async function deleteBranchCommand() {
  const idIndex = process.argv.indexOf('--id');
  const nameIndex = process.argv.indexOf('--name');

  if (idIndex === -1 || nameIndex === -1) {
    console.error('Error: --id and --name are required');
    console.error('Usage: soapy git delete-branch --id <conversationId> --name <branchName>');
    process.exit(1);
  }

  const conversationId = process.argv[idIndex + 1];
  const branchName = process.argv[nameIndex + 1];

  try {
    await deleteBranch(conversationId, branchName);

    if (outputJson) {
      console.log(JSON.stringify({ success: true, conversationId, branchName }, null, 2));
    } else {
      console.log(`✅ Branch deleted: ${branchName}`);
      console.log(`   Conversation: ${conversationId}`);
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
  delete-conversation          Delete a conversation
  get-messages                Get messages from a conversation
  list-branches               List branches in a conversation
  create-branch               Create a new branch
  delete-branch               Delete a branch

Options:
  --json                      Output in JSON format
  --help, -h                  Show this help message

Examples:
  soapy git list-conversations
  soapy git create-conversation --id conv-123 --org org-456
  soapy git delete-conversation --id conv-123
  soapy git get-messages --id conv-123 --branch experiment-1
  soapy git list-branches --id conv-123 --json
  soapy git create-branch --id conv-123 --name experiment-2 --from 5
  soapy git delete-branch --id conv-123 --name experiment-1
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
  case 'delete-conversation':
    deleteConversation();
    break;
  case 'get-messages':
    getMessagesFromConversation();
    break;
  case 'list-branches':
    listBranches();
    break;
  case 'create-branch':
    createBranchCommand();
    break;
  case 'delete-branch':
    deleteBranchCommand();
    break;
  default:
    console.error(`Error: Unknown command '${command}'`);
    console.error(`Run 'soapy git --help' for usage information`);
    process.exit(1);
}
