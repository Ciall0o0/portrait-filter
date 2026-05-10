# Portrait Filter - 人像摄影批量筛选工具

一个 Windows GUI 程序，用于批量筛选人像摄影图像。通过调用 OpenAI Chat Completions 兼容 API 进行视觉判断，识别并删除闭眼、反光、低画质等低质量图像。

## 技术栈

- **前端**: React + TypeScript + Material UI (MUI)
- **后端**: Python FastAPI
- **桌面壳**: Electron
- **AI 判断**: OpenAI Chat Completions API (兼容任意厂商)

## 快速开始

### 1. 配置 API

复制 `.env.example` 为 `backend/.env` 并填入你的 API 配置：

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`：

```env
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

### 2. 安装依赖

```bash
# Python 后端
cd backend
uv sync

# 前端
cd ../frontend
npm install

# Electron (可选，仅打包时需要)
cd ../electron
npm install
```

### 3. 开发模式运行

```bash
# 终端 1: 启动后端
cd backend
uv run uvicorn main:app --port 18903 --reload

# 终端 2: 启动前端
cd frontend
npm run dev
```

打开浏览器访问 `http://localhost:5173`。

### 4. 使用流程

1. 点击"打开文件夹"选择包含图片的目录
2. 点击"开始评估"，等待 AI 对每张图片进行质量判断
3. 查看质量评分和问题列表（绿色=优质，黄色=一般，红色=低质）
4. 筛选和选择低质量图片，点击"删除所选"移入回收站
5. 可导出 CSV/JSON 评估报告

## 项目结构

```
portrait-filter/
├── backend/           # Python FastAPI 后端
│   ├── main.py        # 入口
│   ├── config.py      # 配置 (pydantic-settings)
│   ├── models/        # Pydantic 数据模型
│   ├── routes/        # API 路由
│   ├── services/      # 业务逻辑
│   └── db/            # SQLite 缓存
├── frontend/          # React + MUI 前端
│   └── src/
│       ├── components/ # UI 组件
│       ├── hooks/     # 自定义 hooks
│       ├── store/     # Zustand 状态
│       └── types/     # TypeScript 类型
├── electron/          # Electron 桌面壳
│   ├── main.js        # 主进程
│   └── preload.js     # 预加载脚本
└── README.md
```

## API 端点

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/folders/open` | 打开/浏览文件夹 |
| GET  | `/api/images` | 获取文件夹中的图片列表 |
| GET  | `/api/images/{id}/thumbnail` | 获取缩略图 (base64) |
| POST | `/api/assess/batch` | 启动批量质量评估 |
| WS   | `/ws/batch/{batch_id}` | 评估进度实时更新 |
| POST | `/api/images/delete` | 删除图片（移入回收站） |
| POST | `/api/images/undo` | 撤销删除操作 |
| GET  | `/api/export/report` | 导出评估报告 |
| PUT  | `/api/config` | 更新配置 |

## 评估维度

AI 对每张图片进行多维度评估：

- **闭眼** (closed_eyes) - 被摄人物眼睛闭合
- **反光** (glare_reflection) - 镜面反光/眩光
- **低分辨率** (low_resolution) - 图像分辨率不足
- **运动模糊** (motion_blur) - 动态模糊
- **曝光不佳** (poor_exposure) - 过曝/欠曝
- **构图不佳** (poor_composition) - 构图问题
- **色彩失衡** (bad_color_balance) - 白平衡/色调问题
- **噪点** (noise) - 高 ISO 噪点
