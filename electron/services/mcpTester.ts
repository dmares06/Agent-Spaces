import { spawn } from 'child_process';
import type { MCPServer } from '../database/db.js';

export interface TestResult {
  success: boolean;
  error?: string;
  tools?: string[];
}

/**
 * Test if an MCP server can be started successfully
 */
export async function testConnection(server: MCPServer): Promise<TestResult> {
  return new Promise((resolve) => {
    try {
      const args = JSON.parse(server.args || '[]');
      const env = server.env ? { ...process.env, ...JSON.parse(server.env) } : process.env;

      console.log('[MCPTester] Testing server:', server.name, 'command:', server.command, 'args:', args);

      const proc = spawn(server.command, args, {
        env: env as NodeJS.ProcessEnv,
        shell: true,
      });

      let stdout = '';
      let stderr = '';
      let resolved = false;

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          console.log('[MCPTester] Process error:', err.message);
          resolve({ success: false, error: `Failed to start: ${err.message}` });
        }
      });

      // Give it 2 seconds to start, then check if still running
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (!proc.killed && proc.exitCode === null) {
            // Process is still running - success!
            proc.kill();
            console.log('[MCPTester] Server started successfully:', server.name);
            resolve({ success: true, tools: ['Server process started successfully'] });
          } else if (stderr) {
            console.log('[MCPTester] Server stderr:', stderr);
            resolve({ success: false, error: stderr.trim() || 'Process exited unexpectedly' });
          } else {
            resolve({ success: true, tools: ['Server responded'] });
          }
        }
      }, 2000);

      proc.on('exit', (code) => {
        if (!resolved) {
          resolved = true;
          if (code !== 0 && code !== null) {
            console.log('[MCPTester] Server exited with code:', code, 'stderr:', stderr);
            resolve({ success: false, error: stderr.trim() || `Exited with code ${code}` });
          }
        }
      });
    } catch (err: any) {
      console.error('[MCPTester] Error:', err);
      resolve({ success: false, error: err.message });
    }
  });
}
