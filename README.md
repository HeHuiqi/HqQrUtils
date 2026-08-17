# HQ 二维码生成与历史记录管理工具 (Web & Chrome Extension & Android Native App)

一个功能强大、设计现代、全离线运行的二维码生成与历史记录管理工具。采用 Monorepo 多端架构设计，完美支持作为 **Web 网页端**、**Chrome 浏览器扩展程序 (Manifest V3)** 以及 **Android 原生 App (Kotlin + CameraX + ML Kit)** 跨平台运行。

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

### 3. 📱 Android 移动原生端极速体验 (`mobile/android/`)
- **原生 CameraX & Google ML Kit 扫码引擎**：参考原生 `ScanActivity.kt` 架构，使用 Kotlin + **CameraX** (硬件级视口渲染) + **ML Kit BarcodeScanning** (离线毫秒级识别)。
- **相册与手电筒支持**：原生扫码界面右上角支持直接调起 Android 原生相册选择器，支持暗光下开关原生手电筒补光。
- **原生历史记录管理 (`ScanHistoryActivity.kt`)**：扫码界面右上角内置历史记录按钮，可直接切入原生 RecyclerView 历史列表进行搜索、复制或删除。
- **双向 100% 实时历史记录同步 (Bi-directional Sync)**：
  - **Native ➔ Web**：原生扫码/相册识别成功后，自动写入原生数据库 (`ScanDatabase`) 并实时同步落盘至 Web `localStorage` 并刷新界面。
  - **Web ➔ Native**：Web 主界面中新生成的二维码自动通过 `syncWebRecordToNative` 接口写入原生 SQLite 数据库，两端历史记录数据 100% 实时互通。
- **精简移动端 H5 界面**：安卓 App 内部自动感知 Native 容器，智能隐藏 H5 中重复的“点击/拖拽上传”模块。

### 4. 🧩 Chrome 右键快捷生成 (Context Menu Actions)
- **全场景右键支持**：在 Chrome 浏览器中，右键选中文本、网页链接或网页空白处，点击右键菜单直接生成二维码，自动在主标签页中载入。

### 5. 💾 数据持久化与保护机制
- **数据防擦除**：Chrome 插件模式下优先存储于 `chrome.storage.local`，即便清理 Cookie 也不丢失数据；Web 环境与 Android App 端自动降级至 `localStorage` 与 SQLite 存储。
- **数据备份迁移**：支持一键导出/导入 JSON 格式的历史记录数据。

### 6. 🎨 统一视觉与全端图标一致性
- **桌面图标 100% 契合**：安卓 App 图标 (`ic_launcher` & `ic_launcher_round`) 全规格分辨率（`mdpi` 至 `xxxhdpi`）均由 Chrome 扩展图标 `icon128.png` 提取生成，实现多端桌面 Icon 视觉统一。

---

## 📁 多端分层架构设计 (Monorepo Architecture)

```text
HqQrUtils/
├── common/                  # 🌐 跨平台核心公共代码 (CSS/JS 库与解码引擎)
│   ├── css/                 # 全局设计 Token 与组件样式
│   └── js/                  # QREngine, StorageAdapter, ToastManager
├── web/                     # 💻 Web 独立运行包源码
├── chrome_ext/              # 🧩 Chrome 扩展程序源码 (Manifest V3)
│   ├── background.js        # Background Service Worker
│   └── icons/               # 品牌扩展图标 (16x16, 48x48, 128x128)
├── mobile/                  # 📱 移动端原生工程与 Bridge 适配器
│   ├── mobile-layout.css    # 移动端安全区与 Touch 样式
│   ├── js/native-bridge.js  # Android Native 桥接适配器
│   └── android/             # Android Kotlin 原生 Gradle 工程
│       ├── app/src/main/java/com/hq/qrutils/
│       │   ├── MainActivity.java        # WebView 主入口容器
│       │   ├── ScanActivity.kt          # CameraX & ML Kit 原生扫码组件
│       │   ├── ScanResultActivity.kt    # 扫码结果展示与保存
│       │   ├── ScanHistoryActivity.kt   # 原生历史记录 RecyclerView
│       │   ├── ScanRecord.kt            # Room 数据库 Entity
│       │   ├── ScanRecordDao.kt         # Room DAO 接口
│       │   └── ScanDatabase.kt          # Room Database 数据库
│       └── .gitignore                   # 安卓工程构建过滤规则
├── build_script/            # 🛠️ 自动化构建脚本
│   ├── build_web.sh         # 编译构建 Web 网页产物 -> build/web/
│   ├── build_chrome_ext.sh  # 编译构建 Chrome 扩展 -> build/chrome_ext/ & .zip
│   └── build_android.sh     # 组装 Android Native Assets -> mobile/android/
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
```

---

## 📄 开源许可

[MIT License](LICENSE)
