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

  // Get all commits in reverse chronological order from current branch
  // This allows branching from any branch, not just main
  const commits = await git.log({ fs, dir, depth: 100 });

  // Find the commit for the specified message number
  // Message commits have format "Add message N: role"
  let targetCommit: string | null = null;

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

  // If we didn't find the specific message, fail
  if (!targetCommit) {
    throw new Error(`Message ${fromMessageNumber} not found in commit history`);
  }

  // Create Git branch at the target commit (doesn't require checkout)
  // git.branch with checkout=false works from any branch
  const ref = `refs/heads/${branchName}`;
  try {
    await git.branch({ fs, dir, ref: branchName, checkout: false, object: targetCommit });
  } catch (error) {
    // If it fails, it might be because of working directory state
    // Try creating the branch ref directly
    if (error instanceof Error && error.message.includes('ENOENT')) {
      // Fallback: write the ref file directly
      const refPath = join(dir, '.git', 'refs', 'heads', branchName);
      await fs.promises.mkdir(join(dir, '.git', 'refs', 'heads'), { recursive: true });
      await fs.promises.writeFile(refPath, targetCommit + '\n');
    } else {
      throw error;
    }
  }

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
