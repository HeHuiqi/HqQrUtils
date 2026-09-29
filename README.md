# HQ 二维码生成与历史记录管理工具 (Web & Chrome Extension & Android & iOS)

一个功能强大、设计现代、无需后端服务的二维码生成与历史记录管理工具（核心功能完全离线可用，仅 Web/扩展端可选加载在线字体）。采用 Monorepo 多端架构设计，完美支持作为 **Web 网页端**、**Chrome 浏览器扩展程序 (Manifest V3)**、**Android 原生 App (Kotlin + CameraX + ML Kit)** 以及 **iOS 原生 App (Swift + AVFoundation + SQLite + XcodeGen)** 跨平台运行。

![HQ QR Utils Banner](chrome_ext/icons/icon128.png)

---

## 🌟 核心功能亮点

### 1. 🎨 二维码生成与多样式自定义
- **多格式支持**：内置网址 URL、Wi-Fi 热点连接、纯文本、电子名片 (vCard) 等快捷模板。
- **外观定制**：支持自由选择前景色 (点阵) 与背景色、纠错等级 (L: 7%, M: 15%, Q: 25%, H: 30%)、点阵尺寸 (3px-16px) 及留白边距 (Quiet Zone)。
- **中心 Logo 嵌入**：支持上传自定义 Logo 图片置于二维码中央，自动开启最高容错率 (H-30%) 隔离绘制，保证 100% 完美扫描。
- **实时预览**：输入文本自动防抖预览，即时反馈效果。

### 2. 🔍 二维码识别与解码 (QR Code Decoder)
- **多引擎优化**：内置 `QREngine` 多尺度降采样算法 (最高 800px 大图自动降采样)，支持 12MP+ 手机相册高分辨率截图与照片的秒级精准解码。
- **Web 端识别**：支持拖拽图片文件、点击上传或使用键盘快捷键 `Ctrl+V` / `Cmd+V` 粘贴截图识别。
- **一键联动**：识别结果支持一键复制文本、直接在新标签页打开链接、或一键导入生成器重新设计。

### 3. 📱 iOS 移动原生端极速体验 (`mobile/ios/`)
- **原生 AVFoundation 扫码引擎 (`QRScannerViewController.swift`)**：硬件级极速扫码，支持手电筒补光与系统相册二维码识别。
- **原生历史记录管理 (`HistoryViewController.swift`)**：原生 TableView 列表展示，支持点击复制文本、左滑星标收藏、右滑单条删除与一键清空。
- **多线程安全 SQLite 引擎 (`ScanDatabase.m`)**：底层基于 `NSRecursiveLock` 与 `SQLITE_OPEN_FULLMUTEX` 互斥保护，杜绝多线程并发冲突与闪退。
- **高颜值毛玻璃 Toast (`ToastHUD.swift`)**：系统级毛玻璃背景，集成 SF Symbols 与弹簧入场动画。
- **双向 100% 实时数据同步**：原生扫码、收藏、删除、清空与 Web 端通过 `NativeHost` 事件及 `NotificationCenter` 双向秒级同步。
- **保存图片至系统相册**：支持 Web 生成的二维码直接保存至 iOS 系统相册，自动处理相册写入权限与原生反馈。
- **XcodeGen 工程化**：基于 `project.yml` 与脚本一键生成 Xcode 项目，零配置即开即用。

### 4. 🤖 Android 移动原生端极速体验 (`mobile/android/`)
- **原生 CameraX & Google ML Kit 扫码引擎**：使用 Kotlin + **CameraX** (硬件级视口渲染) + **ML Kit BarcodeScanning** (离线毫秒级识别)。
- **相册与手电筒支持**：扫码界面右上角支持调起原生相册选择器与手电筒补光。
- **原生历史记录管理 (`ScanHistoryActivity.kt`)**：内置 RecyclerView 历史列表，支持点击复制文本、长按单条删除与一键清空全部。
- **双向 100% 实时历史记录同步 (Bi-directional Sync)**：Web 与 Android 原生 SQLite 数据库全双工实时同步。
- **精简移动端 H5 界面**：原生容器内自动隐藏冗余的网页端拖拽上传模块。

