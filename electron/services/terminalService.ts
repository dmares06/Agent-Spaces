import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';
import { randomUUID } from 'crypto';

interface TerminalSession {
  id: string;
  pty: pty.IPty;
  workspacePath: string;
}

const sessions = new Map<string, TerminalSession>();

let mainWindowRef: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindowRef = window;
}

export function createTerminal(workspacePath?: string): string {
  const id = randomUUID();

  // Use bash instead of zsh - more reliable in Electron
  const shell = process.platform === 'win32'
    ? 'powershell.exe'
    : '/bin/bash';

  const cwd = workspacePath || process.env.HOME || process.cwd();

  // Args to make shell a login shell
  const shellArgs = process.platform === 'win32' ? [] : ['--login'];

  console.log('[Terminal] Creating terminal session:', id);
  console.log('[Terminal] Shell:', shell, 'Args:', shellArgs);
  console.log('[Terminal] CWD:', cwd);
  console.log('[Terminal] ENV keys:', Object.keys(process.env).length);

  try {
    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: cwd,
      env: process.env as Record<string, string>,
    });

    console.log('[Terminal] PTY process spawned successfully');

    ptyProcess.onData((data) => {
      console.log('[Terminal] Received data for session:', id, 'length:', data.length);
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('terminal-output', { id, data });
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.error('[Terminal] Session exited:', id, 'exitCode:', exitCode, 'signal:', signal);
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('terminal-exit', { id, exitCode });
      }
      sessions.delete(id);
    });

    sessions.set(id, { id, pty: ptyProcess, workspacePath: cwd });
    return id;
  } catch (error) {
    console.error('[Terminal] Failed to create terminal:', error);
    throw error;
  }
}

export function writeToTerminal(id: string, data: string): void {
  const session = sessions.get(id);
  if (session) {
    session.pty.write(data);
  }
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  const session = sessions.get(id);
  if (session) {
    session.pty.resize(cols, rows);
  }
}

export function killTerminal(id: string): void {
  const session = sessions.get(id);
  if (session) {
    console.log('[Terminal] Killing session:', id);
    session.pty.kill();
    sessions.delete(id);
  }
}

export function killAllTerminals(): void {
  console.log('[Terminal] Killing all sessions');
  for (const session of sessions.values()) {
    session.pty.kill();
  }
  sessions.clear();
}
