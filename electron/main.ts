import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { autoUpdater } from 'electron-updater';
import { initDatabase, closeDatabase } from './database/db.js';
import { registerHandlers } from './ipc/handlers.js';
import { setMainWindow, killAllTerminals } from './services/terminalService.js';
import { initializeScheduler, stopAllJobs } from './services/schedulerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Single instance lock - prevent multiple app windows
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Main] Another instance is already running, quitting...');
  app.quit();
}

// Configure auto-updater
autoUpdater.autoDownload = false; // Ask user before downloading
autoUpdater.autoInstallOnAppQuit = true; // Install on quit

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdater] Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('[AutoUpdater] No updates available');
});

autoUpdater.on('error', (err) => {
  console.error('[AutoUpdater] Error:', err);
});

autoUpdater.on('download-progress', (progress) => {
  console.log(`[AutoUpdater] Download progress: ${progress.percent}%`);
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', progress);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdater] Update downloaded:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

function checkForUpdates() {
  console.log('[AutoUpdater] Starting update check...');
  autoUpdater.checkForUpdates();

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);
}

// Auto-reload Electron when main process files change (dev only)
if (isDev) {
  import('electron-reloader').then((module: any) => {
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
  }).catch((err: any) => {
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
    // Dev tools can be opened manually with Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows/Linux)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle second instance - focus existing window
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

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

  // Initialize scheduler service
  try {
    initializeScheduler();
    console.log('[Main] Scheduler service initialized');
  } catch (error) {
    console.error('[Main] Failed to initialize scheduler service:', error);
  }

  // Open at login (production only) - keeps the app persistent
  if (!isDev) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false,
    });
    checkForUpdates();
  }

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
  stopAllJobs();
  closeDatabase();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason);
});
