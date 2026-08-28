const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    backgroundColor: '#141312',
    title: 'OpenPrompt — AdsFusion',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL('https://open-prompt-three.vercel.app');

  win.webContents.on('did-fail-load', () => {
    const f = path.join(__dirname, 'index.html');
    if (fs.existsSync(f)) win.loadFile(f);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (app.isReady() && BrowserWindow.getAllWindows().length === 0) createWindow();
});
