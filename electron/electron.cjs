const { app, BrowserWindow } = require('electron')

const path = require('path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  })
  // win.loadURL('https://ems-one-mauve.vercel.app/')
  win.loadURL('http://localhost:5173')
  // win.loadFile(path.join(app.getAppPath(), '../dist/index.html'))
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== "darwin") app.quit();
})