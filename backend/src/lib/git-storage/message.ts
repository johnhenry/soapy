import git from 'isomorphic-git';
import fs from 'fs';
import { join } from 'path';
import type { Message } from '../../models/message.js';
import type { ToolCall } from '../../models/tool-call.js';
import type { ToolResult } from '../../models/tool-result.js';

const CONVERSATIONS_DIR = process.env.CONVERSATIONS_DIR || './conversations';

// Union type for conversation items that can be branched from
export type ConversationItem =
  | (Message & { itemType: 'message' })
  | (ToolCall & { itemType: 'tool_call' })
  | (ToolResult & { itemType: 'tool_result' });

export interface CommitMessageResult {
  commitHash: string;
  sequenceNumber: number;
  timestamp: Date;
}

export async function commitMessage(
  conversationId: string,
  message: Omit<Message, 'sequenceNumber' | 'commitHash'>,
  branch?: string
): Promise<CommitMessageResult> {
  const dir = join(CONVERSATIONS_DIR, conversationId);

  // Checkout the branch if specified
  const originalBranch = await git.currentBranch({ fs, dir });
  if (branch && branch !== originalBranch) {
    await git.checkout({ fs, dir, ref: branch });
  }

  // Get next sequence number
  const sequenceNumber = await getNextSequenceNumber(dir);

  // Format filename: NNNN-role.md
  const filename = `${String(sequenceNumber).padStart(4, '0')}-${message.role}.md`;
  const filepath = join(dir, filename);

  // Handle file attachments - save them to files/ directory
  if (message.attachments && message.attachments.length > 0) {
    const filesDir = join(dir, 'files');
    await fs.promises.mkdir(filesDir, { recursive: true });

    for (const attachment of message.attachments) {
      if (attachment.data) {
        // Decode base64 and save
        const buffer = Buffer.from(attachment.data, 'base64');
        const attachmentPath = join(filesDir, attachment.filename);
        await fs.promises.writeFile(attachmentPath, buffer);

        // Add to git
        await git.add({ fs, dir, filepath: `files/${attachment.filename}` });

        // Update attachment path
        attachment.path = `files/${attachment.filename}`;
        delete attachment.data; // Remove data from metadata
      }
    }
  }

  // Create message content with frontmatter (without toolCalls - those go in separate files)
  const frontmatterParts = [
    '---',
    `role: ${message.role}`,
    `timestamp: ${message.timestamp.toISOString()}`,
    ...(message.aiProvider ? [`aiProvider: ${message.aiProvider}`] : []),
    ...(message.model ? [`model: ${message.model}`] : []),
  ];

  // Add attachments as YAML array
  if (message.attachments && message.attachments.length > 0) {
    frontmatterParts.push('attachments:');
    for (const attachment of message.attachments) {
      frontmatterParts.push(`  - filename: ${attachment.filename}`);
      frontmatterParts.push(`    contentType: ${attachment.contentType}`);
      frontmatterParts.push(`    size: ${attachment.size}`);
      frontmatterParts.push(`    path: ${attachment.path}`);
    }
  }

  frontmatterParts.push('---', '');

  const frontmatter = frontmatterParts.join('\n');

  const content = frontmatter + message.content;

  // Write file
  await fs.promises.writeFile(filepath, content, 'utf-8');

  // Git add and commit
  await git.add({ fs, dir, filepath: filename });
  const commitHash = await git.commit({
    fs,
    dir,
    message: `Add message ${sequenceNumber}: ${message.role}`,
    author: {
      name: 'Soapy System',
      email: 'system@soapy.local',
    },
  });

  // If message has tool calls, commit them as separate files
  if (message.toolCalls && message.toolCalls.length > 0) {
    for (const toolCall of message.toolCalls) {
      await commitToolCall(conversationId, {
        toolName: toolCall.name,
        parameters: toolCall.arguments,
        requestedAt: new Date(),
      });
    }
  }

  // Stay on the branch if we checked it out (don't restore to original)
  // This allows subsequent commits in the same operation to use the same branch

  return {
    commitHash,
    sequenceNumber,
    timestamp: message.timestamp,
  };
}

