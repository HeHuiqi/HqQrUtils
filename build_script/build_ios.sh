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

# 4. 复制 mobile-layout.css (iOS 安全区适配) 与 iOS 专属 Native Bridge 适配器
cp "$ROOT_DIR/mobile/mobile-layout.css" "$RES_DIR/css/mobile-layout.css"
cp "$ROOT_DIR/mobile/ios/native-bridge-ios.js" "$RES_DIR/js/native-bridge-ios.js"

# 5. 在 index.html 中自动注入移动端适配 CSS 与 iOS Native Bridge
if [ -f "$RES_DIR/index.html" ]; then
    echo "📱 正在注入移动端适配 CSS 与 iOS Native Bridge 到 iOS index.html..."
    # 使用跨平台通用的 perl 注入，兼容 macOS (BSD) 与 Linux (GNU) 环境。
    # iOS 适配器必须在共享应用启动前安装：native-host.js -> native-bridge-ios.js -> app.js。
    if command -v perl >/dev/null 2>&1; then
        perl -i -pe 's|</head>|    <link rel="stylesheet" href="css/mobile-layout.css">\n</head>|g' "$RES_DIR/index.html"
        perl -i -pe 's|(<script src="js/native-host\.js"></script>)|$1\n    <script src="js/native-bridge-ios.js"></script>|g' "$RES_DIR/index.html"
    else
        sed -i.bak 's|</head>|    <link rel="stylesheet" href="css/mobile-layout.css">\n</head>|g' "$RES_DIR/index.html"
        sed -i.bak 's|<script src="js/native-host.js"></script>|<script src="js/native-host.js"></script>\n    <script src="js/native-bridge-ios.js"></script>|g' "$RES_DIR/index.html"
        rm -f "$RES_DIR/index.html.bak"
    fi

    # 断言：移动样式存在，且 NativeHost、iOS 适配器和应用控制器严格按顺序加载。
    if ! grep -q 'mobile-layout.css' "$RES_DIR/index.html"; then
        echo "❌ 注入失败：index.html 中未找到 mobile-layout.css"
        exit 1
    fi

    host_line="$(grep -n 'src="js/native-host.js"' "$RES_DIR/index.html" | cut -d: -f1 | head -n 1)"
    bridge_line="$(grep -n 'src="js/native-bridge-ios.js"' "$RES_DIR/index.html" | cut -d: -f1 | head -n 1)"
    app_line="$(grep -n 'src="js/app.js"' "$RES_DIR/index.html" | cut -d: -f1 | head -n 1)"
    if [ -z "$host_line" ] || [ -z "$bridge_line" ] || [ -z "$app_line" ]; then
        echo "❌ 注入失败：缺少 native-host.js、native-bridge-ios.js 或 app.js"
        exit 1
    fi
    if [ "$host_line" -ge "$bridge_line" ] || [ "$bridge_line" -ge "$app_line" ]; then
        echo "❌ 注入失败：脚本加载顺序必须为 native-host.js -> native-bridge-ios.js -> app.js"
        exit 1
    fi
else
    echo "❌ 注入失败：$RES_DIR/index.html 不存在（可能 Web 资源构建异常）"
    exit 1
fi

# 6. 若安装了 xcodegen，自动重新生成最新的 Xcode 工程文件
if command -v xcodegen >/dev/null 2>&1; then
    echo "🛠️  正在执行 xcodegen 重新生成 Xcode 工程..."
    (cd "$IOS_DIR" && xcodegen)
fi

# 7. 同步至 build/ios/ 方便查看（排除体积庞大的构建缓存目录）
mkdir -p "$IOS_BUILD_DIR"
cp -r "$IOS_DIR/"* "$IOS_BUILD_DIR/"
rm -rf "$IOS_BUILD_DIR/.build" "$IOS_BUILD_DIR/DerivedData" "$IOS_BUILD_DIR/build"

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
