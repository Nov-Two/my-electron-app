const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  ping: () => ipcRenderer.invoke("ping"),
  selectVideo: () => ipcRenderer.invoke("select-video"),
  analyzeVideo: (videoPath) => ipcRenderer.invoke("analyze-video", videoPath),
  // 除函数之外，我们也可以暴露变量
});
