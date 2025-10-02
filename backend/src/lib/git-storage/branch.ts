import git from 'isomorphic-git';
import fs from 'fs';
import { join } from 'path';
import type { Branch } from '../../models/branch.js';

const CONVERSATIONS_DIR = process.env.CONVERSATIONS_DIR || './conversations';

export async function createBranch(
  conversationId: string,
  branchName: string,
  fromMessageNumber: number,
  creatorId: string
): Promise<{ branchRef: string; createdAt: Date }> {
  const dir = join(CONVERSATIONS_DIR, conversationId);

  // Get all commits in reverse chronological order
  const commits = await git.log({ fs, dir, depth: 100 });

  // Find the commit for the specified message number
  // Message commits have format "Add message N: role"
  let targetCommit = commits[0].oid; // Default to latest

  for (const commit of commits) {
    const match = commit.commit.message.match(/^Add message (\d+):/);
    if (match) {
      const msgNum = parseInt(match[1], 10);
      if (msgNum === fromMessageNumber) {
        targetCommit = commit.oid;
        break;
      }
    }
  }

  // Create Git branch at the target commit
  const ref = `refs/heads/${branchName}`;
  await git.branch({ fs, dir, ref: branchName, checkout: false, object: targetCommit });

  // Store branch metadata (not committed to Git - just local cache)
  const branchesPath = join(dir, '.soapy-branches.json');
  let branches: Record<string, Branch> = {};

  try {
    const data = await fs.promises.readFile(branchesPath, 'utf-8');
    branches = JSON.parse(data);
  } catch {
    // File doesn't exist yet
  }

  const createdAt = new Date();
  branches[branchName] = {
    name: branchName,
    sourceMessageNumber: fromMessageNumber,
    createdAt,
    creatorId,
    messageCount: 0,
  };

  await fs.promises.writeFile(branchesPath, JSON.stringify(branches, null, 2));

  return {
    branchRef: ref,
    createdAt,
  };
}

export async function getBranches(conversationId: string): Promise<Branch[]> {
  const dir = join(CONVERSATIONS_DIR, conversationId);
  const branchesPath = join(dir, '.soapy-branches.json');

  try {
    const data = await fs.promises.readFile(branchesPath, 'utf-8');
    const branches = JSON.parse(data);
    return Object.values(branches).map((b: any) => ({
      ...b,
      createdAt: new Date(b.createdAt),
    }));
  } catch {
    return [];
  }
}

export async function deleteBranch(
  conversationId: string,
  branchName: string
): Promise<void> {
  if (branchName === 'main') {
    throw new Error('Cannot delete main branch');
  }

  const dir = join(CONVERSATIONS_DIR, conversationId);

  // Delete the Git branch (needs full ref path)
  await git.deleteBranch({ fs, dir, ref: `refs/heads/${branchName}` });

  // Remove branch metadata from local cache
  const branchesPath = join(dir, '.soapy-branches.json');
  try {
    const data = await fs.promises.readFile(branchesPath, 'utf-8');
    const branches = JSON.parse(data);
    delete branches[branchName];
    await fs.promises.writeFile(branchesPath, JSON.stringify(branches, null, 2));
  } catch {
    // Metadata file doesn't exist or is invalid - ignore
  }
}
