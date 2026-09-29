#!/bin/bash
# ==============================================================================
# HQ 二维码工具箱 - 生成 Xcode 工程脚本 (XcodeGen Project Generator)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$ROOT_DIR/mobile/ios"
PROJECT_YML="$IOS_DIR/project.yml"
XCODE_PROJ="$IOS_DIR/HqQrUtils.xcodeproj"

echo "========================================================"
echo "🛠️  [XcodeGen] 正在准备生成 iOS Xcode 工程..."
echo "========================================================"

# 1. 检查是否安装了 xcodegen
if ! command -v xcodegen >/dev/null 2>&1; then
    echo "❌ 错误: 未检测到 xcodegen 工具！"
    echo ""
    echo "请先在 macOS 终端中安装 XcodeGen："
    echo "  brew install xcodegen"
    echo ""
    exit 1
fi

# 2. 检查 project.yml 配置文件是否存在
if [ ! -f "$PROJECT_YML" ]; then
    echo "❌ 错误: 未找到配置文件: $PROJECT_YML"
    exit 1
fi

# 3. 触发 Web 静态资源准备与移动端桥接注入
echo "📦 步骤 1/2: 校验并同步 Web 静态资源至 iOS Bundle..."
"$SCRIPT_DIR/build_ios.sh" > /dev/null 2>&1 || {
    echo "⚠️  [Notice] 正在通过 build_ios.sh 同步 Web 资源..."
    bash "$SCRIPT_DIR/build_ios.sh"
}

# 4. 执行 xcodegen 生成 Xcode 项目
echo "⚙️  步骤 2/2: 执行 XcodeGen 生成 Xcode 项目工程文件..."
(
    cd "$IOS_DIR"
    xcodegen generate --spec "$PROJECT_YML"
)

echo ""
echo "========================================================"
echo "✅ [XcodeGen] Xcode 工程生成成功！"
echo "  - 工程文件路径: $XCODE_PROJ"
echo "  - 配置文件路径: $PROJECT_YML"
echo "========================================================"
echo ""
echo "📱 快速使用指引："
echo "  1. 打开 Xcode 开发："
echo "     open $XCODE_PROJ"
echo ""
echo "  2. 命令行编译测试 (Simulator)："
echo "     xcodebuild -project $XCODE_PROJ -scheme HqQrUtils -destination 'generic/platform=iOS Simulator' build"
echo ""
