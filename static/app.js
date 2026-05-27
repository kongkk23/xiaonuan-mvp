/**
 * HBU.小暖学姐 - 前端核心逻辑
 * =========================
 * 功能：对话渲染、LocalStorage管理、风险词检测、危机干预、
 *       SSE流式接收、情绪卡片生成
 *
 * TODO: 正式上线前请创业者逐项审查以下关键逻辑：
 *   - 风险词库的完整性和准确性
 *   - 危机干预流程是否覆盖所有场景
 *   - LocalStorage 隐私合规性
 */

// ===== 常量定义 =====

/** 对话历史最大存储条数（15轮 = 30条消息） */
const MAX_HISTORY = 30;

/** LocalStorage 键名 */
const STORAGE_KEY = 'xiaonuan_chat_history';
const DISCLAIMER_KEY = 'xiaonuan_disclaimer_accepted';
const NICKNAME_KEY = 'xiaonuan_nickname';

/** ===== 风险词库（三级检测） ===== */

/**
 * TODO: 创业者请与心理咨询师确认此词库的完整性
 *
 * 一级（高危）：立即触发危机干预
 * 检测到这些词时，前端立即展示关怀卡片，AI切换危机干预模式
 */
const RISK_LEVEL_1 = [
  '想死', '不想活了', '自杀', '跳楼', '割腕', '烧炭',
  '遗书', '结束生命', '活着没意思', '死了算了', '不想活',
  '活不下去', '上吊', '服毒', '自尽', '安眠药自杀',
  '不想再醒过来', '消失在这个世界',
];

/**
 * 二级（中危）：AI回复中必须包含资源链接
 * 在AI回复末尾自动追加心理援助热线信息
 */
const RISK_LEVEL_2 = [
  '自残', '伤害自己', '不想吃饭', '整夜睡不着',
  '控制不住哭', '想消失', '没人爱我', '累赘',
  '我想放弃', '撑不下去了', '绝望',
];

/**
 * 三级（关注）：AI回复需更谨慎温和
 * 输入框边缘出现柔和脉冲动画提示
 */
const RISK_LEVEL_3 = [
  '焦虑', '抑郁', '压力大', '迷茫', '孤独', '累', '烦',
  '崩溃', '无助', '难过', '难受', '想哭', '睡不着',
  '心累', '好累', '烦躁', '压抑', '空虚', '失落',
];

/** 情绪标签映射（AI回复左上角显示） */
const MOOD_TAGS = ['抱抱你', '慢慢来', '我陪着你', '我在听', '辛苦了', '没关系', '深呼吸', '会好的'];

/** 开场白 */
const WELCOME_MESSAGE = '嗨，我是小暖。这里是一个安全的树洞，说什么都可以，我不会评判你。最近有什么想聊聊的吗？';

// ===== 全局状态 =====

/** 当前是否处于危机干预模式 */
let crisisMode = false;

/** 是否正在等待AI回复 */
let isWaitingReply = false;

/** 当前对话中使用的情绪标签 */
let currentMoodTag = '✨ 等待中';

// ===== DOM 元素引用 =====

const chatArea = document.getElementById('chat-area');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const moodTag = document.getElementById('mood-tag');
const riskPulse = document.getElementById('risk-pulse');
const welcomeMsg = document.getElementById('welcome-msg');
const disclaimerModal = document.getElementById('disclaimer-modal');
const disclaimerAgree = document.getElementById('disclaimer-agree');
const crisisOverlay = document.getElementById('crisis-overlay');
const crisisMinimize = document.getElementById('crisis-minimize');
const emotionCardModal = document.getElementById('emotion-card-modal');
const emotionKeywords = document.getElementById('emotion-keywords');
const emotionConclusion = document.getElementById('emotion-conclusion');

// ===== 初始化 =====

/**
 * 应用初始化入口。
 * 检查免责声明确认状态，若未确认则展示弹窗。
 */
