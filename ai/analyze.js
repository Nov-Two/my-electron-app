const tf = require("@tensorflow/tfjs-node");
const mobilenet = require("@tensorflow-models/mobilenet");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");

async function analyze(videoPath) {
  console.log("子进程启动成功", new Date().toISOString());

  // 截取视频第一帧（需要 ffmpeg）
  const framePath = "/tmp/frame.jpg";
  const ffmpeg = require("child_process").spawnSync("ffmpeg", [
    "-y", "-i", videoPath, "-frames:v", "1", framePath
  ]);

  if (ffmpeg.error) throw new Error("无法截取视频帧：" + ffmpeg.error.message);
  if (!fs.existsSync(framePath)) throw new Error("帧图像生成失败");

  const image = await loadImage(framePath);
  const model = await mobilenet.load();
  const predictions = await model.classify(image);

  console.log(JSON.stringify({
    success: true,
    predictions
  }));
}

const videoPath = process.argv[2];
if (!videoPath) {
  console.log(JSON.stringify({ error: "未接收到视频路径" }));
  process.exit(0);
}

analyze(videoPath).catch(err => {
  console.log(JSON.stringify({ error: err.message }));
});