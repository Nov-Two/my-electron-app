const information = document.getElementById("info");
information.innerText = `本应用正在使用 Chrome (v${versions.chrome()}), Node.js (v${versions.node()}), 和 Electron (v${versions.electron()})`;

const func = async () => {
  const response = await window.versions.ping();
  console.log(response); // 打印 'pong'
};

func();

const player = document.getElementById("player");
const playlistDiv = document.getElementById("playlist");
const speedLabel = document.getElementById("speedLabel");
let playbackRate = 1.0;
let playlist = [];
let currentIndex = 0;

// 打开视频文件
document.getElementById("open").addEventListener("click", async () => {
  const files = await window.versions.selectVideo();
  if (files.length > 0) {
    playlist = [...new Set([...playlist, ...files])];
    currentIndex = 0;
    renderPlaylist();
    loadVideo(currentIndex);
  }
});

// 渲染播放列表
function renderPlaylist() {
  playlistDiv.innerHTML = "";
  playlist.forEach((file, index) => {
    const div = document.createElement("div");
    div.className = "video-item" + (index === currentIndex ? " active" : "");
    div.innerHTML = `
          <img class="thumb" id="thumb-${index}" />
          <span class="title">${file.split("/").pop()}</span>
        `;
    div.addEventListener("click", () => {
      const panel = document.getElementById("ai-panel");
      panel.innerHTML = "";
      panel.classList.add("hidden");
      currentIndex = index;
      loadVideo(index);
    });
    playlistDiv.appendChild(div);
    generateThumbnail(file, index);
  });
}

// 载入视频
function loadVideo(index) {
  player.src = playlist[index];
  player.playbackRate = playbackRate;
  highlightActive();
  player.play();
}

// 当前视频播放完自动播放下一个
player.addEventListener("ended", () => {
  if (currentIndex < playlist.length - 1) {
    currentIndex++;
    loadVideo(currentIndex);
  }
});

// 更新播放列表高亮
function highlightActive() {
  document.querySelectorAll(".video-item").forEach((el, i) => {
    el.classList.toggle("active", i === currentIndex);
  });
}

// 生成缩略图
function generateThumbnail(file, index) {
  const video = document.createElement("video");
  video.src = file;
  video.currentTime = 1; // 截取1秒时的画面
  video.addEventListener("loadeddata", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const thumbUrl = canvas.toDataURL("image/jpeg");
    document.getElementById(`thumb-${index}`).src = thumbUrl;
  });
}

// 播放控制
document.getElementById("playPause").addEventListener("click", () => {
  player.paused ? player.play() : player.pause();
});
document.getElementById("prev").addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    loadVideo(currentIndex);
  }
});
document.getElementById("next").addEventListener("click", () => {
  if (currentIndex < playlist.length - 1) {
    currentIndex++;
    loadVideo(currentIndex);
  } else {
    currentIndex = 0;
    loadVideo(currentIndex);
  }
});

// 倍速控制
document.getElementById("faster").addEventListener("click", () => {
  playbackRate = Math.min(playbackRate + 0.25, 3);
  player.playbackRate = playbackRate;
  speedLabel.textContent = `${playbackRate.toFixed(2)}x`;
});
document.getElementById("slower").addEventListener("click", () => {
  playbackRate = Math.max(playbackRate - 0.25, 0.25);
  player.playbackRate = playbackRate;
  speedLabel.textContent = `${playbackRate.toFixed(2)}x`;
});

// 快捷键支持
window.addEventListener("keydown", (e) => {
  if (e.key === " ") player.paused ? player.play() : player.pause();
  if (e.key === "]") playbackRate = Math.min(playbackRate + 0.25, 3);
  if (e.key === "[") playbackRate = Math.max(playbackRate - 0.25, 0.25);
  player.playbackRate = playbackRate;
  speedLabel.textContent = `${playbackRate.toFixed(2)}x`;
});

// AI分析
document.getElementById("aiAnalyze").addEventListener("click", async () => {
  if (!playlist[currentIndex]) {
    alert("请先选择一个视频");
    return;
  }

  const video = document.getElementById("player"); // <video> 标签
  const videoPath = video?.dataset.path || video?.src; // 根据你的视频加载方式取路径
  const panel = document.getElementById("ai-panel");

  panel.innerHTML = "<p>AI 分析中，请稍候...</p>";
  panel.classList.remove("hidden");

  const result = await window.versions.analyzeVideo(videoPath);

  if (result.error) {
    panel.innerHTML = `<p style="color:red;">${result.error}</p>`;
    return;
  }

  // 格式化输出
  panel.innerHTML = `
    <h3>AI 分析结果</h3>
    ${result}
  `;
});