function init() {
  const accepted = localStorage.getItem(DISCLAIMER_KEY);
  if (accepted === 'true') {
    disclaimerModal.classList.add('hidden');
    loadHistory();
    renderChatFromHistory();
  } else {
    disclaimerModal.classList.remove('hidden');
  }

  // 事件绑定
  disclaimerAgree.addEventListener('click', acceptDisclaimer);
  sendBtn.addEventListener('click', handleSend);
  userInput.addEventListener('keydown', onInputKeydown);
  userInput.addEventListener('input', onInputChange);
  crisisMinimize.addEventListener('click', minimizeCrisis);

  // 情绪卡片弹窗事件
  document.getElementById('emotion-close-btn')?.addEventListener('click', () => {
    emotionCardModal.classList.add('hidden');
  });
  document.getElementById('emotion-save-btn')?.addEventListener('click', saveEmotionCard);
}

/**
 * 接受免责声明，关闭弹窗并开始对话。
 */
function acceptDisclaimer() {
  localStorage.setItem(DISCLAIMER_KEY, 'true');
  disclaimerModal.classList.add('hidden');
  // 显示开场白
  addBotBubble(WELCOME_MESSAGE, '我在听');
  saveHistory();
}

// ===== 对话历史管理 =====

/**
 * 从 LocalStorage 加载对话历史。
 * @returns {Array} 对话消息数组
 */
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('加载对话历史失败:', e);
    return [];
  }
}

/**
 * 保存对话历史到 LocalStorage。
 * 自动裁剪到 MAX_HISTORY 条以内。
 */
function saveHistory() {
  const allMessages = document.querySelectorAll('.chat-bubble');
  const history = [];
  allMessages.forEach((bubble) => {
    const role = bubble.dataset.role;
    const content = bubble.querySelector('.bubble-text')?.textContent || '';
    if (role && content) {
      history.push({ role, content });
    }
  });
  // 裁剪历史
  const trimmed = history.slice(-MAX_HISTORY);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('保存对话历史失败:', e);
  }
}

/**
 * 从本地历史渲染对话到页面。
 */
function renderChatFromHistory() {
  const history = loadHistory();
  if (history.length === 0) return;

  welcomeMsg?.classList.add('hidden');

  history.forEach((msg) => {
    if (msg.role === 'user') {
      addUserBubble(msg.content);
    } else if (msg.role === 'assistant') {
      addBotBubble(msg.content, '');
    }
  });
  scrollToBottom();
}

/**
 * 清除当前会话的对话历史和页面渲染。
 */
function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
  chatArea.innerHTML = '';
  // 重新显示欢迎语
  if (welcomeMsg) {
    welcomeMsg.classList.remove('hidden');
  }
}

// ===== 消息渲染 =====

/**
 * 用户消息气泡（右对齐，白色背景）。
 * @param {string} text - 消息文本内容
 */
function addUserBubble(text) {
  if (welcomeMsg) welcomeMsg.classList.add('hidden');

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble user-bubble flex justify-end mb-3';
  bubble.dataset.role = 'user';
  bubble.innerHTML = `
    <div class="bubble-text bg-white border border-gray-200 rounded-2xl rounded-br-md px-4 py-3 max-w-[75%] text-sm text-gray-800 shadow-sm">
      ${escapeHtml(text)}
    </div>
  `;
  chatArea.appendChild(bubble);
  scrollToBottom();
}

/**
 * AI消息气泡（左对齐，淡蓝背景）。
 * @param {string} text - 消息文本内容
 * @param {string} mood - 情绪标签（可选）
 */
function addBotBubble(text, mood) {
  const tag = mood || getRandomMoodTag();
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble bot-bubble flex flex-col mb-3';
  bubble.dataset.role = 'assistant';
  bubble.innerHTML = `
    <span class="text-xs text-gray-400 ml-1 mb-1">🌸 小暖学姐 · ${tag}</span>
    <div class="bubble-text bg-soft-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[75%] w-fit text-sm text-gray-700">
      ${escapeHtml(text)}
    </div>
  `;
  chatArea.appendChild(bubble);
  scrollToBottom();
}

/**
 * 添加"学姐正在输入..."指示器。
 * @returns {HTMLElement} 指示器DOM元素，用于后续移除
 */
function addTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'typing-indicator';
  indicator.className = 'flex items-center gap-2 px-4 py-3 mb-3';
  indicator.innerHTML = `
    <span class="text-xs text-gray-400">学姐正在输入</span>
    <span class="typing-dots flex gap-1">
      <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
      <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:0.2s"></span>
      <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:0.4s"></span>
    </span>
  `;
  chatArea.appendChild(indicator);
  scrollToBottom();
  return indicator;
}

/**
 * 移除"正在输入"指示器。
 */
function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

/**
 * 在聊天区域追加一条系统提示消息（用于危机干预等场景）。
 * @param {string} text - 系统消息文本
 * @param {string} type - 类型：'warning' | 'info'
 */
function addSystemMessage(text, type = 'info') {
  const bgColor = type === 'warning' ? 'bg-warm-50 border-warm-200' : 'bg-gray-50 border-gray-200';
  const msg = document.createElement('div');
  msg.className = `flex justify-center mb-3`;
  msg.innerHTML = `
    <div class="${bgColor} border rounded-xl px-4 py-2 text-xs text-gray-500 text-center max-w-[85%]">
      ${escapeHtml(text)}
    </div>
  `;
  chatArea.appendChild(msg);
  scrollToBottom();
}

/**
 * 添加AI回复气泡（流式更新用）。
 * 创建初始空气泡，返回更新函数。
 * @param {string} mood - 情绪标签
 * @returns {{ bubble: HTMLElement, updateFn: Function }}
 */
function createStreamingBubble(mood) {
  const tag = mood || getRandomMoodTag();
  const container = document.createElement('div');
  container.className = 'chat-bubble bot-bubble flex flex-col mb-3';
  container.dataset.role = 'assistant';
  container.innerHTML = `
    <span class="text-xs text-gray-400 ml-1 mb-1">🌸 小暖学姐 · ${tag}</span>
    <div class="bubble-text bg-soft-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[75%] w-fit text-sm text-gray-700 streaming-cursor">
    </div>
  `;
  chatArea.appendChild(container);
  const textDiv = container.querySelector('.bubble-text');

  return {
    bubble: container,
    updateFn: (newText) => {
      textDiv.textContent = newText;
      scrollToBottom();
    },
    finalize: () => {
      textDiv.classList.remove('streaming-cursor');
    },
  };
}

// ===== 辅助函数 =====

/**
 * HTML 转义，防止 XSS。
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 滚动到聊天区域底部。
 */
function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

/**
 * 随机获取一个情绪标签。
 * @returns {string} 情绪标签文本
 */
function getRandomMoodTag() {
  return MOOD_TAGS[Math.floor(Math.random() * MOOD_TAGS.length)];
}

/**
 * 更新顶部情绪状态标签。
 * @param {string} tag - 情绪标签文本
 */
function updateMoodTag(tag) {
  currentMoodTag = tag;
  moodTag.textContent = tag;
}

// ===== 风险词检测 =====

/**
 * 检测输入文本的风险等级。
 *
 * TODO: 创业者请审查此检测逻辑，确保覆盖足够全面
 *
 * @param {string} text - 用户输入的文本
 * @returns {{ level: number, matched: string }} 风险等级（0-3）和匹配到的关键词
 */
function detectRiskLevel(text) {
  const lower = text.toLowerCase();

  // 先检测一级（高危）
  for (const word of RISK_LEVEL_1) {
    if (lower.includes(word)) {
      return { level: 1, matched: word };
    }
  }

  // 再检测二级（中危）
  for (const word of RISK_LEVEL_2) {
    if (lower.includes(word)) {
      return { level: 2, matched: word };
    }
  }

  // 最后检测三级（关注）
  for (const word of RISK_LEVEL_3) {
    if (lower.includes(word)) {
      return { level: 3, matched: word };
    }
  }

  return { level: 0, matched: '' };
}

/**
 * 触发危机干预模式。
 * 展示全屏关怀卡片，背景变暖黄色。
 */
function triggerCrisisIntervention() {
  crisisMode = true;
  crisisOverlay.classList.remove('hidden');
  document.body.style.background = '#FFF9F0';
  updateMoodTag('🤝 危机干预');
}

