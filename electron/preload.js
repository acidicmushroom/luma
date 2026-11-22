// the react app can only use the functions listed here.

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // window buttons
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),

  //full path of a file on the disk (used to find the folder the user opened)
  getFilePath: (file) => webUtils.getPathForFile(file),

  // add songs to the current folder
  pickSongs: () => ipcRenderer.invoke('songs:pick'),
  addSong: (filePath, folder) => ipcRenderer.invoke('songs:add', { filePath, folder })
});
