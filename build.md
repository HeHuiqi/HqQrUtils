# 🛠️ HQ 二维码工具箱 - 多端构建与打包指南 (Build Guide)

本文档介绍本项目多端架构的构建命令、脚本工作原理以及产物部署指南。

---

## 📁 1. 多端架构目录结构 (Multi-Target Structure)

项目采用 **Monorepo 多端分层架构**，核心逻辑与平台独立工程完全解耦：

```text
HqQrUtils/
├── common/                  # 核心通用层（CSS、算法库、NativeHost 与应用控制器）
├── web/                     # Web App 网页部署端源码
├── chrome_ext/              # Chrome 浏览器扩展端源码 (Manifest V3)
├── mobile/                  # 移动端原生工程
│   ├── ios/                 # iOS 原生工程（Swift + SQLite + XcodeGen）
│   └── android/             # Android 原生工程（Kotlin + CameraX + Room）
├── test/                    # 🧪 Node 单元测试 (node:assert + node:vm)
├── build_script/            # 🛠️ 自动化多端构建打包脚本目录
│   ├── build_web.sh         # 打包构建 Web 网页产物 -> build/web/
│   ├── build_chrome_ext.sh  # 打包构建 Chrome 扩展产物 -> build/chrome_ext/ & .zip
│   ├── build_android.sh     # 组装 Android 静态资源 -> mobile/android/app/src/main/assets/public/
│   ├── build_ios.sh         # 组装 iOS 静态资源 -> mobile/ios/Resources/public/
│   └── generate_xcode_project.sh # 生成 iOS Xcode 项目 -> mobile/ios/HqQrUtils.xcodeproj
├── build/                   # 📦 打包构建产物目录 (已被 .gitignore 自动忽略)
│   ├── web/                 # 独立运行的 Web 网页版产物
│   ├── android/             # Android 工程组装快照
│   ├── ios/                 # iOS 工程组装快照
│   ├── chrome_ext/          # 独立运行的 Chrome 解压版扩展工程包
│   └── chrome_ext.zip       # 可直接发行的 Chrome 扩展 Zip 压缩包
├── build.md                 # 构建指南文档 (本文档)
├── README.md                # 项目主说明文档
└── CHANGE.md                # 更新日志文档
```

---

## 🚀 2. 自动化构建命令 (Build Commands)

在项目根目录下，确保打包脚本具备执行权限：

```bash
chmod +x build_script/*.sh
```

### (1) 打包网页端 (Web Target)
```bash
./build_script/build_web.sh
```
- **输出位置**：`build/web/`
- **执行逻辑**：
  1. 清理并重新创建 `build/web/` 产物目录。
  2. 自动抽取复制 `common/` 中的 CSS、JS、第三方算法库与主样式入口。
  3. 复制 `web/index.html` 入口文件，完成独立部署包组装。

### (2) 打包 Chrome 扩展端 (Chrome Extension Target)
```bash
./build_script/build_chrome_ext.sh
```
- **输出位置**：
  - 解压版扩展目录：`build/chrome_ext/`
  - 发行 Zip 压缩包：`build/chrome_ext.zip`
- **执行逻辑**：
  1. 清理并重新创建 `build/chrome_ext/` 产物目录。
  2. 组装 `common/` 共享模块与 `chrome_ext/` 专属文件（`manifest.json` V3、`background.js`、`icons/`）。
  3. 自动生成平级解耦扩展结构，并通过 `zip` 命令行打包生成发行 `.zip` 文件。

### (3) 打包 Android 原生 App 端 (Android Target)
```bash
./build_script/build_android.sh
```
- **输出位置**：`mobile/android/app/src/main/assets/public/`
- **编译 APK**：
  ```bash
  cd mobile/android
  ./gradlew assembleDebug
  ```
- **输出 APK**：`mobile/android/app/build/outputs/apk/debug/app-debug.apk`

### (4) 构建与生成 iOS 原生工程 (iOS Target)
> **前置依赖**：需要 macOS 环境并安装 [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)。

```bash
./build_script/generate_xcode_project.sh
```
- **输出位置**：`mobile/ios/HqQrUtils.xcodeproj`
- **执行逻辑**：
  1. 自动执行 `build_ios.sh` 将 Web 核心静态资源同步至 `mobile/ios/Resources/public/`，并注入 `mobile-layout.css` 与 `native-bridge-ios.js`。
  2. 解析 `mobile/ios/project.yml`，自动生成完整的 `HqQrUtils.xcodeproj` 工程文件。
- **运行调试**：
  ```bash
  open mobile/ios/HqQrUtils.xcodeproj
  ```

---

## 🎯 3. 打包产物测试与部署指南 (Deployment Guide)

### A. 在 Chrome 浏览器中测试/安装扩展
1. 打开 Chrome 浏览器，访问扩展管理页面：`chrome://extensions/`。
2. 开启右上角的 **“开发者模式” (Developer mode)**。
3. 点击左上角的 **“加载已解压的扩展程序” (Load unpacked)** 按钮。
4. 选择打包生成的 **`build/chrome_ext`** 文件夹即可一键加载安装使用。
5. （如需提交至 Chrome Web Store 商店，直接上传生成好的 `build/chrome_ext.zip` 压缩包）。

### B. 部署 Web 网页版
- 将 **`build/web/`** 目录下的所有文件上传至任意静态 HTTP 服务器（如 Nginx、Apache、Vercel、Netlify、GitHub Pages）。

### C. 运行与分发 iOS App
- 在 Xcode 中打开 `mobile/ios/HqQrUtils.xcodeproj`。
- 选择目标真机或模拟器（如 `iPhone 16 Pro`），按 `Cmd+R` 直接运行。
- 发布时通过 Xcode `Product -> Archive` 进行 App Store 或 Ad-Hoc 打包。

---

## 🔒 4. Git 忽略说明

- 打包生成的 **`build/`** 产物目录已在 **`.gitignore`** 中配置忽略。
- Xcode 个人状态文件（**`**/xcuserdata/`** 与 **`*.xcuserstate`**）已加入 `.gitignore` 规则，避免污染 Git 仓库；Xcode 项目核心结构文件（`HqQrUtils.xcodeproj`）保持版本追踪。
- 由构建脚本自动组装的 **Web 静态资源副本**不入库，在执行构建脚本时重新生成：
  - `mobile/android/app/src/main/assets/public/`（由 `build_android.sh` 生成）
- `.DS_Store` 等系统元数据文件亦已忽略。

---

## 🧪 5. 自动化测试 (Automated Tests)

```bash
# 在项目根目录运行全部 Node 单元测试 (零运行时依赖，需要 Node 18+)
npm test
```

- 测试文件位于 `test/`，基于 Node 内置 `node:assert/strict` 与 `node:vm` 沙箱加载前端脚本，
  无需浏览器、模拟器或网络环境。
- 覆盖范围：`NativeHost` 跨端适配器契约与事件缓冲、历史记录协议安全校验、纠错等级映射、存储降级与迁移标记等。