/**
 * 最小化危机干预遮罩（用户选择继续聊天）。
 */
function minimizeCrisis() {
  crisisOverlay.classList.add('hidden');
  crisisMode = false;
  document.body.style.background = '';
  updateMoodTag('🫂 我陪着你');
}

// ===== 输入处理 =====

/**
 * 输入框内容变化时的处理。
 * 控制发送按钮状态 + 风险词脉冲动画。
 */
function onInputChange() {
  const text = userInput.value.trim();

  // 控制发送按钮
  if (text.length > 0) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('bg-gray-200', 'text-gray-400');
    sendBtn.classList.add('bg-blue-500', 'text-white', 'hover:bg-blue-600');
  } else {
    sendBtn.disabled = true;
    sendBtn.classList.add('bg-gray-200', 'text-gray-400');
    sendBtn.classList.remove('bg-blue-500', 'text-white', 'hover:bg-blue-600');
  }

  // 风险词脉冲动画
  const risk = detectRiskLevel(text);
  if (risk.level >= 2) {
    riskPulse.classList.remove('hidden');
    riskPulse.classList.add('risk-pulse-active');
  } else {
    riskPulse.classList.add('hidden');
    riskPulse.classList.remove('risk-pulse-active');
  }
}

/**
 * 键盘事件处理。
 * Enter 发送，Shift+Enter 换行。
 * @param {KeyboardEvent} e
 */
function onInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}

/**
 * 发送消息主流程。
 */
async function handleSend() {
  const text = userInput.value.trim();
  if (!text || isWaitingReply) return;

  // 禁用发送，防止重复
  isWaitingReply = true;
  sendBtn.disabled = true;
  userInput.value = '';
  onInputChange(); // 重置发送按钮样式

  // 渲染用户消息
  addUserBubble(text);

  // 风险检测
  const risk = detectRiskLevel(text);

  if (risk.level === 1) {
    // 一级高危：立即触发危机干预
    triggerCrisisIntervention();
    addBotBubble(
      '谢谢你愿意告诉我。你现在一定很难受，但请相信，有人专门来帮助此刻的你。\n\n全国24小时免费心理危机干预热线：400-161-9995。你也可以打北京热线：010-82951332。\n\n如果你愿意，我可以陪你聊一会儿，直到你感觉稍微好一点。但请同时联系上面的人工热线，他们比我更专业。',
      '🤝 危机干预'
    );
    saveHistory();
    isWaitingReply = false;
    return;
  }

  // 构建请求消息列表
  const messages = buildMessagesPayload(text);

  // 显示"正在输入"
  const typingIndicator = addTypingIndicator();

  try {
    await streamChat(messages, risk);
  } catch (err) {
    console.error('对话请求失败:', err);
    addSystemMessage('😔 小暖暂时无法回应，请稍后再试', 'warning');
  } finally {
    removeTypingIndicator();
    isWaitingReply = false;

    // 二级风险：在AI回复后追加资源信息
    if (risk.level === 2 && !crisisMode) {
      addSystemMessage(
        '💙 如果你感到需要帮助，可以随时拨打全国24小时心理援助热线：400-161-9995',
        'info'
      );
    }
  }
}

/**
 * 构建发送给后端的消息列表。
 * 从 LocalStorage 加载历史 + 当前输入。
 *
 * @param {string} currentText - 当前用户输入
 * @returns {Array} 消息列表
 */
function buildMessagesPayload(currentText) {
  const history = loadHistory();
  // 移除历史中可能存在的 system 角色消息（由后端处理）
  const cleaned = history.filter((m) => m.role !== 'system');
  // 追加当前消息
  cleaned.push({ role: 'user', content: currentText });
  return cleaned;
}

/**
 * SSE 流式请求对话。
 *
 * @param {Array} messages - 对话消息列表
 * @param {{ level: number }} risk - 风险检测结果
 */
