// Prevent console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{BufRead, BufReader, Read};
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

const BACKEND_PORT: u16 = 18903;
const POLL_RETRIES: u32 = 40;
const POLL_INTERVAL_MS: u64 = 500;
const CONNECT_TIMEOUT_SECS: u64 = 2;

struct BackendProcess(Mutex<Option<Child>>);

fn find_backend_binary(app: &tauri::AppHandle) -> Option<PathBuf> {
    let triple = "x86_64-pc-windows-msvc";
    let names = [
        format!("portrait-filter-backend-{triple}.exe"),
        "portrait-filter-backend.exe".into(),
    ];

    // Search paths: exe directory, CWD, resource directory, app data
    let exe_dir = std::env::current_exe().ok()?.parent()?.to_path_buf();
    let cwd = std::env::current_dir().unwrap_or_default();
    let resource_dir = app.path().resource_dir().unwrap_or_default();

    let search_dirs = [
        exe_dir.clone(),
        cwd,
        resource_dir,
        exe_dir.join("backend"),
    ];

    for dir in &search_dirs {
        for name in &names {
            let path = dir.join(name);
            if path.exists() {
                return Some(path);
            }
        }
    }

    eprintln!(
        "Backend binary not found. Searched: {:?} in: {:?}",
        names, search_dirs
    );
    None
}

fn spawn_backend_child(app: &tauri::AppHandle) -> Option<Child> {
    if cfg!(debug_assertions) {
        let backend_dir = PathBuf::from(
            std::env::var("BACKEND_DIR")
                .unwrap_or_else(|_| String::from("../backend")),
        );

        println!(
            "Starting Python backend from: {}",
            backend_dir.display()
        );

        Command::new("uv")
            .args([
                "run",
                "uvicorn",
                "main:app",
                "--port",
                &BACKEND_PORT.to_string(),
                "--host",
                "127.0.0.1",
            ])
            .current_dir(&backend_dir)
            .env("PYTHONUNBUFFERED", "1")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .ok()
    } else {
        let exe = find_backend_binary(app)?;
        let data_dir = app.path().app_data_dir().ok()?;

        // Ensure data directory exists (.env, cache.db, .trash_backup go here)
        std::fs::create_dir_all(&data_dir).ok()?;

        println!(
            "Starting bundled backend: {} (cwd: {})",
            exe.display(),
            data_dir.display()
        );

        Command::new(&exe)
            .current_dir(&data_dir)
            .env("BACKEND_PORT", BACKEND_PORT.to_string())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .ok()
    }
}

fn spawn_log_thread(label: &'static str, stream: impl Read + Send + 'static) {
    let reader = BufReader::new(stream);
    std::thread::spawn(move || {
        for line in reader.lines() {
            if let Ok(line) = line {
                println!("[{}] {}", label, line);
            }
        }
    });
}

fn pipe_output(child: &mut Child) {
    if let Some(stdout) = child.stdout.take() {
        spawn_log_thread("Python", stdout);
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_log_thread("Python", stderr);
    }
}

fn stop_backend(state: &tauri::State<BackendProcess>) {
    let mut guard = match state.0.lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    if let Some(mut child) = guard.take() {
        println!("Stopping Python backend...");
        #[cfg(target_os = "windows")]
        {
            let pid = child.id();
            let _ = Command::new("taskkill")
                .args(["/pid", &pid.to_string(), "/f", "/t"])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = child.kill();
        }
        let _ = child.wait();
    }
}

fn wait_for_backend() -> bool {
    let addr: SocketAddr = format!("127.0.0.1:{BACKEND_PORT}")
        .parse()
        .expect("invalid backend address");
    for _ in 0..POLL_RETRIES {
        if TcpStream::connect_timeout(&addr, Duration::from_secs(CONNECT_TIMEOUT_SECS)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(POLL_INTERVAL_MS));
    }
    false
}

#[tauri::command]
fn get_backend_port() -> u16 {
    BACKEND_PORT
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .manage(BackendProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![get_backend_port])
        .setup(|app| {
            let handle = app.handle().clone();

            let Some(mut child) = spawn_backend_child(&handle) else {
                eprintln!("Failed to start Python backend");
                let _ = app
                    .dialog()
                    .message("后端启动失败。\n\n可能原因：\n1. 杀毒软件拦截了 portrait-filter-backend.exe\n2. 后端文件未正确安装\n3. 未安装 Python/uv 环境（开发模式）")
                    .title("后端启动失败")
                    .kind(tauri_plugin_dialog::MessageDialogKind::Error)
                    .blocking_show();
                return Ok(());
            };

            pipe_output(&mut child);

            let state = app.state::<BackendProcess>();
            let mut guard = state.0.lock().expect("BackendProcess mutex poisoned");
            *guard = Some(child);
            drop(guard);

            if wait_for_backend() {
                println!("Backend is ready");
            } else {
                eprintln!("Backend health check timed out");
                let msg = format!(
                    "无法连接到后端服务。请检查：\n\
                     1. 杀毒软件是否拦截了 portrait-filter-backend.exe\n\
                     2. 端口 {BACKEND_PORT} 是否被其他程序占用\n\
                     3. 尝试重新启动应用"
                );
                let _ = app
                    .dialog()
                    .message(msg)
                    .title("后端启动失败")
                    .kind(tauri_plugin_dialog::MessageDialogKind::Error)
                    .blocking_show();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state = window.state::<BackendProcess>();
                stop_backend(&state);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Portrait Filter");
}
