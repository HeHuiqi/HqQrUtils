#!/bin/bash
# ==============================================================================
# HQ 二维码工具箱 - Chrome 扩展构建脚本 (Chrome Extension Build Script)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build/chrome_ext"
ZIP_FILE="$ROOT_DIR/build/chrome_ext.zip"

echo "🚀 [Build Chrome Extension] 开始打包 Chrome 扩展..."

# 1. 清理与准备产物目录
rm -rf "$BUILD_DIR"
rm -f "$ZIP_FILE"
mkdir -p "$BUILD_DIR/common"
mkdir -p "$BUILD_DIR/js"
mkdir -p "$BUILD_DIR/icons"

# 2. 复制公共核心资源 (common)
echo "📦 正在复制 common/ 核心引擎与公共组件..."
cp -r "$ROOT_DIR/common/"* "$BUILD_DIR/common/"

# 3. 复制扩展专属文件
echo "⚙️ 正在复制 chrome_ext/ 专属配置文件与脚本..."
cp "$ROOT_DIR/chrome_ext/manifest.json" "$BUILD_DIR/manifest.json"
cp "$ROOT_DIR/chrome_ext/background.js" "$BUILD_DIR/background.js"
cp -r "$ROOT_DIR/chrome_ext/icons/"* "$BUILD_DIR/icons/"
cp "$ROOT_DIR/chrome_ext/index.html" "$BUILD_DIR/index.html"
cp -r "$ROOT_DIR/chrome_ext/js/"* "$BUILD_DIR/js/"

# 4. 打包成可直接上架/发行的 Zip 压缩包
if command -v zip >/dev/null 2>&1; then
    echo "🗜️ 正在生成发行 Zip 压缩包: $ZIP_FILE ..."
    (cd "$BUILD_DIR" && zip -rq "$ZIP_FILE" .)
fi

echo "✅ [Build Chrome Extension] 打包完成！"
echo "  - 解压版插件目录 (可在 chrome://extensions/ 中加载已解压扩展): $BUILD_DIR"
if [ -f "$ZIP_FILE" ]; then
    echo "  - Zip 发行压缩包: $ZIP_FILE"
fi