export async function commitToolCall(
  conversationId: string,
  toolCall: Omit<ToolCall, 'sequenceNumber' | 'commitHash'>
): Promise<CommitMessageResult> {
  const dir = join(CONVERSATIONS_DIR, conversationId);

  // Get next sequence number
  const sequenceNumber = await getNextSequenceNumber(dir);

  // Format filename: NNNN-tool_call.md
  const filename = `${String(sequenceNumber).padStart(4, '0')}-tool_call.md`;
  const filepath = join(dir, filename);

  // Create markdown content with YAML frontmatter
  const frontmatter = [
    '---',
    `toolName: ${toolCall.toolName}`,
    `requestedAt: ${toolCall.requestedAt.toISOString()}`,
    `parameters:`,
    ...JSON.stringify(toolCall.parameters, null, 2).split('\n').map(line => `  ${line}`),
    '---',
    '',
    `Calling tool: ${toolCall.toolName}`,
  ].join('\n');

  // Write file
  await fs.promises.writeFile(filepath, frontmatter, 'utf-8');

  // Git add and commit
  await git.add({ fs, dir, filepath: filename });
  const commitHash = await git.commit({
    fs,
    dir,
    message: `Add tool call ${sequenceNumber}: ${toolCall.toolName}`,
    author: {
      name: 'Soapy System',
      email: 'system@soapy.local',
    },
  });

  return {
    commitHash,
    sequenceNumber,
    timestamp: toolCall.requestedAt,
  };
}

export async function commitToolResult(
  conversationId: string,
  toolResult: Omit<ToolResult, 'sequenceNumber' | 'commitHash'>
): Promise<CommitMessageResult> {
  const dir = join(CONVERSATIONS_DIR, conversationId);

  // Get next sequence number
  const sequenceNumber = await getNextSequenceNumber(dir);

  // Format filename: NNNN-tool_result.md
  const filename = `${String(sequenceNumber).padStart(4, '0')}-tool_result.md`;
  const filepath = join(dir, filename);

  // Create markdown content with YAML frontmatter
  const frontmatter = [
    '---',
    `toolCallRef: ${toolResult.toolCallRef}`,
    `status: ${toolResult.status}`,
    `executedAt: ${toolResult.executedAt.toISOString()}`,
    `retryCount: ${toolResult.retryCount}`,
    `result:`,
    ...JSON.stringify(toolResult.result, null, 2).split('\n').map(line => `  ${line}`),
    '---',
    '',
    `Tool execution ${toolResult.status}`,
  ].join('\n');

  // Write file
  await fs.promises.writeFile(filepath, frontmatter, 'utf-8');

  // Git add and commit
  await git.add({ fs, dir, filepath: filename });
  const commitHash = await git.commit({
    fs,
    dir,
    message: `Add tool result ${sequenceNumber} (ref: ${toolResult.toolCallRef}) - ${toolResult.status}`,
    author: {
      name: 'Soapy System',
      email: 'system@soapy.local',
    },
  });

  return {
    commitHash,
    sequenceNumber,
    timestamp: toolResult.executedAt,
  };
}

