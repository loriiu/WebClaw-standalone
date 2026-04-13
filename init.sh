#!/bin/bash

# WebClaw 独立版 - 初始化脚本

set -e

echo "🔧 初始化 WebClaw 独立版..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

echo "✅ Node.js $(node -v)"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

# 安装 Playwright 浏览器
echo ""
echo "🌐 安装 Playwright 浏览器..."
npx playwright install chromium

# 创建环境变量文件
if [ ! -f .env ]; then
    echo ""
    echo "📝 创建环境变量配置文件..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件，填入您的 COZE_API_TOKEN"
fi

echo ""
echo "✅ 初始化完成！"
echo ""
echo "快速开始："
echo "  npm run repl          # 交互模式"
echo "  npm start -- --help   # 查看帮助"
echo ""
