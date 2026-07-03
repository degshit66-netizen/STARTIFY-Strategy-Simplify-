const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  // Start the embedded Express Server
  const serverPath = path.join(__dirname, 'dist', 'server.cjs');
  serverProcess = spawn('node', [serverPath], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  // Create the desktop window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // Wait 2 seconds for Express to boot, then load the UI
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
  }, 2000);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Ensure the local server is killed when the app closes
  if (serverProcess) {
    serverProcess.kill();
  }
});
