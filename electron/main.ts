import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, closeDatabase } from './database/db.js';
import { registerHandlers } from './ipc/handlers.js';
import { setMainWindow, killAllTerminals } from './services/terminalService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Auto-reload Electron when main process files change (dev only)
if (isDev) {
  import('electron-reloader').then((module) => {
    module.default(import.meta, {
      debug: false,
      watchRenderer: false, // Vite handles renderer hot reload
      ignore: [
        /node_modules/,
        /dist/,
        /\.git/,
        /\.vscode/,
        /src/,  // Frontend handled by Vite HMR
      ],
    });
    console.log('[Main] electron-reloader initialized');
  }).catch((err) => {
    console.log('[Main] electron-reloader not available:', err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#FAFAFA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('[Main] App is ready');

  // Initialize database
  try {
    initDatabase();
    console.log('[Main] Database initialized');
  } catch (error) {
    console.error('[Main] Failed to initialize database:', error);
    app.quit();
    return;
  }

  // Register IPC handlers
  registerHandlers();

  createWindow();

  // Set mainWindow reference for terminal service
  setMainWindow(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('[Main] App quitting, closing database');
  killAllTerminals();
  closeDatabase();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason);
});
