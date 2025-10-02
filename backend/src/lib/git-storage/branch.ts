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

  // Switch to main to update metadata (don't pollute the new branch)
  await git.checkout({ fs, dir, ref: 'main' });

  // Store branch metadata on main branch
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

  // Commit metadata on main branch
  await git.add({ fs, dir, filepath: '.soapy-branches.json' });
  await git.commit({
    fs,
    dir,
    message: `Create branch: ${branchName}`,
    author: {
      name: 'Soapy System',
      email: 'system@soapy.local',
    },
  });

  // Ensure we stay on main after creating the branch
  // (git.checkout above should have done this, but double-check)
  const currentBranch = await git.currentBranch({ fs, dir });
  if (currentBranch !== 'main') {
    await git.checkout({ fs, dir, ref: 'main' });
  }

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
