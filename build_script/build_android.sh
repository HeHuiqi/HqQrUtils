#!/bin/bash
# ==============================================================================
# HQ 二维码工具箱 - Android 平台自动化构建脚本 (Android Target Build Script)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_BUILD_DIR="$ROOT_DIR/build/web"
ANDROID_DIR="$ROOT_DIR/mobile/android"
ASSETS_DIR="$ANDROID_DIR/app/src/main/assets/public"
ANDROID_BUILD_DIR="$ROOT_DIR/build/android"

echo "🚀 [Build Android] 开始组装 Android 平台原生 App 工程..."

# 1. 确保最新的 Web 静态资源已完成构建
echo "📦 步骤 1/3: 触发 Web 核心资源构建..."
"$SCRIPT_DIR/build_web.sh"

# 2. 清理并准备 Android 原生 Assets 资源目录
echo "⚙️ 步骤 2/3: 组装 Android Native Assets 目录..."
rm -rf "$ASSETS_DIR"
rm -rf "$ANDROID_BUILD_DIR"
mkdir -p "$ASSETS_DIR"
mkdir -p "$ANDROID_BUILD_DIR"

# 3. 复制 Web 构建产物至 Android 资源目录
cp -r "$WEB_BUILD_DIR/"* "$ASSETS_DIR/"

# 4. 注入 Android 平台专属样式与 Native Bridge 适配器
cp "$ROOT_DIR/mobile/mobile-layout.css" "$ASSETS_DIR/css/mobile-layout.css"
cp "$ROOT_DIR/mobile/js/native-bridge.js" "$ASSETS_DIR/js/native-bridge.js"

# 5. 在 index.html 中自动注入移动端适配 CSS 与 Android Native Bridge
if [ -f "$ASSETS_DIR/index.html" ]; then
    echo "📱 正在注入移动端适配 CSS 与 Native Bridge 到 Android index.html..."
    sed -i.bak 's|</head>|    <link rel="stylesheet" href="css/mobile-layout.css">\n</head>|g' "$ASSETS_DIR/index.html"
    sed -i.bak 's|</body>|    <script src="js/native-bridge.js"></script>\n</body>|g' "$ASSETS_DIR/index.html"
    rm -f "$ASSETS_DIR/index.html.bak"
fi

# 6. 同步至根 build/android 方便构建查看
cp -r "$ANDROID_DIR/"* "$ANDROID_BUILD_DIR/"

echo "✅ [Build Android] Android 工程构建完成！"
echo "  - Android Native Assets 资源目录: $ASSETS_DIR"
echo "  - Android Gradle 工程目录: $ANDROID_DIR"
echo "  - 打包产物目录: $ANDROID_BUILD_DIR"
echo ""
echo "💡 后续打包 APK 步骤说明："
echo "  方法  (使用 Gradle 命令行):"
echo "    cd mobile/android && ./gradlew assembleDebug"
