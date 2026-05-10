const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

const BACKEND_PORT = 18903;
const isDev = process.argv.includes("--dev");

let mainWindow = null;
let pythonProcess = null;

function startPythonBackend() {
  // Determine Python backend path
  const backendDir = path.join(__dirname, "..", "backend");
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  console.log(`Starting Python backend from: ${backendDir}`);

  pythonProcess = spawn(pythonCmd, ["-m", "uvicorn", "main:app", "--port", String(BACKEND_PORT), "--host", "127.0.0.1"], {
    cwd: backendDir,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  pythonProcess.stdout.on("data", (data) => {
    console.log(`[Python] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on("data", (data) => {
    console.log(`[Python] ${data.toString().trim()}`);
  });

  pythonProcess.on("error", (err) => {
    console.error("Failed to start Python backend:", err.message);
  });

  pythonProcess.on("close", (code) => {
    console.log(`Python backend exited with code ${code}`);
    pythonProcess = null;
  });
}

function stopPythonBackend() {
  if (pythonProcess) {
    console.log("Stopping Python backend...");
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pythonProcess.pid), "/f", "/t"]);
    } else {
      pythonProcess.kill("SIGTERM");
    }
    pythonProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Portrait Filter - 人像摄影批量筛选",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#0f0f1a",
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, "..", "frontend", "dist", "index.html");
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC handlers
ipcMain.handle("select-folder", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "选择图片文件夹",
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle("get-backend-port", () => {
  return BACKEND_PORT;
});

// App lifecycle
app.whenReady().then(() => {
  startPythonBackend();

  // Wait a moment for backend to start, then create window
  setTimeout(() => {
    createWindow();
  }, 2000);
});

app.on("window-all-closed", () => {
  stopPythonBackend();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopPythonBackend();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
