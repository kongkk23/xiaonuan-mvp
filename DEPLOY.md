# 🚀 HBU.小暖学姐 - 线上部署指南

> 让你的「HBU.小暖学姐」在手机上随时随地打开！

---

## 📋 方式一：Render 部署（推荐，免费）

这是最简单的方式，5-10分钟搞定，支持手机浏览器直接访问。

### 第一步：把代码推送到 GitHub

```bash
# 1. 如果没有 GitHub 账号，先去 https://github.com 注册一个

# 2. 进入项目目录，初始化 Git
cd xiaonuan-mvp

# 3. 创建 .gitignore（防止 API Key 泄露）
echo ".env" > .gitignore

# 4. 提交代码
git init
git add .
git commit -m "HBU.小暖学姐 MVP 初版"

# 5. 在 GitHub 上创建新仓库（例如 xiaonuan-mvp）
#    不要勾选 "Add a README file"（我们已有 README）

# 6. 关联并推送
git remote add origin https://github.com/你的用户名/xiaonuan-mvp.git
git branch -M main
git push -u origin main
```

> 💡 如果不想装 Git，直接用 GitHub 网页版 → Upload files → 把项目文件夹拖进去即可。

### 第二步：部署到 Render

1. 打开 [render.com](https://render.com) → 用 GitHub 账号注册/登录

2. 点击右上角 **New +** → **Web Service**

3. 授权 Render 访问你的 GitHub → 选择 `xiaonuan-mvp` 仓库

4. 配置参数：

| 配置项 | 值 |
|--------|-----|
| **Name** | `xiaonuan`（或你喜欢的名字） |
| **Region** | `Singapore`（离中国近，速度快） |
| **Branch** | `main` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app:app -w 2 -b 0.0.0.0:$PORT --timeout 120` |
| **Free Instance** | ✅ 勾选（免费） |

5. 在 **Environment Variables** 中添加：

```
OPENAI_API_KEY=sk-8c0f5fd12d08455088a7b8a47d5f23c1
OPENAI_BASE_URL=https://api.deepseek.com/v1
MODEL_NAME=deepseek-v4-flash
MAX_CONTEXT_TOKENS=8000
```

6. 点击 **Create Web Service** → 等待 2-3 分钟自动部署

7. 部署完成后，你会得到一个网址，类似：
   ```
   https://xiaonuan.onrender.com
   ```

8. **手机上打开这个网址，小暖就来啦！** 🎉

> ⚠️ 免费版 Render 在 15 分钟无访问后会休眠，首次唤醒需要 30-50 秒。  
> 💡 解决方法：用 [UptimeRobot](https://uptimerobot.com) 每 5 分钟 ping 一次 `/health` 接口，保持不休眠。

---

## 📱 方式二：微信小程序部署

微信小程序不是直接把网页塞进去，需要重写前端代码。以下是完整指南。

### 前置条件

1. **微信小程序账号**：在 [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册（个人主体即可）
2. **已备案的域名**：小程序要求后端 API 必须是 HTTPS 域名（ICP 备案）
3. **微信开发者工具**：[下载安装](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

> ⚠️ 小程序后端必须是 **HTTPS + 已备案域名**。所以建议先把后端部署到 Render（自动 HTTPS），拿到域名后再配置小程序。

### 架构说明

```
┌─────────────┐    HTTPS     ┌──────────────┐    API    ┌──────────┐
│  微信小程序   │ ◄──────────► │  Render 后端  │ ◄───────► │ DeepSeek │
│  (前端界面)   │              │  (Flask API)  │          │  V4 Flash│
└─────────────┘              └──────────────┘          └──────────┘
```

### 小程序项目结构

在 `xiaonuan-mvp` 同级目录下创建 `xiaonuan-miniapp/`：

```
xiaonuan-miniapp/
├── app.js              # 小程序入口
├── app.json            # 小程序配置
├── app.wxss            # 全局样式
├── project.config.json # 开发者工具配置
├── pages/
│   └── chat/
│       ├── chat.wxml   # 对话界面（类HTML）
│       ├── chat.wxss   # 对话样式（类CSS）
│       ├── chat.js     # 对话逻辑
│       └── chat.json   # 页面配置
└── utils/
    └── api.js          # API 请求封装
```

### 关键代码

#### 1. `app.json` - 小程序配置

```json
{
  "pages": [
    "pages/chat/chat"
  ],
  "window": {
    "navigationBarTitleText": "HBU.小暖学姐",
    "navigationBarBackgroundColor": "#E3F2FD",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#FFF9F0"
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

#### 2. `pages/chat/chat.wxml` - 对话界面

```xml
<!-- 顶部状态栏 -->
<view class="header">
  <view class="header-left">
    <text class="logo">🦋</text>
    <view class="online-dot"></view>
    <text class="title">HBU.小暖学姐</text>
    <text class="subtitle">· 24h在线</text>
  </view>
  <view class="mood-tag">{{moodTag}}</view>
</view>

<!-- 消息列表 -->
<scroll-view class="chat-area" scroll-y scroll-into-view="{{scrollTo}}" scroll-with-animation>
  <view wx:if="{{messages.length === 0}}" class="welcome">
    <text class="welcome-emoji">🦋</text>
    <text class="welcome-title">嗨，我是小暖</text>
    <text class="welcome-desc">这里是一个安全的树洞，说什么都可以，我不会评判你。\n最近有什么想聊聊的吗？</text>
  </view>

  <view wx:for="{{messages}}" wx:key="index" id="msg-{{index}}" class="msg-wrapper {{item.role === 'user' ? 'msg-right' : 'msg-left'}}">
    <!-- AI 情绪标签 -->
    <text wx:if="{{item.role === 'assistant'}}" class="mood-label">🌸 小暖学姐 · {{item.mood || '我在听'}}</text>
    <!-- 气泡 -->
    <view class="bubble {{item.role === 'user' ? 'bubble-user' : 'bubble-ai'}}">
      <text>{{item.content}}</text>
    </view>
  </view>

  <!-- 正在输入 -->
  <view wx:if="{{typing}}" class="typing-indicator">
    <text class="typing-text">学姐正在输入</text>
    <view class="typing-dots">
      <view class="dot"></view>
      <view class="dot"></view>
      <view class="dot"></view>
    </view>
  </view>
</scroll-view>

<!-- 输入区 -->
<view class="input-area">
  <input class="input-box" 
    value="{{inputText}}" 
    placeholder="想说点什么..."
    bindinput="onInput" 
    bindconfirm="onSend"
    confirm-type="send"
    adjust-position="{{true}}"
  />
  <button class="send-btn {{inputText ? 'send-active' : ''}}" bindtap="onSend" disabled="{{!inputText || waiting}}">
    <text>➤</text>
  </button>
</view>

<!-- 底部声明 -->
<view class="footer-disclaimer">
  <text>⚠️ HBU.小暖学姐不是医生，不能诊断或治疗 | 数据仅保存在本地</text>
</view>
```

#### 3. `pages/chat/chat.js` - 核心逻辑

```javascript
// HBU.小暖学姐 - 微信小程序对话逻辑
const API_URL = 'https://你的Render域名.onrender.com';  // ← 改成你的域名

Page({
  data: {
    messages: [],       // 对话消息
    inputText: '',      // 输入框内容
    typing: false,      // 是否正在输入
    waiting: false,     // 等待AI回复
    moodTag: '✨ 等待中',
    scrollTo: '',       // 滚动锚点
  },

  onLoad() {
    // 从本地存储加载对话历史
    const history = wx.getStorageSync('chat_history') || [];
    this.setData({ messages: history });
    if (history.length > 0) {
      this.scrollToBottom();
    }
  },

  // 输入事件
  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  // 发送消息
  async onSend() {
    const text = this.data.inputText.trim();
    if (!text || this.data.waiting) return;

    // 添加用户消息
    const userMsg = { role: 'user', content: text };
    const messages = [...this.data.messages, userMsg];
    this.setData({ 
      messages, 
      inputText: '', 
      waiting: true, 
      typing: true 
    });
    this.scrollToBottom();

    // 风险检测（复用 Web 版词库）
    const riskLevel = this.detectRisk(text);
    if (riskLevel === 1) {
      // 危机干预
      const crisisMsg = {
        role: 'assistant',
        content: '谢谢你愿意告诉我。你现在一定很难受，但请相信，有人专门来帮助此刻的你。\n\n全国24小时免费心理危机干预热线：400-161-9995\n北京热线：010-82951332\n\n如果你愿意，我可以陪你聊一会儿，直到你感觉稍微好一点。',
        mood: '🤝 危机干预'
      };
      messages.push(crisisMsg);
      this.setData({ messages, waiting: false, typing: false, moodTag: '🤝 危机干预' });
      wx.setStorageSync('chat_history', messages);
      return;
    }

    // 调用后端 API（非流式，小程序对 SSE 支持有限，用一次性返回）
    try {
      const historyPayload = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await this.request(API_URL + '/chat', {
        method: 'POST',
        data: { messages: historyPayload, stream: false }
      });

      const aiMsg = {
        role: 'assistant',
        content: res.content,
        mood: '我在听'
      };
      messages.push(aiMsg);
    } catch (err) {
      messages.push({
        role: 'assistant',
        content: '抱歉，我暂时无法回应... 请稍后再试 😔',
        mood: ''
      });
    }

    this.setData({ messages, waiting: false, typing: false });
    wx.setStorageSync('chat_history', messages);
    this.scrollToBottom();
  },

  // 封装 wx.request 为 Promise
  request(url, options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: options.method || 'POST',
        data: options.data,
        header: { 'Content-Type': 'application/json' },
        success: res => resolve(res.data),
        fail: reject
      });
    });
  },

  // 风险词检测（与 Web 版一致）
  detectRisk(text) {
    const level1 = ['想死','不想活了','自杀','跳楼','割腕','烧炭','遗书','结束生命','活着没意思','死了算了'];
    for (const w of level1) {
      if (text.includes(w)) return 1;
    }
    const level2 = ['自残','伤害自己','不想吃饭','整夜睡不着','控制不住哭','想消失','没人爱我','累赘'];
    for (const w of level2) {
      if (text.includes(w)) return 2;
    }
    return 0;
  },

  // 滚动到底部
  scrollToBottom() {
    const len = this.data.messages.length;
    if (len > 0) {
      this.setData({ scrollTo: 'msg-' + (len - 1) });
    }
  }
});
```

#### 4. `pages/chat/chat.wxss` - 样式

```css
/* HBU.小暖学姐 - 微信小程序样式 */
page {
  background: linear-gradient(180deg, #FFF9F0, #F0F4F8);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部栏 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #E3F2FD;
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-left { display: flex; align-items: center; gap: 6px; }
.logo { font-size: 22px; }
.online-dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; }
.title { font-size: 16px; font-weight: 600; color: #333; }
.subtitle { font-size: 12px; color: #999; }
.mood-tag {
  padding: 4px 12px;
  background: white;
  border-radius: 16px;
  font-size: 12px;
  color: #999;
  border: 1px solid #e5e7eb;
}

/* 聊天区 */
.chat-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
}
.welcome-emoji { font-size: 48px; margin-bottom: 12px; }
.welcome-title { font-size: 18px; font-weight: 600; color: #555; margin-bottom: 8px; }
.welcome-desc { font-size: 14px; color: #999; max-width: 260px; }

/* 消息气泡 */
.msg-wrapper { margin-bottom: 16px; }
.msg-right { display: flex; justify-content: flex-end; }
.msg-left { display: flex; flex-direction: column; align-items: flex-start; }
.mood-label { font-size: 11px; color: #aaa; margin-left: 4px; margin-bottom: 4px; }

.bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
}
.bubble-user {
  background: white;
  border: 1px solid #e5e7eb;
  border-bottom-right-radius: 4px;
  color: #333;
}
.bubble-ai {
  background: #E3F2FD;
  border-bottom-left-radius: 4px;
  color: #444;
}

/* 正在输入 */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
}
.typing-text { font-size: 12px; color: #aaa; }
.typing-dots { display: flex; gap: 4px; }
.dot {
  width: 6px; height: 6px;
  background: #ccc;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}
.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* 输入区 */
.input-area {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: white;
  border-top: 1px solid #f0f0f0;
  gap: 8px;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
}
.input-box {
  flex: 1;
  height: 40px;
  padding: 0 16px;
  background: #f5f5f5;
  border-radius: 20px;
  font-size: 15px;
}
.send-btn {
  width: 40px; height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e5e7eb;
  color: #aaa;
  font-size: 16px;
  padding: 0;
}
.send-active {
  background: #3b82f6;
  color: white;
}

/* 底部声明 */
.footer-disclaimer {
  text-align: center;
  padding: 8px;
  font-size: 11px;
  color: #ccc;
  background: white;
}
```

#### 5. `utils/api.js` - API 请求封装

```javascript
// HBU.小暖学姐 - API 工具函数
const BASE_URL = 'https://你的Render域名.onrender.com';  // ← 改成你的域名

function chat(messages, stream = false) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + '/chat',
      method: 'POST',
      data: { messages, stream },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: reject
    });
  });
}

function health() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + '/health',
      method: 'GET',
      success: (res) => resolve(res.data),
      fail: reject
    });
  });
}

module.exports = { chat, health };
```

### 小程序部署步骤

```bash
# 1. 先把后端部署到 Render（见方式一），拿到域名

# 2. 在微信开发者工具中新建小程序项目
#    - 项目目录：选择 xiaonuan-miniapp/
#    - AppID：在 mp.weixin.qq.com 后台获取

# 3. 替换所有代码中的 API 域名为你的 Render 域名

# 4. 在微信小程序后台配置服务器域名
#    开发 → 开发管理 → 服务器域名 → request合法域名
#    添加：https://你的域名.onrender.com

# 5. 开发者工具中预览 → 手机上扫码测试

# 6. 测试通过后 → 上传 → 提交审核

# 7. 审核通过 → 发布上线 🎉
```

---

## ⚠️ 重要提醒

| 平台 | 要求 |
|------|------|
| **Render** | 免费版 15 分钟无访问休眠，用 UptimeRobot 保活 |
| **微信小程序** | 后端必须是 HTTPS + 已备案域名，个人主体可注册 |
| **ICP 备案** | 如果用国内服务器，域名必须备案（约 20 工作日） |

### 推荐路线

```
① Render 部署 → 拿到 HTTPS 域名
② 手机浏览器直接打开 → MVP 验证
③ 验证通过后 → 开发微信小程序版本
④ 提交小程序审核 → 正式上线
```

---

## 💰 成本预估（DeepSeek V4 Flash）

| 规模 | 月对话量 | API 费用 |
|------|---------|---------|
| 个人使用 | 500 次 | ~¥2 |
| 小范围测试 | 2000 次 | ~¥8 |
| 正式推广 | 10000 次 | ~¥40 |

> DeepSeek V4 Flash 超便宜，¥1/百万 token 输入，¥4/百万 token 输出！

---

> 🦋 有问题随时问小暖（或者我）！
