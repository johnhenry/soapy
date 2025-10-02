import git from 'isomorphic-git';
import fs from 'fs';
import { join } from 'path';
import type { Message } from '../../models/message.js';

const CONVERSATIONS_DIR = process.env.CONVERSATIONS_DIR || './conversations';

export interface CommitMessageResult {
  commitHash: string;
  sequenceNumber: number;
  timestamp: Date;
}

export async function commitMessage(
  conversationId: string,
  message: Omit<Message, 'sequenceNumber' | 'commitHash'>
): Promise<CommitMessageResult> {
  const dir = join(CONVERSATIONS_DIR, conversationId);

  // Get next sequence number
  const sequenceNumber = await getNextSequenceNumber(dir);

  // Format filename: NNNN-role.md
  const filename = `${String(sequenceNumber).padStart(4, '0')}-${message.role}.md`;
  const filepath = join(dir, filename);

  // Create message content with frontmatter
  const frontmatter = [
    '---',
    `role: ${message.role}`,
    `timestamp: ${message.timestamp.toISOString()}`,
    ...(message.aiProvider ? [`aiProvider: ${message.aiProvider}`] : []),
    ...(message.model ? [`model: ${message.model}`] : []),
    '---',
    '',
  ].join('\n');

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

  return {
    commitHash,
    sequenceNumber,
    timestamp: message.timestamp,
  };
}

export async function getMessages(
  conversationId: string,
  branch?: string
): Promise<Message[]> {
  const dir = join(CONVERSATIONS_DIR, conversationId);

  // Get current branch so we can restore it
  const originalBranch = await git.currentBranch({ fs, dir });

  // Checkout branch if specified
  if (branch && branch !== originalBranch) {
    await git.checkout({ fs, dir, ref: branch });
  }

  // Read all message files
  const files = await fs.promises.readdir(dir);
  const messageFiles = files
    .filter((f: string) => /^\d{4}-(user|assistant|system|tool)\.md$/.test(f))
    .sort();

  const messages: Message[] = [];

  for (const file of messageFiles) {
    const content = await fs.promises.readFile(join(dir, file), 'utf-8');
    const message = parseMessageFile(content, file);
    if (message) {
      messages.push(message);
    }
  }

  // Restore original branch
  if (branch && branch !== originalBranch && originalBranch) {
    await git.checkout({ fs, dir, ref: originalBranch });
  }

  return messages;
}

async function getNextSequenceNumber(dir: string): Promise<number> {
  try {
    const files = await fs.promises.readdir(dir);
    const messageFiles = files.filter((f: string) => /^\d{4}-(user|assistant|system|tool)\.md$/.test(f));

    if (messageFiles.length === 0) {
      return 1;
    }

    const numbers = messageFiles.map((f: string) => parseInt(f.slice(0, 4), 10));
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

    frontmatterText.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        frontmatter[key.trim()] = valueParts.join(':').trim();
      }
    });

    return {
      sequenceNumber,
      role: frontmatter.role as Message['role'],
      content: messageContent.trim(),
      timestamp: new Date(frontmatter.timestamp),
      aiProvider: frontmatter.aiProvider,
      model: frontmatter.model,
      commitHash: '', // Will be populated from Git log if needed
    };
  } catch {
    return null;
  }
}