export async function getConversationItems(
  conversationId: string,
  branch?: string
): Promise<ConversationItem[]> {
  const dir = join(CONVERSATIONS_DIR, conversationId);

  // Get current branch so we can restore it
  const originalBranch = await git.currentBranch({ fs, dir });

  // Checkout branch if specified
  if (branch && branch !== originalBranch) {
    await git.checkout({ fs, dir, ref: branch });
  }

  // Read all files
  const files = await fs.promises.readdir(dir);

  // Separate different file types
  const messageFiles = files
    .filter((f: string) => /^\d{4}-(user|assistant|system|tool)\.md$/.test(f))
    .sort();

  const toolCallFiles = files
    .filter((f: string) => /^\d{4}-tool_call\.md$/.test(f))
    .sort();

  const toolResultFiles = files
    .filter((f: string) => /^\d{4}-tool_result\.md$/.test(f))
    .sort();

  // Parse all items and collect them with their sequence numbers
  const items: ConversationItem[] = [];

  // Parse messages
  for (const file of messageFiles) {
    const content = await fs.promises.readFile(join(dir, file), 'utf-8');
    const message = parseMessageFile(content, file);
    if (message) {
      items.push({ ...message, itemType: 'message' });
    }
  }

  // Parse tool calls as separate items
  for (const file of toolCallFiles) {
    const content = await fs.promises.readFile(join(dir, file), 'utf-8');
    const toolCall = parseToolCallFile(content, file);
    if (toolCall) {
      items.push({ ...toolCall, itemType: 'tool_call' });
    }
  }

  // Parse tool results as separate items
  for (const file of toolResultFiles) {
    const content = await fs.promises.readFile(join(dir, file), 'utf-8');
    const toolResult = parseToolResultFile(content, file);
    if (toolResult) {
      items.push({ ...toolResult, itemType: 'tool_result' });
    }
  }

  // Sort all items by sequence number
  items.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  // Restore original branch
  if (branch && branch !== originalBranch && originalBranch) {
    await git.checkout({ fs, dir, ref: originalBranch });
  }

  return items;
}

export async function getMessages(
  conversationId: string,
  branch?: string
): Promise<Message[]> {
  const items = await getConversationItems(conversationId, branch);

  // Filter to only messages for backward compatibility
  const messages = items.filter((item): item is Message & { itemType: 'message' } =>
    item.itemType === 'message'
  );

  // Remove itemType from returned messages
  return messages.map(({ itemType, ...message }) => message);
}

async function getNextSequenceNumber(dir: string): Promise<number> {
  try {
    const files = await fs.promises.readdir(dir);
    // Match all .md files with sequence numbers
    const sequencedFiles = files.filter((f: string) =>
      /^\d{4}-(user|assistant|system|tool|tool_call|tool_result)\.md$/.test(f)
    );

    if (sequencedFiles.length === 0) {
      return 1;
    }

    const numbers = sequencedFiles.map((f: string) => parseInt(f.slice(0, 4), 10));
    return Math.max(...numbers) + 1;
  } catch {
    return 1;
  }
}

function parseMessageFile(content: string, filename: string): Message | null {
  try {
    const sequenceNumber = parseInt(filename.slice(0, 4), 10);

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      return null;
    }

    const [, frontmatterText, messageContent] = frontmatterMatch;
    const frontmatter: Record<string, string> = {};
    let attachments: Array<{filename: string; contentType: string; size: number; path: string}> = [];

    // Simple YAML parsing - handles attachments array
    let inAttachments = false;
    let currentAttachment: any = {};

    frontmatterText.split('\n').forEach((line) => {
      if (line.startsWith('attachments:')) {
        inAttachments = true;
        return;
      }

      if (inAttachments) {
        if (line.startsWith('  - ')) {
          // New attachment
          if (Object.keys(currentAttachment).length > 0) {
            attachments.push(currentAttachment);
          }
          currentAttachment = {};
          const [key, value] = line.substring(4).split(':').map(s => s.trim());
          if (key && value) {
            currentAttachment[key] = value;
          }
        } else if (line.startsWith('    ')) {
          // Continuation of current attachment
          const [key, value] = line.trim().split(':').map(s => s.trim());
          if (key && value) {
            currentAttachment[key] = isNaN(Number(value)) ? value : Number(value);
          }
        } else if (line.trim() && !line.startsWith(' ')) {
          // End of attachments
          if (Object.keys(currentAttachment).length > 0) {
            attachments.push(currentAttachment);
            currentAttachment = {};
          }
          inAttachments = false;
        }
      }

      if (!inAttachments) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          frontmatter[key.trim()] = valueParts.join(':').trim();
        }
      }
    });

    // Don't forget last attachment
    if (Object.keys(currentAttachment).length > 0) {
      attachments.push(currentAttachment);
    }

    return {
      sequenceNumber,
      role: frontmatter.role as Message['role'],
      content: messageContent.trim(),
      timestamp: new Date(frontmatter.timestamp),
      aiProvider: frontmatter.aiProvider,
      model: frontmatter.model,
      commitHash: '', // Will be populated from Git log if needed
      attachments: attachments.length > 0 ? attachments : undefined,
      // Note: toolCalls are no longer read from frontmatter, they come from separate files
    };
  } catch {
    return null;
  }
}

