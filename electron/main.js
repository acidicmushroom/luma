
//  opens the window and does the jobs that a web page is not allowed to do (open dialogs, copy files).

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { copySongToFolder, getMimeType } = require('./songs');

// "npm run dev" adds --dev, so we load the live Vite page instead of the built files
const isDev = process.argv.includes('--dev');

let win;

function createWindow() {
  win = new BrowserWindow({
    title: 'Luma',
    width: 340,
    height: 560,
    resizable: false,
    frame: false,        // no system title bar (Luma draws its own)
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

// window
ipcMain.on('window:minimize', () => win.minimize());
ipcMain.on('window:close', () => win.close());

// add songs to the current folder

// copies a song into the folder, then sends it back to the app so it can be added to the playlist.
// If something goes wrong answer { ok: false, error: error.message };
ipcMain.handle('songs:add', async (event, { filePath, folder }) => {
  try {
    const copiedPath = await copySongToFolder(filePath, folder);
    return {
      ok: true,
      name: path.basename(copiedPath),
      type: getMimeType(copiedPath),
      data: await fs.promises.readFile(copiedPath)
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// open the choose files window and returns the chosen paths
ipcMain.handle('songs:pick', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'opus', 'wma'] }]
  });
  return result.canceled ? [] : result.filePaths;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
