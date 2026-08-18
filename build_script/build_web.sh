#!/bin/bash
# ==============================================================================
# HQ 二维码工具箱 - Web 平台构建脚本 (Web Target Build Script)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build/web"

echo "🚀 [Build Web] 开始打包网页端 (Web Target)..."

# 1. 清理与准备产物目录
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/css"
mkdir -p "$BUILD_DIR/js"
mkdir -p "$BUILD_DIR/lib"

# 2. 复制公共核心资源 (common)
echo "📦 正在复制 common/ 核心 CSS、JS 与第三方库..."
cp -r "$ROOT_DIR/common/css/"* "$BUILD_DIR/css/"
cp -r "$ROOT_DIR/common/js/"* "$BUILD_DIR/js/"
cp -r "$ROOT_DIR/common/lib/"* "$BUILD_DIR/lib/"
cp "$ROOT_DIR/common/style.css" "$BUILD_DIR/style.css"

# 3. 复制 Web 入口文件
echo "📄 正在处理 web/ 入口网页与业务逻辑..."
cp "$ROOT_DIR/web/index.html" "$BUILD_DIR/index.html"

echo "✅ [Build Web] 打包完成！独立运行包目录: $BUILD_DIR"
