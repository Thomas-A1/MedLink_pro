import { app, BrowserWindow, ipcMain, nativeImage, nativeTheme } from 'electron';
import path from 'node:path';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1f1f1f' : '#f5f5f5',
    icon: isDev
      ? path.join(__dirname, '../../public/medlink-logo.png')
      : path.join(__dirname, '../renderer/medlink-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  // Ensure the app name (used by dock / taskbar tooltips) is set to MedLink
  app.name = 'MedLink';

  if (!isDev) {
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }

  // On macOS, explicitly set the dock icon (BrowserWindow.icon is ignored for the dock in dev)
  if (process.platform === 'darwin') {
    const baseIconDir = isDev
      ? path.join(__dirname, '../../public')
      : path.join(__dirname, '../renderer');
    const dockIconPath = path.join(baseIconDir, 'medlink-logo.png');
    const dockIcon = nativeImage.createFromPath(dockIconPath);
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon);
    }
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('app:get-version', () => app.getVersion());
