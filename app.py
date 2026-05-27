"""
小暖同学 - AI情绪树洞 Web 应用后端
===============================
Flask 单文件后端：API代理 + 健康检查 + SSE流式输出
部署方式：python app.py 或 gunicorn app:app
"""

import os
import json
import logging
from dotenv import load_dotenv
from flask import Flask, request, Response, jsonify, send_from_directory
from flask_cors import CORS
import requests

# 加载环境变量
load_dotenv()

# 日志配置
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Flask 应用初始化
app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)  # 允许前端跨域访问

# ===== 配置区 =====
API_KEY = os.getenv("OPENAI_API_KEY", "")
API_BASE_URL = os.getenv(
    "OPENAI_BASE_URL", "https://api.moonshot.cn/v1"
).rstrip("/")
MODEL_NAME = os.getenv("MODEL_NAME", "moonshot-v1-8k")
MAX_CONTEXT_TOKENS = int(os.getenv("MAX_CONTEXT_TOKENS", "8000"))
PORT = int(os.getenv("PORT", "5000"))

# 加载 System Prompt（优先从环境变量，否则从文件读取）
SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT", "")
if not SYSTEM_PROMPT:
    prompt_path = os.path.join(os.path.dirname(__file__), "system_prompt.txt")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            SYSTEM_PROMPT = f.read().strip()
    else:
        logger.warning("system_prompt.txt 未找到，使用默认 Prompt")
        SYSTEM_PROMPT = "你是一个温暖的情绪陪伴AI助手。"


def check_api_key():
    """检查 API Key 是否已配置"""
    if not API_KEY or API_KEY == "your-api-key-here":
        raise ValueError(
            "API Key 未配置！请复制 .env.example 为 .env 并填入你的 API Key。"
        )


def build_payload(messages: list, stream: bool = True) -> dict:
    """
    构建请求大模型 API 的 payload。

    Args:
        messages: 对话消息列表，格式为 [{"role": "...", "content": "..."}]
        stream: 是否使用流式输出

    Returns:
        API 请求体字典
    """
    # 确保 System Prompt 在最前面
    if not messages or messages[0].get("role") != "system":
        messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})

    return {
        "model": MODEL_NAME,
        "messages": messages,
        "stream": stream,
        "max_tokens": MAX_CONTEXT_TOKENS,
        "temperature": 0.7,  # 适当温度保持回复的温暖感
    }


def stream_response(payload: dict):
    """
    SSE 流式输出生成器。

    逐块返回大模型 API 的流式内容，转换为 SSE 格式发送给前端。

    Args:
        payload: 请求体字典

    Yields:
        SSE 格式字符串
    """
    check_api_key()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            stream=True,
            timeout=120,
        )
        response.raise_for_status()

        for line in response.iter_lines(decode_unicode=True):
            if not line:
                continue
            if line.startswith("data: "):
                data_str = line[6:]  # 去掉 "data: " 前缀
                if data_str.strip() == "[DONE]":
                    yield "data: [DONE]\n\n"
                    break
                try:
                    data = json.loads(data_str)
                    choices = data.get("choices", [])
                    if choices:
                        delta = choices[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            # SSE 格式输出
                            yield f"data: {json.dumps({'content': content}, ensure_ascii=False)}\n\n"
                except json.JSONDecodeError:
                    continue
    except requests.exceptions.Timeout:
        logger.error("API 请求超时")
        yield f"data: {json.dumps({'error': '响应超时，请稍后重试'}, ensure_ascii=False)}\n\n"
    except requests.exceptions.RequestException as e:
        logger.error(f"API 请求失败: {e}")
        yield f"data: {json.dumps({'error': '服务暂时不可用，请稍后重试'}, ensure_ascii=False)}\n\n"


# ===== 路由 =====


@app.route("/")
def index():
    """首页：返回 index.html"""
    return send_from_directory("static", "index.html")


@app.route("/health")
def health():
    """
    健康检查接口。

    Returns:
        JSON 格式的状态信息
    """
    key_configured = bool(API_KEY and API_KEY != "your-api-key-here")
    return jsonify(
        {
            "status": "ok",
            "version": "1.0.0",
            "model": MODEL_NAME,
            "api_configured": key_configured,
        }
    )


@app.route("/chat", methods=["POST"])
def chat():
    """
    对话接口（SSE 流式）。

    接收前端发送的对话历史，调用大模型 API 并流式返回回复内容。

    Request Body:
        {
            "messages": [...],   # 对话历史
            "stream": true       # 是否流式（默认 true）
        }

    Returns:
        SSE 流式事件流
    """
    try:
        body = request.get_json(force=True)
        messages = body.get("messages", [])
        stream = body.get("stream", True)

        if not messages:
            return jsonify({"error": "消息列表不能为空"}), 400

        # 限制消息数量（最多保留 30 条 = 15 轮对话 + system prompt）
        if len(messages) > 31:
            # 保留 system prompt + 最近 30 条
            messages = [messages[0]] + messages[-30:]

        payload = build_payload(messages, stream=stream)

        if stream:
            return Response(
                stream_response(payload),
                mimetype="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
                },
            )
        else:
            # 非流式模式（备用）
            check_api_key()
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
            }
            resp = requests.post(
                f"{API_BASE_URL}/chat/completions",
                headers=headers,
                json=build_payload(messages, stream=False),
                timeout=120,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return jsonify({"content": content})

    except ValueError as e:
        logger.error(f"配置错误: {e}")
        return jsonify({"error": str(e)}), 500
    except requests.exceptions.HTTPError as e:
        logger.error(f"API HTTP 错误: {e}")
        return jsonify({"error": f"API 调用失败: {e}"}), 502
    except Exception as e:
        logger.error(f"未知错误: {e}")
        return jsonify({"error": "服务器内部错误，请稍后重试"}), 500


# ===== 启动 =====

if __name__ == "__main__":
    if not API_KEY or API_KEY == "your-api-key-here":
        print("\n" + "=" * 50)
        print("⚠️  警告：API Key 未配置！")
        print("请复制 .env.example 为 .env 并填入你的 API Key")
        print("=" * 50 + "\n")

    logger.info(f"小暖同学启动于 http://localhost:{PORT}")
    logger.info(f"使用模型: {MODEL_NAME}")
    app.run(host="0.0.0.0", port=PORT, debug=True)
