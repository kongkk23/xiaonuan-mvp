/**
 * 小暖同学 - Cloudflare Worker 单文件版
 * ======================================
 * 一个文件包含：前端界面 + 后端API代理
 * 
 * 部署方式：
 *   1. 打开 https://workers.cloudflare.com → 注册/登录
 *   2. 点 "Create application" → "Create Worker"
 *   3. 粘贴本文件全部内容 → "Save and Deploy"
 *   4. 拿到 xxx.workers.dev 域名 → 手机上打开！
 */

// ===== 配置区 =====
const API_KEY = 'sk-8c0f5fd12d08455088a7b8a47d5f23c1';
const API_BASE = 'https://api.deepseek.com/v1';
const MODEL = 'deepseek-v4-flash';

// ===== System Prompt =====
const SYSTEM_PROMPT = `你是"小暖"，一位受过专业训练的AI情绪陪伴伙伴。你的设定如下：

【角色】
- 性别中性，年龄感像一位温暖的大学生学姐/学长
- 说话风格：口语化、短句为主、不用感叹号堆砌、不鸡汤、不说教
- 永远把"理解"放在"解决"前面

【对话原则】
1. 倾听优先：用户前3条消息内，只共情和澄清，不给建议。
2. CBT轻量使用：只在用户出现明显认知扭曲时，温和提问"这个想法有证据吗？"，不强行纠正。
3. 微行动原则：每次对话结束前，给出一个5分钟内能完成的极小行动。
4. 边界清晰：绝不诊断抑郁症/焦虑症等；绝不建议停药或换药；涉及躯体症状时建议就医。

【危机干预协议】
如果用户表达自杀、自伤、伤人念头：
1. 立即停止常规对话。
2. 第一句话："谢谢你愿意告诉我。你现在一定很难受，但请相信，有人专门来帮助此刻的你。"
3. 提供热线：全国24小时免费心理危机干预热线：400-161-9995。北京热线：010-82951332。
4. 第三句话："如果你愿意，我可以陪你聊一会儿，直到你感觉稍微好一点。但请同时联系上面的人工热线。"
5. 之后只做陪伴性回应。

【禁止事项】
- 禁止输出医学诊断
- 禁止推荐具体药物
- 禁止在危机状态下讨论哲学/宗教/生死意义

【开场白模板】
"嗨，我是小暖。这里是一个安全的树洞，说什么都可以，我不会评判你。最近有什么想聊聊的吗？"`;

