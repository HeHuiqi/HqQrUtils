#!/bin/bash
# ==============================================================================
# HQ 二维码工具箱 - Web 平台构建脚本 (Web Target Build Script)
# ==============================================================================

set -e

# 获取脚本所在的根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build/web"

echo "🚀 [Build Web] 开始打包网页端 (Web Target)..."

# 1. 清理与准备产物目录
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/common"

# 2. 复制公共核心资源 (common)
echo "📦 正在复制 common/ 核心引擎与公共组件..."
cp -r "$ROOT_DIR/common/"* "$BUILD_DIR/common/"

# 3. 复制 Web 入口文件
echo "📄 正在处理 web/ 入口网页..."
cp "$ROOT_DIR/web/index.html" "$BUILD_DIR/index.html"

# 4. 修正相对路径依赖 (../common/ -> common/)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' 's/\.\.\/common\//common\//g' "$BUILD_DIR/index.html"
else
    sed -i 's/\.\.\/common\//common\//g' "$BUILD_DIR/index.html"
fi

echo "✅ [Build Web] 打包完成！独立运行包目录: $BUILD_DIR"