function parseToolCallFile(content: string, filename: string): ToolCall | null {
  try {
    const sequenceNumber = parseInt(filename.slice(0, 4), 10);

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      return null;
    }

    const [, frontmatterText] = frontmatterMatch;
    const frontmatter: Record<string, any> = {};
    let currentKey: string | null = null;
    let jsonBuffer = '';

    frontmatterText.split('\n').forEach((line) => {
      // Check if this is a key line (e.g., "toolName: get_weather")
      if (line.match(/^[a-zA-Z_]+:/)) {
        // Save previous JSON buffer if any
        if (currentKey && jsonBuffer) {
          try {
            frontmatter[currentKey] = JSON.parse(jsonBuffer);
          } catch {
            frontmatter[currentKey] = jsonBuffer.trim();
          }
          jsonBuffer = '';
        }

        const [key, ...valueParts] = line.split(':');
        currentKey = key.trim();
        const value = valueParts.join(':').trim();

        if (value) {
          frontmatter[currentKey] = value;
          currentKey = null;
        } else {
          jsonBuffer = '';
        }
      } else if (currentKey) {
        // This is a continuation line (JSON object)
        jsonBuffer += line + '\n';
      }
    });

    // Save final JSON buffer if any
    if (currentKey && jsonBuffer) {
      try {
        frontmatter[currentKey] = JSON.parse(jsonBuffer);
      } catch {
        frontmatter[currentKey] = jsonBuffer.trim();
      }
    }

    return {
      sequenceNumber,
      toolName: frontmatter.toolName,
      parameters: frontmatter.parameters || {},
      requestedAt: new Date(frontmatter.requestedAt),
      commitHash: '',
    };
  } catch {
    return null;
  }
}

function parseToolResultFile(content: string, filename: string): ToolResult | null {
  try {
    const sequenceNumber = parseInt(filename.slice(0, 4), 10);

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      return null;
    }

    const [, frontmatterText] = frontmatterMatch;
    const frontmatter: Record<string, any> = {};
    let currentKey: string | null = null;
    let jsonBuffer = '';

    frontmatterText.split('\n').forEach((line) => {
      // Check if this is a key line
      if (line.match(/^[a-zA-Z_]+:/)) {
        // Save previous JSON buffer if any
        if (currentKey && jsonBuffer) {
          try {
            frontmatter[currentKey] = JSON.parse(jsonBuffer);
          } catch {
            frontmatter[currentKey] = jsonBuffer.trim();
          }
          jsonBuffer = '';
        }

        const [key, ...valueParts] = line.split(':');
        currentKey = key.trim();
        const value = valueParts.join(':').trim();

        if (value) {
          // Try to parse as number if possible
          if (!isNaN(Number(value))) {
            frontmatter[currentKey] = Number(value);
          } else {
            frontmatter[currentKey] = value;
          }
          currentKey = null;
        } else {
          jsonBuffer = '';
        }
      } else if (currentKey) {
        // This is a continuation line (JSON object)
        jsonBuffer += line + '\n';
      }
    });

    // Save final JSON buffer if any
    if (currentKey && jsonBuffer) {
      try {
        frontmatter[currentKey] = JSON.parse(jsonBuffer);
      } catch {
        frontmatter[currentKey] = jsonBuffer.trim();
      }
    }

    return {
      sequenceNumber,
      toolCallRef: frontmatter.toolCallRef,
      result: frontmatter.result || {},
      executedAt: new Date(frontmatter.executedAt),
      status: frontmatter.status,
      retryCount: frontmatter.retryCount || 0,
      commitHash: '',
    };
  } catch {
    return null;
  }
}