// ===== HTML 页面 =====
function getHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
  <title>小暖同学 · AI情绪树洞</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>tailwind.config={theme:{extend:{colors:{warm:{50:'#FFF9F0',100:'#FFF3E0'},soft:{50:'#F0F4F8',100:'#E3F2FD'}}}}}<\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:linear-gradient(135deg,#FFF9F0,#F0F4F8);min-height:100vh}
    #chat-area::-webkit-scrollbar{width:4px}
    #chat-area::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
    .chat-bubble{animation:bubble-in .3s ease-out}
    @keyframes bubble-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .streaming-cursor::after{content:'▎';animation:blink .8s infinite;color:#60a5fa}
    @keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}
    .typing-dots span{animation:dot-bounce 1.4s infinite ease-in-out both}
    .typing-dots span:nth-child(1){animation-delay:-.32s}
    .typing-dots span:nth-child(2){animation-delay:-.16s}
    @keyframes dot-bounce{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
    .risk-pulse{animation:risk-pulse-anim 1.2s ease-in-out infinite;border:2px solid #fbbf24!important}
    @keyframes risk-pulse-anim{0%{box-shadow:0 0 0 0 rgba(251,191,36,.4)}50%{box-shadow:0 0 0 12px rgba(251,191,36,0)}100%{box-shadow:0 0 0 0 rgba(251,191,36,0)}}
    .animate-fade-in{animation:fade-in .4s ease-out}
    @keyframes fade-in{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
    #crisis-overlay{animation:fade-in .5s ease-out}
    .user-bubble .bubble-text,.bot-bubble .bubble-text{word-break:break-word;line-height:1.6}
    #send-btn{transition:all .2s ease}
    #send-btn:not(:disabled):hover{transform:scale(1.05)}
    #send-btn:not(:disabled):active{transform:scale(.95)}
    @media(max-width:640px){.bubble-text{max-width:85%!important}}
    button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
    a[href^="tel:"]{text-decoration:none}
  </style>
</head>
<body>
  <!-- 免责声明 -->
  <div id="disclaimer-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div class="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-md w-full animate-fade-in">
      <div class="text-center mb-4"><span class="text-4xl">🦋</span><h2 class="text-xl font-bold text-gray-800 mt-2">欢迎来到小暖同学</h2></div>
      <div class="text-sm text-gray-600 leading-relaxed space-y-3 mb-6">
        <p>小暖同学是一个 AI 情绪陪伴伙伴，这里是一个安全的树洞。</p>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p class="text-amber-800 font-medium">⚠️ 重要提醒</p>
          <p class="text-amber-700 text-xs mt-1">小暖同学<strong>不是医生</strong>，不能诊断或治疗任何疾病。如果你正在经历严重的心理危机，请立即联系专业医疗机构。</p>
        </div>
      </div>
      <button id="disclaimer-agree" class="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">我知道了，开始聊天</button>
    </div>
  </div>

  <!-- 危机干预 -->
  <div id="crisis-overlay" class="fixed inset-0 z-40 flex items-center justify-center hidden" style="background:rgba(255,243,224,.92)">
    <div class="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-md w-full animate-fade-in">
      <div class="text-center mb-5"><span class="text-5xl">🤝</span><h2 class="text-xl font-bold text-warm-800 mt-3">你现在并不孤单</h2><p class="text-sm text-gray-500 mt-1">有人24小时专门陪伴像你一样的人</p></div>
      <div class="space-y-3 mb-5">
        <div class="bg-warm-50 rounded-xl p-4 flex items-center justify-between">
          <div><p class="text-sm text-gray-500">全国24小时心理援助热线</p><p class="text-lg font-bold text-warm-700 mt-1">400-161-9995</p></div>
          <button onclick="copyPhone('400-161-9995')" class="px-4 py-2 bg-white border border-warm-300 rounded-lg text-sm text-warm-700 hover:bg-warm-100">📋 复制</button>
        </div>
        <div class="bg-warm-50 rounded-xl p-4 flex items-center justify-between">
          <div><p class="text-sm text-gray-500">北京心理危机研究与干预中心</p><p class="text-lg font-bold text-warm-700 mt-1">010-82951332</p></div>
          <button onclick="copyPhone('010-82951332')" class="px-4 py-2 bg-white border border-warm-300 rounded-lg text-sm text-warm-700 hover:bg-warm-100">📋 复制</button>
        </div>
        <a href="tel:4001619995" class="block w-full py-3 bg-warm-500 text-white rounded-xl text-center font-medium hover:bg-warm-600 transition-colors">📞 一键拨打</a>
      </div>
      <p class="text-center text-sm text-gray-400">小暖会在这里等你回来</p>
      <button id="crisis-minimize" class="mt-4 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">我想继续和小暖聊聊</button>
    </div>
  </div>

  <!-- 主界面 -->
  <div id="main-app" class="flex flex-col h-screen max-w-2xl mx-auto bg-white/80 backdrop-blur-sm shadow-2xl">
    <header class="flex items-center justify-between px-4 py-3 bg-soft-100 border-b border-gray-100 shrink-0" style="min-height:56px">
      <div class="flex items-center gap-2">
        <div class="relative"><span class="text-xl">🦋</span><span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"></span></div>
        <span class="font-semibold text-gray-800">小暖同学</span><span class="text-xs text-gray-400 ml-1">· 24h在线</span>
      </div>
      <div id="mood-tag" class="px-3 py-1 bg-white rounded-full text-xs text-gray-400 border border-gray-200">✨ 等待中</div>
    </header>
    <main id="chat-area" class="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
      <div id="welcome-msg" class="flex flex-col items-center justify-center h-full text-center px-4">
        <span class="text-6xl mb-4">🦋</span><h3 class="text-lg font-semibold text-gray-700 mb-2">嗨，我是小暖</h3>
        <p class="text-sm text-gray-400 max-w-xs">这里是一个安全的树洞，说什么都可以，我不会评判你。最近有什么想聊聊的吗？</p>
      </div>
    </main>
    <footer class="shrink-0 bg-white border-t border-gray-100 px-3 py-3">
      <div class="flex items-end gap-2 max-w-screen-sm mx-auto">
        <button id="voice-btn" class="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors" title="语音输入（即将开放）">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
        </button>
        <div id="input-wrapper" class="flex-1 relative">
          <textarea id="user-input" rows="1" placeholder="想说点什么..." class="w-full px-4 py-3 pr-10 bg-gray-50 rounded-3xl text-sm resize-none outline-none border border-transparent focus:border-blue-300 focus:bg-white transition-all" style="max-height:120px"></textarea>
          <div id="risk-pulse" class="absolute inset-0 rounded-3xl pointer-events-none hidden"></div>
        </div>
        <button id="send-btn" disabled class="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 text-gray-400 transition-all duration-200 disabled:cursor-not-allowed">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <p class="text-center text-xs text-gray-300 mt-2">⚠️ 小暖同学不是医生，不能诊断或治疗 | 数据仅保存在你本地浏览器</p>
    </footer>
  </div>

  <script>
    // ===== 小暖同学 - 前端核心逻辑 =====
    const STORAGE_KEY='xiaonuan_chat_history',DISCLAIMER_KEY='xiaonuan_disclaimer_accepted';
    const MAX_HISTORY=30;
    const RISK_L1=['想死','不想活了','自杀','跳楼','割腕','烧炭','遗书','结束生命','活着没意思','死了算了','不想活','活不下去','上吊','服毒','自尽'];
    const RISK_L2=['自残','伤害自己','不想吃饭','整夜睡不着','控制不住哭','想消失','没人爱我','累赘','撑不下去了','绝望'];
    const RISK_L3=['焦虑','抑郁','压力大','迷茫','孤独','累','烦','崩溃','无助','难过','难受','想哭','睡不着','心累','烦躁','压抑','空虚','失落'];
    const TAGS=['抱抱你','慢慢来','我陪着你','我在听','辛苦了','没关系','深呼吸','会好的'];
    const WELCOME='嗨，我是小暖。这里是一个安全的树洞，说什么都可以，我不会评判你。最近有什么想聊聊的吗？';
    
    let crisisMode=false,isWaiting=false,currentMood='✨ 等待中';
    
    const chatArea=document.getElementById('chat-area'),userInput=document.getElementById('user-input'),
          sendBtn=document.getElementById('send-btn'),moodTag=document.getElementById('mood-tag'),
          riskPulse=document.getElementById('risk-pulse'),welcomeMsg=document.getElementById('welcome-msg'),
          disclaimerModal=document.getElementById('disclaimer-modal'),
          disclaimerAgree=document.getElementById('disclaimer-agree'),
          crisisOverlay=document.getElementById('crisis-overlay'),
          crisisMinimize=document.getElementById('crisis-minimize');
    
    function init(){
      if(localStorage.getItem(DISCLAIMER_KEY)==='true'){disclaimerModal.classList.add('hidden');loadAndRender()}
      else disclaimerModal.classList.remove('hidden');
      disclaimerAgree.addEventListener('click',()=>{localStorage.setItem(DISCLAIMER_KEY,'true');disclaimerModal.classList.add('hidden');addBot(WELCOME,'我在听');saveHistory()});
      sendBtn.addEventListener('click',handleSend);
      userInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()}});
      userInput.addEventListener('input',onInputChange);
      crisisMinimize.addEventListener('click',()=>{crisisOverlay.classList.add('hidden');crisisMode=false;moodTag.textContent='🫂 我陪着你'});
    }
    
    function loadAndRender(){const h=loadHistory();if(!h.length)return;welcomeMsg.classList.add('hidden');h.forEach(m=>{m.role==='user'?addUserBubble(m.content):addBotBubble(m.content,'')});scrollBottom()}
    function loadHistory(){try{const r=localStorage.getItem(STORAGE_KEY);return r?JSON.parse(r):[]}catch(e){return[]}}
    function saveHistory(){const all=document.querySelectorAll('.chat-bubble');const h=[];all.forEach(b=>{const r=b.dataset.role,c=b.querySelector('.bubble-text')?.textContent||'';if(r&&c)h.push({role:r,content:c})});const t=h.slice(-MAX_HISTORY);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(t))}catch(e){}}
    function addUserBubble(text){welcomeMsg.classList.add('hidden');const b=document.createElement('div');b.className='chat-bubble user-bubble flex justify-end mb-3';b.dataset.role='user';b.innerHTML='<div class="bubble-text bg-white border border-gray-200 rounded-2xl rounded-br-md px-4 py-3 max-w-[75%] text-sm text-gray-800 shadow-sm">'+escapeHtml(text)+'</div>';chatArea.appendChild(b);scrollBottom()}
    function addBotBubble(text,mood){const t=mood||TAGS[Math.floor(Math.random()*TAGS.length)];const b=document.createElement('div');b.className='chat-bubble bot-bubble flex flex-col mb-3';b.dataset.role='assistant';b.innerHTML='<span class="text-xs text-gray-400 ml-1 mb-1">🦋 小暖 · '+t+'</span><div class="bubble-text bg-soft-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[75%] w-fit text-sm text-gray-700">'+escapeHtml(text)+'</div>';chatArea.appendChild(b);scrollBottom()}
    function addBot(text,mood){addBotBubble(text,mood)}
    function addSystemMsg(text,type){const bg=type==='warning'?'bg-warm-50 border-warm-200':'bg-gray-50 border-gray-200';const m=document.createElement('div');m.className='flex justify-center mb-3';m.innerHTML='<div class="'+bg+' border rounded-xl px-4 py-2 text-xs text-gray-500 text-center max-w-[85%]">'+escapeHtml(text)+'</div>';chatArea.appendChild(m);scrollBottom()}
    function escapeHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
    function scrollBottom(){requestAnimationFrame(()=>{chatArea.scrollTop=chatArea.scrollHeight})}
    
    function detectRisk(text){const l=text.toLowerCase();
      for(const w of RISK_L1){if(l.includes(w))return{level:1,matched:w}}
      for(const w of RISK_L2){if(l.includes(w))return{level:2,matched:w}}
      for(const w of RISK_L3){if(l.includes(w))return{level:3,matched:w}}
      return{level:0,matched:''}}
    
    function triggerCrisis(){crisisMode=true;crisisOverlay.classList.remove('hidden');moodTag.textContent='🤝 危机干预'}
    
    function onInputChange(){const text=userInput.value.trim();
      if(text.length>0){sendBtn.disabled=false;sendBtn.classList.remove('bg-gray-200','text-gray-400');sendBtn.classList.add('bg-blue-500','text-white','hover:bg-blue-600')}
      else{sendBtn.disabled=true;sendBtn.classList.add('bg-gray-200','text-gray-400');sendBtn.classList.remove('bg-blue-500','text-white','hover:bg-blue-600')}
      const risk=detectRisk(text);
      if(risk.level>=2){riskPulse.classList.remove('hidden');riskPulse.classList.add('risk-pulse')}else{riskPulse.classList.add('hidden');riskPulse.classList.remove('risk-pulse')}}
    
    async function handleSend(){const text=userInput.value.trim();if(!text||isWaiting)return;
      isWaiting=true;sendBtn.disabled=true;userInput.value='';onInputChange();addUserBubble(text);
      const risk=detectRisk(text);
      if(risk.level===1){triggerCrisis();addBot('谢谢你愿意告诉我。你现在一定很难受，但请相信，有人专门来帮助此刻的你。\\n\\n全国24小时免费心理危机干预热线：400-161-9995。你也可以打北京热线：010-82951332。\\n\\n如果你愿意，我可以陪你聊一会儿，直到你感觉稍微好一点。但请同时联系上面的人工热线，他们比我更专业。','🤝 危机干预');saveHistory();isWaiting=false;return}
      const msgs=buildPayload(text);
      const typing=addTyping();let moodT='我在听';if(risk.level===3)moodT='抱抱你';if(risk.level===2)moodT='我陪着你';moodTag.textContent=moodT;
      try{const resp=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:msgs,stream:true})});
        if(!resp.ok){throw new Error('HTTP '+resp.status)}
        const{update,finish}=createStreamBubble(moodT);
        const reader=resp.body.getReader();const decoder=new TextDecoder();let full='',buf='';
        while(true){const{done,value}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});const lines=buf.split('\\n');buf=lines.pop()||'';
          for(const line of lines){if(line.startsWith('data: ')){const d=line.substring(6).trim();if(d==='[DONE]')break;
            try{const p=JSON.parse(d);if(p.content){full+=p.content;update(full)}if(p.error){update('抱歉，我暂时无法回应... '+p.error);finish();return}}catch(e){}}}}
        finish();saveHistory();
        if(risk.level===2&&!crisisMode){addSystemMsg('💙 如果你感到需要帮助，可以随时拨打全国24小时心理援助热线：400-161-9995','info')}
      }catch(err){console.error(err);removeTyping();addSystemMsg('😔 小暖暂时无法回应，请稍后再试','warning')}
      finally{removeTyping();isWaiting=false}}
    
    function buildPayload(currentText){const h=loadHistory().filter(m=>m.role!=='system');h.push({role:'user',content:currentText});return h}
    function addTyping(){const i=document.createElement('div');i.id='typing-indicator';i.className='flex items-center gap-2 px-4 py-3 mb-3';i.innerHTML='<span class="text-xs text-gray-400">小暖正在输入</span><span class="typing-dots flex gap-1"><span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span><span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:0.2s"></span><span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:0.4s"></span></span>';chatArea.appendChild(i);scrollBottom();return i}
    function removeTyping(){const i=document.getElementById('typing-indicator');if(i)i.remove()}
    function createStreamBubble(mood){const t=mood||TAGS[Math.floor(Math.random()*TAGS.length)];const c=document.createElement('div');c.className='chat-bubble bot-bubble flex flex-col mb-3';c.dataset.role='assistant';c.innerHTML='<span class="text-xs text-gray-400 ml-1 mb-1">🦋 小暖 · '+t+'</span><div class="bubble-text bg-soft-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[75%] w-fit text-sm text-gray-700 streaming-cursor"></div>';chatArea.appendChild(c);const td=c.querySelector('.bubble-text');return{update:(txt)=>{td.textContent=txt;scrollBottom()},finish:()=>td.classList.remove('streaming-cursor')}}
    window.copyPhone=async function(phone){try{await navigator.clipboard.writeText(phone)}catch(e){const ta=document.createElement('textarea');ta.value=phone;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta)}}
    document.getElementById('voice-btn').addEventListener('click',()=>addSystemMsg('🎤 语音输入功能即将开放，敬请期待','info'));
    document.addEventListener('DOMContentLoaded',init);
  <\/script>
