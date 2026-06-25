# 🪶 Raven

**你思考方式的地图。**

探索一个问题的过程——你问的每一个问题、你自己想到的每一个洞察——都长在同一棵树上，按照你真实的思维路径生长。大模型的回答只是其中一种节点，不是全部。

---

## 为什么需要它

探索一个问题时，你有三件事想做：
1. 问 AI，追问旁支，不打断主线
2. 把自己想到的东西记下来，挂在思维的正确位置上
3. 回头看，完整保留「我是怎么想清楚这件事的」

现有工具都只做了其中一件。Raven 把三件事合在一棵树里。

---

## 两种节点，一种结构

| 节点类型 | 触发方式 | 外观 |
|---------|---------|------|
| 💬 AI 节点 | 输入框切到「问 AI」模式，发送问题 | 紫色，显示问答对 |
| ✏️ 想法节点 | 输入框切到「记想法」模式，写下笔记 | 琥珀色，显示你自己的文字 |

两种节点都挂在树上，都有父子关系，都继承祖先上下文——结构完全一致。

---

## 功能

- **树状探索** — 每次提问或记录生成一个节点，形成可视化对话树
- **无限分支** — 点击任意历史节点，从那里继续提问或继续记录
- **上下文自动继承** — 分支时完整继承该节点以上的所有内容
- **流式响应** — AI 回答逐字输出，完成后节点实时出现在树上
- **多会话管理** — 侧边栏管理多个独立的探索主题
- **模型随时切换** — 内置设置面板，运行时热切换 provider / base_url / model

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 · React Flow (@xyflow/react) · Zustand · Vite |
| 后端 | FastAPI · SQLite (SQLAlchemy) · Server-Sent Events |
| LLM | 支持 Anthropic SDK 和任意 OpenAI-compatible 接口 |
| 实时通信 | WebSocket（多端同步） |

---

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 18+

### 1. 克隆项目

```bash
git clone <repo-url>
cd raven-app
```

### 2. 配置后端

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

编辑 `backend/.env`，填入你的模型配置：

```ini
# provider: anthropic | openai（兼容 DeepSeek / Groq 等 OpenAI-compatible 接口）
LLM_PROVIDER=openai
LLM_API_KEY=你的 API Key
LLM_BASE_URL=https://api.openai.com/v1   # 留空使用官方地址
LLM_MODEL=gpt-4o-mini
LLM_MAX_TOKENS=2048
```

### 3. 配置前端

```bash
cd frontend
npm install
```

`frontend/.env` 默认已包含：

```ini
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### 4. 启动

开两个终端分别运行：

```bash
# 终端 1 — 后端
cd backend && source venv/bin/activate
uvicorn main:app --reload

# 终端 2 — 前端
cd frontend
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)

---

## 界面布局

```
┌─────────────┬──────────────────────────┬───────────────────┐
│  会话列表    │       对话面板            │     树状图         │
│             │  消息列表（含 AI 回答     │  💬 AI 节点（紫）  │
│             │  和 ✏️ 用户想法）          │  ✏️ 想法节点（琥珀）│
│  ⚙ 模型设置 │  ── 输入框（两种模式）── │                   │
└─────────────┴──────────────────────────┴───────────────────┘
```

---

## 项目结构

```
raven-app/
├── backend/
│   ├── main.py                  # FastAPI 入口，注册路由和 WebSocket
│   ├── models/
│   │   └── database.py          # Session / Node 模型（含 node_type 字段）
│   ├── routers/
│   │   ├── sessions.py          # 会话 CRUD + 树查询
│   │   ├── nodes.py             # AI 节点（SSE 流式）+ 想法节点（即时保存）
│   │   └── settings.py          # 运行时 LLM 配置热更新
│   ├── services/
│   │   ├── claude.py            # LLM 调用（anthropic / openai-compatible）
│   │   └── context.py           # 祖先链上下文构建 + 长度裁剪
│   └── ws/
│       └── manager.py           # WebSocket 连接管理
│
└── frontend/
    └── src/
        ├── api/
        │   ├── http.js           # REST + SSE 封装（含 createNote）
        │   └── socket.js         # WebSocket 客户端（自动重连）
        ├── store/
        │   ├── treeStore.js      # 树状态（sessions / nodes / 布局）
        │   ├── chatStore.js      # 对话状态（sendMessage / addNote / 流式）
        │   └── settingsStore.js  # LLM 设置状态
        └── components/
            ├── SessionSidebar/   # 会话列表 + 模型设置入口
            ├── ChatPanel/        # 对话面板（消息列表 + 双模式输入框）
            ├── TreePanel/        # React Flow 画布（AI/想法两种节点样式）
            └── SettingsPanel/    # 模型设置面板
```

---

## API 一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/sessions` | 获取所有会话 |
| POST | `/sessions` | 创建会话 |
| DELETE | `/sessions/:id` | 删除会话 |
| GET | `/sessions/:id/tree` | 获取会话完整节点树（含 node_type） |
| POST | `/nodes` | 创建 AI 节点（SSE 流式响应） |
| POST | `/nodes/note` | 创建想法节点（即时返回，不调 LLM） |
| GET | `/settings` | 获取当前 LLM 配置 |
| POST | `/settings` | 热更新 LLM 配置 |
| WS | `/ws/:session_id` | WebSocket 实时推送 |

---

## 模型设置

运行时在 UI 内切换，无需重启后端。常用预设：

| 服务商 | Base URL | 示例模型 |
|--------|----------|---------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| Anthropic | `https://api.anthropic.com` | `claude-opus-4-8` |

---

## License

MIT