async function streamChat(messages, risk) {
  const response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: true }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${response.status}`);
  }

  // 情绪标签选择
  let moodTag = '我在听';
  if (risk.level === 3) moodTag = '抱抱你';
  if (risk.level === 2) moodTag = '我陪着你';

  updateMoodTag(moodTag);

  // 创建流式气泡
  const { updateFn, finalize } = createStreamingBubble(moodTag);

  // 读取 SSE 流
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // 保留不完整行

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6).trim();
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            fullText += parsed.content;
            updateFn(fullText);
          }
          if (parsed.error) {
            updateFn('抱歉，我暂时无法回应... ' + parsed.error);
            finalize();
            return;
          }
        } catch (e) {
          // 跳过无法解析的行
        }
      }
    }
  }

  finalize();

  // 保存历史
  saveHistory();

  // 检查AI回复中是否需要追加二级风险资源（后端已触发危机协议）
  // 此处在AI回复后不做额外处理，资源追加在 handleSend 中统一处理
}

// ===== 情绪卡片 =====

/**
 * 生成情绪卡片并展示。
 * 提取当前对话中的情绪关键词，生成温暖结语。
 */
function showEmotionCard() {
  const history = loadHistory();
  if (history.length === 0) {
    addSystemMessage('还没有对话内容呢，先聊聊天再生成情绪卡片吧~', 'info');
    return;
  }

  // 提取用户消息中的情绪关键词
  const userMessages = history.filter((m) => m.role === 'user').map((m) => m.content);
  const allText = userMessages.join(' ');
  const foundKeywords = [];

  // 检测所有三级风险词的出现
  const allRiskWords = [...RISK_LEVEL_3, ...RISK_LEVEL_2];
  allRiskWords.forEach((word) => {
    if (allText.includes(word) && !foundKeywords.includes(word)) {
      foundKeywords.push(word);
    }
  });

  // 如果没有匹配到，使用通用标签
  if (foundKeywords.length === 0) {
    foundKeywords.push('倾诉', '陪伴', '树洞');
  }

  // 限制关键词数量
  const displayKeywords = foundKeywords.slice(0, 5);

  // 渲染关键词标签
  emotionKeywords.innerHTML = displayKeywords
    .map(
      (kw) =>
        `<span class="px-3 py-1.5 bg-white/70 rounded-full text-xs font-medium text-gray-600 shadow-sm">#${kw}</span>`
    )
    .join('');

  // 生成AI结语（从AI最后一条回复提取，或生成默认结语）
  const aiMessages = history.filter((m) => m.role === 'assistant').map((m) => m.content);
  const lastAiMsg = aiMessages[aiMessages.length - 1] || '';
  const conclusion =
    lastAiMsg.length > 80 ? lastAiMsg.slice(0, 80) + '...' : lastAiMsg || '谢谢你愿意和小暖分享。无论今天聊了什么，请记得：你的感受值得被认真对待。';

  emotionConclusion.textContent = conclusion;

  // 显示弹窗
  emotionCardModal.classList.remove('hidden');
}

/**
 * 保存情绪卡片为图片。
 * 使用 html2canvas 截图并触发下载。
 */
async function saveEmotionCard() {
  const card = document.getElementById('emotion-card');
  try {
    const canvas = await html2canvas(card, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = 'HBU.小暖学姐_情绪卡片.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    addSystemMessage('✅ 情绪卡片已保存到你的设备', 'info');
  } catch (err) {
    console.error('保存情绪卡片失败:', err);
    addSystemMessage('保存失败，请尝试截图保存', 'warning');
  }
}

// ===== 电话号码复制 =====

/**
 * 复制电话号码到剪贴板。
 * 挂载到 window 以便 HTML onclick 调用。
 * @param {string} phone - 电话号码
 */
window.copyPhone = async function copyPhone(phone) {
  try {
    await navigator.clipboard.writeText(phone);
    // 简单反馈
  } catch (e) {
    // 降级：选中文本
    const ta = document.createElement('textarea');
    ta.value = phone;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
};

// ===== 语音输入（占位功能） =====

// TODO: 创业者可在后续版本集成 Web Speech API 或第三方语音识别
document.getElementById('voice-btn')?.addEventListener('click', () => {
  addSystemMessage('🎤 语音输入功能即将开放，敬请期待', 'info');
});

// ===== 页面启动 =====
document.addEventListener('DOMContentLoaded', init);