</body>
</html>`;
}

// ===== 主 Worker 逻辑 =====
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 健康检查
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        version: '1.0.0',
        model: MODEL,
        provider: 'cloudflare-workers'
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 对话接口
    if (path === '/chat' && request.method === 'POST') {
      return handleChat(request);
    }

    // 首页
    if (path === '/' || path === '/index.html') {
      return new Response(getHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 404
    return new Response('Not Found', { status: 404 });
  }
};

/**
 * 处理对话请求，SSE 流式代理到 DeepSeek API
 */
async function handleChat(request) {
  try {
    const body = await request.json();
    const messages = body.messages || [];

    if (!messages.length) {
      return new Response(JSON.stringify({ error: '消息列表不能为空' }), { status: 400 });
    }

    // 确保 System Prompt 在最前面
    if (!messages[0] || messages[0].role !== 'system') {
      messages.unshift({ role: 'system', content: SYSTEM_PROMPT });
    }

    // 限制消息数量
    const trimmed = messages.length > 31 ? [messages[0], ...messages.slice(-30)] : messages;

    const payload = {
      model: MODEL,
      messages: trimmed,
      stream: true,
      max_tokens: 8000,
      temperature: 0.7
    };

    // 调用 DeepSeek API
    const apiResp = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!apiResp.ok) {
      const errText = await apiResp.text();
      return new Response(JSON.stringify({ error: 'API 调用失败: ' + errText }), { status: 502 });
    }

    // 流式转发
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // 异步处理流式响应
    ctx.waitUntil((async () => {
      try {
        const reader = apiResp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              await writer.write(encoder.encode(line + '\n\n'));
            }
          }
        }

        // 发送结束标记
        await writer.write(encoder.encode('data: [DONE]\n\n'));
        await writer.close();
      } catch (e) {
        console.error('Stream error:', e);
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: '流式传输中断' })}\n\n`));
        await writer.close();
      }
    })());

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: '服务器内部错误: ' + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
