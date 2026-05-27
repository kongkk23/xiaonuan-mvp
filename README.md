# 🦋 小暖同学 — AI情绪树洞 MVP

> **24小时在线的匿名倾诉空间**  
> 一个用 AI 做情绪陪伴的极简 Web 应用，打开即用，无需注册。

---

## 🎯 项目定位

小暖同学是一个「情绪树洞」而非「医疗工具」。它为那些**感觉自己状态不对、但还没准备好找真人咨询**的年轻人提供：

- 🫂 随时可用的匿名倾听空间
- 💬 温暖共情的 AI 对话陪伴
- 🛡️ 内置安全边界（风险识别 + 危机干预）
- 📊 对话后的情绪卡片（可视化回顾）

**⚠️ 重要：小暖同学不是医生，不能诊断或治疗任何疾病。** 如果你正在经历严重的心理危机，请立即联系专业医疗机构。

---

## 🚀 5分钟本地启动

### 前置条件

- Python 3.9+
- 一个 OpenAI 兼容 API 的 Key（推荐 Kimi / DeepSeek）

### 步骤

```bash
# 1. 进入项目目录
cd xiaonuan-mvp

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 API Key 和配置

# 4. 启动服务
python app.py
```

打开浏览器访问 **http://localhost:5000**，就可以开始聊天了！

---

## 🔑 获取 API Key

### 推荐方案一：Kimi API（月之暗面）

1. 访问 [platform.moonshot.cn](https://platform.moonshot.cn)
2. 注册/登录 → 控制台 → 创建 API Key
3. 复制 Key 到 `.env` 的 `OPENAI_API_KEY`

**价格：** `moonshot-v1-8k` 模型，输入 ¥12/百万token，输出 ¥12/百万token

### 推荐方案二：DeepSeek API

1. 访问 [platform.deepseek.com](https://platform.deepseek.com)
2. 注册/登录 → API Keys → 创建 Key
3. 在 `.env` 中修改 `OPENAI_BASE_URL=https://api.deepseek.com/v1`，`MODEL_NAME=deepseek-chat`

**价格：** `deepseek-chat` 模型，输入 ¥1/百万token，输出 ¥2/百万token（超便宜！）

### 其他兼容服务

支持所有 OpenAI 兼容格式的 API：
- Azure OpenAI → 修改 `OPENAI_BASE_URL` 和 `OPENAI_API_KEY`
- 其他国产模型 → 只要接口兼容即可

---

## 📦 项目结构

```
xiaonuan-mvp/
├── app.py                  # Flask 后端：API代理 + SSE流式 + 健康检查
├── requirements.txt        # Python 依赖
├── .env.example            # 环境变量模板
├── system_prompt.txt       # AI角色设定（可独立编辑）
├── README.md               # 本文件
└── static/
    ├── index.html          # 单页应用主界面
    ├── style.css           # 自定义样式（动画、气泡、危机模式）
    └── app.js              # 前端逻辑：对话、风险检测、情绪卡片
```

---

## ☁️ 部署到云端

### Render（推荐，免费额度）

1. 将项目推送到 GitHub 仓库
2. 登录 [render.com](https://render.com) → New Web Service
3. 连接你的仓库
4. 配置：
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app -w 2 -b 0.0.0.0:$PORT`
   - **环境变量：** 添加 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`MODEL_NAME`

### Railway

1. 将项目推送到 GitHub
2. 登录 [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. 在 Variables 中添加环境变量
4. Railway 自动检测 Python 项目并部署

### 腾讯云函数（Serverless）

```bash
# 安装 serverless 框架
npm install -g @serverless-devs/s

# 使用 Flask 适配层部署
# 需要添加 scf_bootstrap 启动脚本
echo '#!/bin/bash\n/var/lang/python3/bin/python3 app.py' > scf_bootstrap
chmod +x scf_bootstrap
```

---

## 💰 成本估算

| 场景 | API 提供商 | 单次对话量 | 1000次对话 | 10000次对话 |
|------|-----------|-----------|-----------|------------|
| **轻度使用** | Kimi (8k) | ~500 token | **¥12** | **¥120** |
| **中度使用** | Kimi (8k) | ~1500 token | **¥36** | **¥360** |
| **重度使用** | DeepSeek | ~2000 token | **¥6** | **¥60** |

> 📊 一次典型对话约 6-10 轮消息，合计约 500-2000 token。  
> 💡 **推荐 DeepSeek**：性价比极高，10000次深度对话仅 ¥60。

---

## ⚖️ 法律免责声明（部署前必读）

**⚠️ 本产品不是医疗器械，不能诊断、治疗或预防任何疾病。**

1. **非医疗声明**：小暖同学提供的 AI 对话内容仅为情绪陪伴和基础认知引导。它不构成心理咨询、心理治疗或医疗服务。

2. **数据隐私**：
   - MVP 版本**不收集、不上传、不存储**任何用户对话数据到服务器
   - 所有对话记录仅存在于用户本地浏览器的 LocalStorage 中
   - 用户清除浏览器数据即永久删除所有对话记录
   - **不实现用户注册/登录/数据库**，避免 GDPR/PIPL 合规风险

3. **危机处理**：
   - 当系统检测到风险内容时，AI 会立即提供专业心理援助热线
   - 系统**不能替代**真人紧急干预
   - 建议部署者与当地心理援助机构建立合作关系

4. **部署前建议**：
   - 咨询法律顾问，评估所在地区的合规要求
   - 在网页显著位置标明免责声明
   - 与中国心理学会等专业机构合作审核内容边界

5. **责任限制**：
   - 本软件按「现状」提供，不提供任何明示或暗示的保证
   - 开发者不对因使用本软件产生的任何直接或间接损失承担责任

---

## 🔧 后端 API 接口

### POST /chat

发送对话消息，返回 SSE 流式响应。

**请求体：**
```json
{
  "messages": [
    {"role": "system", "content": "你是小暖..."},
    {"role": "user", "content": "今天心情不太好"},
    {"role": "assistant", "content": "我在听..."}
  ],
  "stream": true
}
```

**响应：** SSE 流式事件
```
data: {"content": "我"}
data: {"content": "在"}
data: {"content": "听"}
data: [DONE]
```

### GET /health

健康检查接口。

**响应：**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "model": "moonshot-v1-8k",
  "api_configured": true
}
```

---

## 🛡️ 安全特性

| 层级 | 机制 | 说明 |
|------|------|------|
| **前端** | 风险词三级检测 | 高危→危机干预 / 中危→附加热线 / 关注→脉冲动画 |
| **前端** | LocalStorage 存储 | 对话仅存用户本地，清空即删除 |
| **后端** | API Key 代理 | Key 仅在后端使用，前端不可见 |
| **后端** | 无数据库 | 不存储任何对话记录 |
| **内容** | System Prompt 约束 | AI 角色严格遵守边界，不诊断不给药 |
| **UI** | 免责声明弹窗 | 首次访问强制展示 |

---

## 📈 商业模式（MVP验证通过后）

- **免费版**：基础对话，每日限 20 条（控制 API 成本）
- **付费版（¥9.9/月）**：无限对话 + 情绪周报 + 轻量冥想音频
- **B端版**：高校/企业采购，私有化部署，对接校内心理咨询中心

---

## 🤝 贡献与反馈

这是一个开源 MVP 项目，欢迎提 Issue 和 PR。

---

## 📜 License

MIT License — 自由使用，风险自负。

---

> 🦋 「你不需要独自面对。小暖在这里，24小时陪着你。」