### 5. 🧩 Chrome 右键快捷生成 (Context Menu Actions)
- **全场景右键支持**：在 Chrome 浏览器中，右键选中文本、网页链接或网页空白处，点击右键菜单直接生成二维码，自动在主标签页中载入。

### 6. 💾 数据持久化与保护机制
- **数据防擦除**：Chrome 插件模式下优先存储于 `chrome.storage.local`，即便清理 Cookie 也不丢失数据；Web 环境与移动原生端自动降级至 `localStorage` 与 SQLite 存储。
- **数据备份迁移**：支持一键导出/导入 JSON 格式的历史记录数据。

### 7. 🔒 安全设计 (Security Design)
- **CSP 内容安全策略**：各端统一注入严格 CSP（`default-src 'self'` + `script-src 'self'`），杜绝内联脚本注入。
- **原生权限最小化**：仅声明相机与相册写入等必要权限，严格遵循平台权限最佳实践。
- **WebView 注入防转义**：原生与 Web 交互传参统一安全序列化，杜绝特殊字符破坏 JS 语句执行。
- **链接协议校验**：严格拦截 `javascript:`/`data:`/`file:` 等危险伪协议，安全放行标准网络链接与业务 Custom Scheme。
- **统一 UUID 主键**：各端历史记录统一采用 RFC4122 v4 UUID，数据精确关联无歧义。

---

## 📁 多端分层架构设计 (Monorepo Architecture)

```text
HqQrUtils/
├── common/                  # 🌐 跨平台核心公共代码 (CSS/JS 库与解码引擎)
│   ├── css/                 # 全局设计 Token 与组件样式 (variables/base/header/panels/preview/history/toast)
│   └── js/                  # QREngine、StorageManager、ToastManager、HistoryUIManager、NativeHost 与 app 主控
├── web/                     # 💻 Web 独立运行包源码
├── chrome_ext/              # 🧩 Chrome 扩展程序源码 (Manifest V3)
│   ├── background.js        # Background Service Worker
│   └── icons/               # 品牌扩展图标 (16x16, 48x48, 128x128)
├── mobile/                  # 📱 移动端工程与 Bridge 适配层
│   ├── mobile-layout.css    # 移动端安全区与 Touch 响应样式
│   ├── js/native-bridge.js  # Android NativeHost 桥接适配器
│   ├── ios/                 # 🍏 iOS 原生工程 (Swift & Objective-C)
│   │   ├── project.yml      # XcodeGen 规范配置文件
│   │   ├── native-bridge-ios.js # iOS NativeHost 桥接适配器
│   │   ├── Sources/HqQrUtils/
│   │   │   ├── App.swift                   # SwiftUI App 入口 (@main)
│   │   │   ├── WebViewContainer.swift      # WKWebView 容器与 NativeHost 交互
│   │   │   ├── QRScannerViewController.swift # AVFoundation 原生扫码组件
│   │   │   ├── ScanOverlayViewIOS.swift    # 扫码取景框与激光动画
│   │   │   ├── HistoryViewController.swift # 原生历史记录 TableView
│   │   │   ├── HistoryCell.swift           # 自适应历史记录卡片 Cell
│   │   │   ├── ToastHUD.swift              # 毛玻璃 Toast 组件
│   │   │   ├── ScanRecord.swift            # 数据模型与广播通知
│   │   │   ├── ScanDatabase+Swift.swift    # Swift 友好扩展层
│   │   │   └── ScanDatabase.h / .m         # 线程安全 SQLite 数据库引擎
│   │   ├── Resources/public/  # 原生资源与 Web 静态产物 (由 build_ios.sh 生成)
│   │   └── Assets.xcassets  # App 图标与色彩资源
│   └── android/             # 🤖 Android 原生工程 (Kotlin)
│       └── app/src/main/java/com/hq/qrutils/
│           ├── MainActivity.java        # WebView 主入口与 JS 桥接
│           ├── ScanActivity.kt          # CameraX & ML Kit 原生扫码
│           ├── ScanOverlayView.kt       # 扫码取景框与激光动画
│           ├── ScanResultActivity.kt    # 原生识别结果展示与保存
│           ├── ScanHistoryActivity.kt   # 原生历史记录 RecyclerView
│           ├── ScanHistoryAdapter.kt    # 历史记录列表适配器
│           ├── ScanDatabase.kt          # Room 数据库实例 (单例)
│           ├── ScanRecordDao.kt         # Room DAO (增删改查)
│           └── ScanRecord.kt            # Room 实体与 Web/原生统一模型
├── test/                    # 🧪 Node 单元测试 (node:assert + node:vm)
│   └── native-host.test.js  # NativeHost 跨端桥接契约测试
├── package.json             # 仅用于 `npm test` 运行测试，无运行时依赖
├── build_script/            # 🛠️ 自动化构建脚本
│   ├── build_web.sh         # 编译构建 Web 网页产物 -> build/web/
│   ├── build_chrome_ext.sh  # 编译构建 Chrome 扩展 -> build/chrome_ext/ & .zip
│   ├── build_android.sh     # 组装 Android 静态资源 -> mobile/android/app/src/main/assets/public/
│   ├── build_ios.sh         # 组装 iOS 静态资源 -> mobile/ios/Resources/public/
│   └── generate_xcode_project.sh # 生成并刷新 iOS Xcode 项目 (HqQrUtils.xcodeproj)
├── build.md                 # 📖 详细构建与部署指南文档
├── CHANGE.md                # 📜 版本变更历史记录
└── README.md                # 📖 项目综合说明文档
```

