const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const BACKEND_PORT = 18903;
const isDev = process.argv.includes("--dev");

let mainWindow = null;
let pythonProcess = null;

function findBackendBinary() {
  if (isDev) return null;

  // electron-builder places extraResources into process.resourcesPath
  const resourcesPath = process.resourcesPath || path.join(__dirname, "..");
  const candidates = [
    path.join(resourcesPath, "backend", "portrait-filter-backend.exe"),
    path.join(__dirname, "..", "backend", "dist", "portrait-filter-backend.exe"),
  ];

  for (const p of candidates) {
    try {
      // Let spawn fail naturally if the binary is missing
      require("fs").accessSync(p, require("fs").constants.X_OK);
      return p;
    } catch { /* candidate not found, try next */ }
  }

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

  const logOutput = (data) => console.log(`[Python] ${data.toString().trim()}`);
  pythonProcess.stdout.on("data", logOutput);
  pythonProcess.stderr.on("data", logOutput);

  pythonProcess.on("error", (err) => {
    console.error("Failed to start backend:", err.message);
    if (err.message.includes("ENOENT") || err.message.includes("uv")) {
      dialog.showErrorBox(
        "后端启动失败",
        "找不到后端程序。\n"
        + (isDev ? "请确保已安装 uv (https://docs.astral.sh/uv/)" : "请检查安装是否完整。")
      );
    }
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

function waitForBackend(retries = 20, delay = 200) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/config`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (n <= 1) return reject(new Error("Backend did not start in time"));
        setTimeout(() => attempt(n - 1), delay);
      });
      req.setTimeout(1000, () => { req.destroy(); attempt(n - 1); });
    };
    attempt(retries);
  });
}

// App lifecycle
app.whenReady().then(async () => {
  startPythonBackend();

  try {
    await waitForBackend();
    console.log("Backend is ready");
  } catch (e) {
    console.warn("Backend health check timed out:", e.message);
    dialog.showErrorBox(
      "后端启动失败",
      "无法连接到后端服务。请检查：\n"
      + "1. 杀毒软件是否拦截了 portrait-filter-backend.exe\n"
      + "2. 端口 18903 是否被其他程序占用\n"
      + "3. 尝试重新启动应用"
    );
  }

  createWindow();
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
    if (pythonProcess === null) {
      startPythonBackend();
    }
    createWindow();
  }
});
