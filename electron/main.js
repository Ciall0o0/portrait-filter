const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

const BACKEND_PORT = 18903;
const isDev = process.argv.includes("--dev");

let mainWindow = null;
let pythonProcess = null;

function findBackendBinary() {
  // Production: look for PyInstaller-bundled .exe in extraResources
  if (isDev) return null; // use uv run in dev

  // electron-builder places extraResources into process.resourcesPath
  const resourcesPath = process.resourcesPath || path.join(__dirname, "..");
  const candidatePaths = [
    path.join(resourcesPath, "backend", "portrait-filter-backend.exe"),
    path.join(resourcesPath, "backend", "dist", "portrait-filter-backend.exe"),
    path.join(__dirname, "..", "backend", "dist", "portrait-filter-backend.exe"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      console.log(`Found bundled backend: ${p}`);
      return p;
    }
  }

  console.warn("No bundled backend binary found, falling back to uv");
  return null;
}

function startPythonBackend() {
  const backendDir = path.join(__dirname, "..", "backend");
  const backendBinary = findBackendBinary();

  if (backendBinary) {
    // Production: use PyInstaller-bundled executable
    // Set cwd to userData so .env / cache.db / .trash_backup are writable
    const cwd = app.getPath("userData");
    console.log(`Starting bundled backend: ${backendBinary} (cwd: ${cwd})`);
    pythonProcess = spawn(backendBinary, [], {
      cwd,
      env: { ...process.env, BACKEND_PORT: String(BACKEND_PORT) },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
  } else {
    // Development: use uv + uvicorn
    console.log(`Starting Python backend from: ${backendDir}`);
    pythonProcess = spawn(
      "uv", ["run", "uvicorn", "main:app", "--port", String(BACKEND_PORT), "--host", "127.0.0.1"],
      {
        cwd: backendDir,
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
  }

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
