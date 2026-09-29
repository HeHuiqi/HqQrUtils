#!/bin/bash
# ==============================================================================
# HQ 二维码工具箱 - iOS 平台自动化构建脚本 (iOS Target Build Script)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_BUILD_DIR="$ROOT_DIR/build/web"
IOS_DIR="$ROOT_DIR/mobile/ios"
RES_DIR="$IOS_DIR/Resources/public"
IOS_BUILD_DIR="$ROOT_DIR/build/ios"

echo "🚀 [Build iOS] 开始组装 iOS 平台工程..."

# 1. 确保最新的 Web 静态资源已完成构建
echo "📦 步骤 1/3: 触发 Web 核心资源构建..."
"$SCRIPT_DIR/build_web.sh"

# 2. 清理并准备 iOS 资源目录
echo "⚙️  步骤 2/3: 组装 iOS Bundle 资源目录..."
rm -rf "$RES_DIR"
rm -rf "$IOS_BUILD_DIR"
mkdir -p "$RES_DIR/css"
mkdir -p "$RES_DIR/js"
mkdir -p "$RES_DIR/lib"

# 3. 复制 Web 构建产物至 iOS 资源目录
cp -r "$WEB_BUILD_DIR/css/"* "$RES_DIR/css/"
cp -r "$WEB_BUILD_DIR/js/"* "$RES_DIR/js/"
cp -r "$WEB_BUILD_DIR/lib/"* "$RES_DIR/lib/"
cp "$WEB_BUILD_DIR/index.html" "$RES_DIR/index.html"
cp "$WEB_BUILD_DIR/style.css" "$RES_DIR/style.css"

# 4. 注入 iOS 专属 Native Bridge 适配器
cp "$ROOT_DIR/mobile/ios/native-bridge-ios.js" "$RES_DIR/js/native-bridge-ios.js"

# 5. 在 index.html 中自动注入 iOS Native Bridge 与移动端布局样式
if [ -f "$RES_DIR/index.html" ]; then
    echo "📱 正在注入 iOS Native Bridge 到 iOS index.html..."
    if command -v perl >/dev/null 2>&1; then
        perl -i -pe 's|</head>|    <link rel="stylesheet" href="css/mobile-layout.css">\n</head>|g' "$RES_DIR/index.html"
        perl -i -pe 's|</body>|    <script src="js/native-bridge-ios.js"></script>\n</body>|g' "$RES_DIR/index.html"
    else
        sed -i.bak 's|</head>|    <link rel="stylesheet" href="css/mobile-layout.css">\n</head>|g' "$RES_DIR/index.html"
        sed -i.bak 's|</body>|    <script src="js/native-bridge-ios.js"></script>\n</body>|g' "$RES_DIR/index.html"
        rm -f "$RES_DIR/index.html.bak"
    fi
fi

# 6. 复制 mobile-layout.css (iOS 安全区适配)
cp "$ROOT_DIR/mobile/mobile-layout.css" "$RES_DIR/css/mobile-layout.css"

# 7. 若安装了 xcodegen，自动重新生成最新的 Xcode 工程文件
if command -v xcodegen >/dev/null 2>&1; then
    echo "🛠️  正在执行 xcodegen 重新生成 Xcode 工程..."
    (cd "$IOS_DIR" && xcodegen)
fi

# 8. 同步至 build/ios/ 方便查看
mkdir -p "$IOS_BUILD_DIR"
cp -r "$IOS_DIR/"* "$IOS_BUILD_DIR/"

echo "✅ [Build iOS] iOS 工程资源构建完成！"
echo "  - iOS Bundle 资源目录: $RES_DIR"
echo "  - iOS 工程目录: $IOS_DIR"
echo "  - 打包产物目录: $IOS_BUILD_DIR"
echo ""
echo "💡 后续打包步骤："
echo "  方法 A (Xcode GUI):"
echo "    open mobile/ios/HqQrUtils.xcodeproj"
echo "    Product → Archive → Distribute App"
echo ""
echo "  方法 B (xcodebuild 命令行):"
echo "    cd mobile/ios && xcodebuild -project HqQrUtils.xcodeproj -scheme HqQrUtils -destination 'platform=iOS Simulator,name=iPhone 15' build"
echo ""
echo "  提示：可使用 xcodegen 生成 Xcode 工程："
echo "    brew install xcodegen && cd mobile/ios && xcodegen"
