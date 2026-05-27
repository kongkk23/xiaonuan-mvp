@echo off
chcp 65001 >nul
title 小暖同学 - AI情绪树洞

echo.
echo   🦋 小暖同学 启动中...
echo   ─────────────────────
echo.

cd /d "%~dp0"

:: 检查依赖
echo   [1/3] 检查依赖...
pip install -r requirements.txt -q 2>nul
if %errorlevel% neq 0 (
    echo   ❌ 依赖安装失败，请检查 Python 环境
    pause
    exit /b 1
)
echo   ✅ 依赖就绪

:: 检查 .env
if not exist ".env" (
    echo   ❌ 未找到 .env 文件！
    echo   请将 .env.example 复制为 .env 并填入你的 API Key
    pause
    exit /b 1
)
echo   ✅ 配置就绪

:: 启动
echo   [2/3] 启动服务...
start "" http://localhost:5000
echo   [3/3] 浏览器已打开
echo.
echo   🦋 小暖同学正在运行！
echo   📱 地址: http://localhost:5000
echo   ⏹ 关闭此窗口即可停止服务
echo   ─────────────────────
echo.

python app.py
pause
