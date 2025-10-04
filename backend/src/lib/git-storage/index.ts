import git from 'isomorphic-git';
import fs from 'fs';
import { join } from 'path';
import type { Conversation } from '../../models/conversation.js';
import { getNamespacedPath } from './namespace.js';

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
    return getNamespacedPath(this.conversationsDir, conversationId);
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

      // Return the namespaced ID that was passed in, not the metadata.id
      // This ensures the returned conversation has the full namespaced ID
      return {
        id: conversationId,
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
      const conversations: Conversation[] = [];
      const namespaceEntries = await fs.promises.readdir(this.conversationsDir, { withFileTypes: true });

      // Iterate through namespace directories (e.g., "default")
      for (const namespaceEntry of namespaceEntries) {
        if (namespaceEntry.isDirectory()) {
          const namespacePath = join(this.conversationsDir, namespaceEntry.name);
          const conversationEntries = await fs.promises.readdir(namespacePath, { withFileTypes: true });

          // Iterate through conversation directories within the namespace
          for (const convEntry of conversationEntries) {
            if (convEntry.isDirectory() && convEntry.name.startsWith('conv-')) {
              // Create namespaced ID for getConversation
              const namespacedId = `${namespaceEntry.name}/${convEntry.name}`;
              const conv = await this.getConversation(namespacedId);
              if (conv) {
                conversations.push(conv);
              }
            }
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
