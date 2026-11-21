// Electron runs this first. It only does one job: open a small window.

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// "npm run dev" adds --dev, so we load the live Vite page instead of the built files
const isDev = process.argv.includes('--dev');

let win;

function createWindow() {
  win = new BrowserWindow({
    title: 'Luma',
    width: 340,
    height: 560,
    resizable: false,
    frame: false,        // no system title bar
    transparent: true,   // no background behind the player
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// the minimize / close buttons in the app send these messages
ipcMain.on('window:minimize', () => win.minimize());
ipcMain.on('window:close', () => win.close());

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
