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

  // Create Git branch
  const ref = `refs/heads/${branchName}`;
  await git.branch({ fs, dir, ref: branchName });

  // Store branch metadata
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

  // Commit metadata
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
