import sys, json, cv2, torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import numpy as np

print("🧠 Python 视频分析启动")

if len(sys.argv) < 2:
    print(json.dumps({"error": "缺少视频路径"}, ensure_ascii=False))
    sys.exit(1)

video_path = sys.argv[1]
cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(json.dumps({"error": f"无法打开视频: {video_path}"}, ensure_ascii=False))
    sys.exit(1)

# 初始化 CLIP 模型
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# 均匀取10帧
frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
indices = np.linspace(0, frame_count - 1, 10, dtype=int)
frames = []
for i in indices:
    cap.set(cv2.CAP_PROP_POS_FRAMES, i)
    ret, frame = cap.read()
    if ret:
        frames.append(frame)
cap.release()

# 中文标签，美女跳舞 + 动物
labels = [
    "美女跳舞", "舞台表演", "街舞", "单人舞蹈", "多人舞蹈",
    "猫", "狗", "宠物", "鸟", "动物"
]

summary = {label: [] for label in labels}

for frame in frames:
    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    inputs = processor(text=labels, images=img, return_tensors="pt", padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
        probs = outputs.logits_per_image.softmax(dim=1).numpy()[0]
    for label, p in zip(labels, probs):
        summary[label].append(float(p))

# 对每个标签做加权平均（这里简单取中位数+均值）
final_summary = {}
for label, values in summary.items():
    if not values:
        continue
    median = np.median(values)
    mean = np.mean(values)
    score = (median + mean) / 2  # 简单加权
    if score >= 0.15:  # 过滤低概率标签
        final_summary[label] = round(score, 3)

# 根据分数排序，输出前5标签
sorted_labels = sorted(final_summary.items(), key=lambda x: x[1], reverse=True)[:5]

# 判断类型：美女跳舞 vs 动物
if any(l in ["美女跳舞", "舞台表演", "街舞", "单人舞蹈", "多人舞蹈"] for l, _ in sorted_labels):
    video_type = "舞蹈"
elif any(l in ["猫", "狗", "宠物", "鸟", "动物"] for l, _ in sorted_labels):
    video_type = "动物"
else:
    video_type = "未知"

result = {
    "类型": video_type,
    "标签": sorted_labels
}

print(json.dumps(result, ensure_ascii=False))