---

## 🛠️ 一键自动化构建命令 (Build Scripts)

详细的部署与打包指南请参阅 **[`build.md`](file:///Users/edy/Desktop/1hhq/1AItools/HqQrUtils/build.md)**：

```bash
# 1. 打包 Web 网页产物 (生成至 build/web/)
./build_script/build_web.sh

# 2. 打包 Chrome 扩展产物 (生成 build/chrome_ext/ 与 build/chrome_ext.zip)
./build_script/build_chrome_ext.sh

# 3. 组装 Android 资源并编译生成 Android Debug APK (生成至 build/android/)
./build_script/build_android.sh
cd mobile/android && ./gradlew assembleDebug

# 4. 组装 iOS 资源并生成 Xcode 工程 (mobile/ios/HqQrUtils.xcodeproj)
./build_script/generate_xcode_project.sh
```

> ⚠️ **注意**：`web/index.html` 与 `chrome_ext/index.html` 源码引用的是构建后的扁平路径（`js/app.js`、`css/...`），
> 而源码实际位于 `common/` 目录。因此**不能直接双击打开 HTML 调试**，必须先执行 `./build_script/build_web.sh`，
> 再从 `build/web/index.html` 打开。

---

## 🧪 本地开发与自动化测试

```bash
# 运行全部 Node 单元测试（零依赖，基于内置 node:assert + node:vm）
npm test
```

测试覆盖跨端桥接契约与纯逻辑函数（`NativeHost` 适配器契约、事件缓冲、历史数据导入白名单校验、
危险协议拦截、纠错等级映射、存储降级等），无需浏览器或模拟器环境。

---

## 📜 版本历史

完整的版本迭代与变更记录请参阅 **[`CHANGE.md`](CHANGE.md)**：

- **[v1.3.1]** (2026-09-29)：工程与文档一致性修正（修复 Android 编译失败、版本号统一、iOS 弃用 API 与告警清零、构建注入断言、冷迁移标记持久化、自动化测试入口）
- **[v1.3.0]** (2026-09-29)：新增 iOS 原生工程支持、SQLite 线程安全加固、双向实时数据同步、毛玻璃 Toast 与一键 XcodeGen 自动化构建
- **[v1.2.0]** (2026-08-24)：安全加固（CSP / 权限最小化 / 注入转义 / 协议校验）与稳定性修复
- **[v1.1.0]** (2026-08-14)：Android 原生扫码与双向同步、Chrome 右键快捷生成、构建脚本与多端架构
- **[v1.0.0]** (2026-08-14)：初始发布

---

## 📄 开源许可

[MIT License](LICENSE)
