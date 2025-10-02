import git from 'isomorphic-git';
import fs from 'fs';
import { join } from 'path';
import type { Conversation } from '../../models/conversation.js';

const CONVERSATIONS_DIR = process.env.CONVERSATIONS_DIR || './conversations';

export interface GitStorageConfig {
  conversationsDir?: string;
}

export class GitStorage {
  private conversationsDir: string;

  constructor(config: GitStorageConfig = {}) {
    this.conversationsDir = config.conversationsDir || CONVERSATIONS_DIR;
  }

  private getConversationPath(conversationId: string): string {
    return join(this.conversationsDir, conversationId);
  }

  async createConversation(conversation: Conversation): Promise<void> {
    const dir = this.getConversationPath(conversation.id);

    // Create directory
    await fs.promises.mkdir(dir, { recursive: true });

    // Initialize Git repository
    await git.init({ fs, dir, defaultBranch: conversation.mainBranch || 'main' });

    // Create .gitignore to exclude branch metadata cache
    await fs.promises.writeFile(
      join(dir, '.gitignore'),
      '.soapy-branches.json\n'
    );

    // Create initial metadata file
    const metadata = {
      id: conversation.id,
      organizationId: conversation.organizationId,
      ownerId: conversation.ownerId,
      createdAt: conversation.createdAt.toISOString(),
      mainBranch: conversation.mainBranch,
      branches: conversation.branches,
    };

    await fs.promises.writeFile(
      join(dir, '.soapy-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Initial commit
    await git.add({ fs, dir, filepath: '.gitignore' });
    await git.add({ fs, dir, filepath: '.soapy-metadata.json' });
    await git.commit({
      fs,
      dir,
      message: 'Initialize conversation',
      author: {
        name: 'Soapy System',
        email: 'system@soapy.local',
      },
    });
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const dir = this.getConversationPath(conversationId);

    try {
      const metadataPath = join(dir, '.soapy-metadata.json');
      const data = await fs.promises.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(data);

      return {
        id: metadata.id,
        organizationId: metadata.organizationId,
        ownerId: metadata.ownerId,
        createdAt: new Date(metadata.createdAt),
        mainBranch: metadata.mainBranch,
        branches: metadata.branches,
      };
    } catch (error) {
      return null;
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const dir = this.getConversationPath(conversationId);
    await fs.promises.rm(dir, { recursive: true, force: true });
  }

  async conversationExists(conversationId: string): Promise<boolean> {
    const dir = this.getConversationPath(conversationId);
    try {
      await fs.promises.access(dir);
      return true;
    } catch {
      return false;
    }
  }

  async listConversations(): Promise<Conversation[]> {
    try {
      const entries = await fs.promises.readdir(this.conversationsDir, { withFileTypes: true });
      const conversations: Conversation[] = [];

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('conv-')) {
          const conv = await this.getConversation(entry.name);
          if (conv) {
            conversations.push(conv);
          }
        }
      }

      // Sort by creation date, most recent first
      conversations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return conversations;
    } catch {
      return [];
    }
  }
}

export const gitStorage = new GitStorage();
