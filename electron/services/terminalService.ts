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
  const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'zsh';

  console.log('[Terminal] Creating terminal session:', id, 'in', workspacePath);

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: workspacePath || process.env.HOME || '/',
    env: process.env as Record<string, string>,
  });

  ptyProcess.onData((data) => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('terminal-output', { id, data });
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    console.log('[Terminal] Session exited:', id, 'with code:', exitCode);
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('terminal-exit', { id, exitCode });
    }
    sessions.delete(id);
  });

  sessions.set(id, { id, pty: ptyProcess, workspacePath });
  return id;
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
