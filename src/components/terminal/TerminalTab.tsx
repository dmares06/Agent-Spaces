import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { electronAPI } from '../../lib/electronAPI';
import '@xterm/xterm/css/xterm.css';

interface TerminalTabProps {
  workspacePath: string | undefined;
  tabId: string;
  isActive: boolean;
  initialCommand?: string;
}

export default function TerminalTab({
  workspacePath,
  tabId,
  isActive,
  initialCommand,
}: TerminalTabProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Prevent double initialization (React strict mode)
    if (initializedRef.current) {
      console.log('[TerminalTab] Already initialized, skipping:', tabId);
      return;
    }
    initializedRef.current = true;

    console.log('[TerminalTab] Initializing tab:', tabId);

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      allowProposedApi: true,
      theme: {
        background: '#1a1a1a',
        foreground: '#e5e5e5',
        cursor: '#e5e5e5',
        cursorAccent: '#1a1a1a',
        selectionBackground: '#404040',
        black: '#1a1a1a',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#e5e5e5',
        brightBlack: '#737373',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        if (sessionIdRef.current) {
          electronAPI.terminal.resize(
            sessionIdRef.current,
            xtermRef.current.cols,
            xtermRef.current.rows
          );
        }
      }
    });
    resizeObserver.observe(terminalRef.current);

    // Fit and create session
    setTimeout(async () => {
      fitAddon.fit();

      try {
        // Create the terminal session first
        const sessionId = await electronAPI.terminal.create(workspacePath || process.env.HOME || '~');
        console.log('[TerminalTab] Session created:', sessionId, 'for tab:', tabId);
        sessionIdRef.current = sessionId;

        // Register callbacks for this specific session
        electronAPI.terminal.registerOutputCallback(sessionId, (data) => {
          term.write(data.data);
        });

        electronAPI.terminal.registerExitCallback(sessionId, (data) => {
          term.write(`\r\n\x1b[90m[Process exited with code ${data.exitCode}]\x1b[0m\r\n`);
        });

        // Send input to backend
        term.onData((data) => {
          if (sessionIdRef.current) {
            electronAPI.terminal.write(sessionIdRef.current, data);
          }
        });

        // Send initial size
        electronAPI.terminal.resize(sessionId, term.cols, term.rows);

        // Run initial command if provided
        if (initialCommand) {
          setTimeout(() => {
            electronAPI.terminal.write(sessionId, initialCommand + '\n');
          }, 500);
        }
      } catch (error) {
        console.error('[TerminalTab] Failed to create session:', error);
        term.write(`\r\n\x1b[31mFailed to create terminal session\x1b[0m\r\n`);
      }
    }, 100);

    // Cleanup
    return () => {
      console.log('[TerminalTab] Cleaning up tab:', tabId);
      resizeObserver.disconnect();

      const sessionToCleanup = sessionIdRef.current;
      if (sessionToCleanup) {
        // Unregister callbacks first
        electronAPI.terminal.unregisterCallbacks(sessionToCleanup);
        // Then kill the session
        electronAPI.terminal.kill(sessionToCleanup);
      }
      sessionIdRef.current = null;

      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      initializedRef.current = false;
    };
  }, [workspacePath, tabId, initialCommand]);

  // Focus when becoming active
  useEffect(() => {
    if (isActive && xtermRef.current) {
      xtermRef.current.focus();
      fitAddonRef.current?.fit();
    }
  }, [isActive]);

  return (
    <div
      ref={terminalRef}
      className={`h-full w-full ${isActive ? 'block' : 'hidden'}`}
      style={{ padding: '8px' }}
    />
  );
}
