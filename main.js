const { app, BrowserWindow, ipcMain, dialog } = require("electron/main");
const { autoUpdater } = require('electron-updater');
const path = require("node:path");
const { spawn } = require("child_process");
const os = require('os');


try {
  require("electron-reload")(__dirname, {
    electron: require(`${__dirname}/node_modules/electron`),
  });
  console.log("✅ 开启开发热更新（electron-reload）");
} catch (e) {
  console.warn("⚠️ electron-reload 未安装，跳过开发热更新");
}
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
  win.webContents.openDevTools();
};

app.whenReady().then(() => {
  ipcMain.handle("ping", () => "zxg");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 监听文件选择请求
ipcMain.handle("select-video", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: "Videos", extensions: ["mp4", "mkv", "avi", "mov"] }],
    properties: ["openFile", "multiSelections"],
  });

  if (!canceled) return filePaths;
  return [];
});


const aiPython = path.join(process.cwd(), "ai", "analyze_video.py");
// 👇 指定 Python 可执行路径（指向 venv）
const pythonPath = path.join(process.cwd(), ".venv", "bin", "python3");

// 💡 监听前端请求，调用 Python 分析
ipcMain.handle("analyze-video", async (event, videoPath) => {
  // 转换 file:// 路径为普通路径（去掉协议 + URL 解码）
  if (videoPath.startsWith("file://")) {
    videoPath = decodeURI(videoPath.replace("file://", ""));
  }

  console.log("🎬 启动 Python AI 分析：", pythonPath, aiPython);
  console.log("📁 真实视频路径：", videoPath);

  return new Promise((resolve, reject) => {
    const py = spawn(pythonPath, ["-u", aiPython, videoPath]);
    
    let output = "";
    py.stdout.on("data", (data) => {
      output += data.toString();
      console.log("🐍 Python 输出:", data.toString());
    });

    py.stderr.on("data", (data) =>
      console.error("Python 错误:", data.toString())
    );

    py.on("close", (code) => {
      console.log("AI 子进程退出，代码：", code);
      try {
        console.log("Python 输出:", output);
        resolve(output);
      } catch (e) {
        resolve({ error: "AI 分析结果解析失败", raw: output });
      }
    });
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});


// 自动更新
autoUpdater.autoDownload = true;
autoUpdater.on('update-downloaded', () => {
  const res = dialog.showMessageBoxSync({
    type: 'info',
    buttons: ['立即重启', '稍后'],
    title: '更新完成',
    message: '新版本已下载，是否立即重启应用？'
  });
  if (res === 0) autoUpdater.quitAndInstall();
});


// 跨平台选择可执行文件
const exeName = os.platform() === 'win32' ? 'analyze_video.exe' : 'analyze_video';
const exePath = path.join(__dirname, 'ai', exeName);
function analyzeVideo(videoPath) {
  return new Promise((resolve, reject) => {
    const pyProcess = spawn(exePath, [videoPath]);

    let output = '';
    pyProcess.stdout.on('data', (data) => { output += data.toString(); });
    pyProcess.stderr.on('data', (data) => { console.error('Python 错误输出:', data.toString()); });

    pyProcess.on('close', (code) => {
      if (code !== 0) return reject(new Error(`分析进程退出，状态码: ${code}`));
      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (err) {
        reject(new Error('JSON 解析失败: ' + err.message));
      }
    });
  });
}

module.exports = { analyzeVideo };