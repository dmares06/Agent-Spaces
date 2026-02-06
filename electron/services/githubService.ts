import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as db from '../database/db.js';

let octokit: Octokit | null = null;

/**
 * Get or create the Octokit client with stored PAT
 */
function getOctokit(): Octokit {
  const token = db.getSetting('github_pat');
  if (!token) {
    throw new Error('GitHub token not configured');
  }

  if (!octokit) {
    octokit = new Octokit({ auth: token });
  }
  return octokit;
}

/**
 * Reset the Octokit client (called when token changes)
 */
export function resetClient(): void {
  octokit = null;
}

/**
 * Test the GitHub connection with stored PAT
 */
export async function testConnection(): Promise<{ success: boolean; user?: string; error?: string }> {
  try {
    const client = getOctokit();
    const { data } = await client.users.getAuthenticated();
    console.log('[GitHub] Connection test successful, user:', data.login);
    return { success: true, user: data.login };
  } catch (error: any) {
    console.error('[GitHub] Connection test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get the authenticated user info
 */
export async function getUser(): Promise<{ login: string; name: string | null; avatar_url: string } | null> {
  try {
    const client = getOctokit();
    const { data } = await client.users.getAuthenticated();
    return {
      login: data.login,
      name: data.name,
      avatar_url: data.avatar_url,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Clone a GitHub repository
 */
export async function cloneRepo(
  repoUrl: string,
  targetPath: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const token = db.getSetting('github_pat');

    // For private repos, inject token into URL
    let cloneUrl = repoUrl;
    if (token && repoUrl.startsWith('https://github.com')) {
      cloneUrl = repoUrl.replace('https://github.com', `https://${token}@github.com`);
    }

    // Validate that targetPath is a local filesystem path, not a URL
    if (/^[a-zA-Z]+:\/\//.test(targetPath)) {
      return { success: false, error: 'Target folder must be a local path (e.g., /Users/you/Projects/repo), not a URL.' };
    }

    // Derive repo name and compute final target
    const repoName = repoUrl
      .replace(/\.git$/, '')
      .split('/')
      .filter(Boolean)
      .pop() || 'repository';

    let finalTarget = targetPath;
    try {
      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        // If user selected an existing directory (e.g., a parent folder), clone into a new subfolder
        finalTarget = path.join(targetPath, repoName);
      } else {
        // Ensure parent directory exists when target is a new path
        const parent = path.dirname(targetPath);
        if (parent && !fs.existsSync(parent)) {
          fs.mkdirSync(parent, { recursive: true });
        }
      }
    } catch (e) {
      // Fall back to the provided path if FS checks fail
      finalTarget = targetPath;
    }

    // Prevent cloning into a non-empty existing directory
    if (fs.existsSync(finalTarget) && fs.statSync(finalTarget).isDirectory()) {
      const entries = fs.readdirSync(finalTarget);
      if (entries.length > 0) {
        return { success: false, error: `Target folder already exists and is not empty: ${finalTarget}` };
      }
    }

    console.log('[GitHub] Cloning repo:', cloneUrl, '→', finalTarget);

    const git = simpleGit();
    await git.clone(cloneUrl, finalTarget);

    console.log('[GitHub] Clone successful');
    return { success: true, path: finalTarget };
  } catch (error: any) {
    console.error('[GitHub] Clone failed:', error.message);
    return { success: false, error: error.message };
  }
}

export interface PROptions {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}

/**
 * Create a pull request
 */
export async function createPR(
  options: PROptions
): Promise<{ success: boolean; url?: string; number?: number; error?: string }> {
  try {
    const client = getOctokit();
    const { data } = await client.pulls.create({
      owner: options.owner,
      repo: options.repo,
      title: options.title,
      body: options.body,
      head: options.head,
      base: options.base,
    });

    console.log('[GitHub] PR created:', data.html_url);
    return { success: true, url: data.html_url, number: data.number };
  } catch (error: any) {
    console.error('[GitHub] Create PR failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * List repositories for the authenticated user
 */
export async function listRepos(): Promise<{ success: boolean; repos?: Array<{ name: string; full_name: string; private: boolean; clone_url: string }>; error?: string }> {
  try {
    const client = getOctokit();
    const { data } = await client.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 50,
    });

    const repos = data.map(repo => ({
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      clone_url: repo.clone_url,
    }));

    return { success: true, repos };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Lightweight Git helpers for local repos (status/commit/push)
 */
export async function gitStatus(repoPath: string): Promise<{
  success: boolean;
  isRepo?: boolean;
  status?: any;
  error?: string;
}> {
  try {
    const git = simpleGit({ baseDir: repoPath });
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return { success: true, isRepo: false };
    const status = await git.status();
    return { success: true, isRepo: true, status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function gitCommit(repoPath: string, message: string): Promise<{
  success: boolean;
  commitId?: string;
  error?: string;
}> {
  try {
    const git = simpleGit({ baseDir: repoPath });
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return { success: false, error: 'Not a git repository' };

    // Stage all changes and commit
    await git.add('.');
    const result = await git.commit(message || 'Update');
    return { success: true, commitId: result.commit }; 
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function gitPush(repoPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const git = simpleGit({ baseDir: repoPath });
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return { success: false, error: 'Not a git repository' };

    await git.push();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function gitCommitAndPush(repoPath: string, message: string): Promise<{ success: boolean; commitId?: string; error?: string }> {
  const commit = await gitCommit(repoPath, message);
  if (!commit.success) return commit;
  const push = await gitPush(repoPath);
  if (!push.success) return { success: false, error: push.error };
  return { success: true, commitId: commit.commitId };
}
