# CHANGELOG / 更新日志

本项目的所有重要更新与新增功能均记录在此文档中。

---

## 🚀 [v1.1.0] - 2026-08-14 (最新功能更新)

### ✨ 新增功能 (New Features)

1. **📱 Android App 容器与原生扫码桥接 (`mobile/android/`)**
   - **App Launcher 图标视觉统一**：提取 Chrome 插件专属图标 `icon128.png`，适配并生成了 Android 多分辨率（`mdpi` 48x48, `hdpi` 72x72, `xhdpi` 96x96, `xxhdpi` 144x144, `xxxhdpi` 192x192）标准桌面 App Icon 与圆角 Icon（`ic_launcher` & `ic_launcher_round`），实现 Chrome 扩展与 Android 应用桌面图标视觉 100% 一致。
   - **WebView 主工程保留 (`MainActivity.java`)**：保持 App 原有 Web 主工程逻辑不变，启动时通过 WebView 加载完整功能（二维码生成、历史记录、分类标签、外观配置）。
   - **`@JavascriptInterface` 原生桥接 (`AndroidNative`)**：当在 Web UI 中唤起扫码时，自动通过 JS 桥接调起原生的 `ScanActivity`。
   - **CameraX & ML Kit 扫码集成 (`ScanActivity.kt`)**：参考 `HqUtils ScanActivity.kt` 重构原生扫码。**右上角恢复历史记录按钮**，与相册识别按钮并列呈现。
   - **原生历史记录列表 (`ScanHistoryActivity.kt`)**：点击原生扫码页右上角历史记录，可直接进入原生历史列表查看、搜索、复制或删除记录。
   - **双向历史记录实时同步机制**：
     - **Native ➔ Web**：原生扫码/相册识别成功后，自动写入原生数据库 (`ScanDatabase`) 并在返回 Web 页面时通过 `window.onNativeScanSuccess` 实时更新 Web 历史记录 UI。
     - **Web ➔ Native**：Web 页面中新生成的二维码自动通过 `syncWebRecordToNative` 同步写入原生数据库，实现 Web 界面与原生 `ScanHistoryActivity` 历史数据 100% 双向互通。
   - **移动端 H5 冗余模块精简**：由于原生 `ScanActivity` 已包含相册识别功能，在 Android App 容器中通过 `.is-android-app .drop-zone { display: none; }` 自动隐藏 H5 中重复的“点击/拖拽上传”模块。
   - **工程过滤规则优化 (.gitignore)**：更新根目录与安卓子目录 `.gitignore`，规范忽略了 `.gradle/` 编译缓存、`.idea/` IDE 配置、`local.properties` 本地 SDK 路径、`app/build/` 编译产物以及自动生成的 `assets/public/` Web 缓存。
   - **URL Scheme 唤起跳转配置 (`ScanActivity.kt`)**：将 `voghion://approuter/home` 的 URL Scheme `<intent-filter>` 唤起入口从 `MainActivity` 迁移配置到原生扫码组件 [`ScanActivity`](file:///Users/edy/Desktop/1hhq/1AItools/HqQrUtils/mobile/android/app/src/main/AndroidManifest.xml#L51-L68)，设置 `android:exported="true"`。外部触发 `voghion://approuter/...` 协议链接时将直接唤起原生极速扫码界面。
   - ** WebView 解决 `net::ERR_UNKNOWN_URL_SCHEME` 崩溃/异常**：重写了 [`MainActivity.java`](file:///Users/edy/Desktop/1hhq/1AItools/HqQrUtils/mobile/android/app/src/main/java/com/hq/qrutils/MainActivity.java) 的 `WebViewClient.shouldOverrideUrlLoading`。自动拦截 `intent://` 语法并解析 Intent 参数，已安装目标 App 则调起应用，未安装则自动捕获 `S.browser_fallback_url` 跳转降级网页；同时支持任意 Custom Scheme（`voghion://`、`alipays://` 等），完美解决 WebView 无法加载非 HTTP 协议的报错问题。
   - **`build_android.sh`**: 新增 Android 平台一键打包构建脚本，自动组装原生 `assets/public/` 工程目录。

2. **🛠️ 自动化构建脚本与文档 (`build_script/` & `build.md`)**
   - **`build_web.sh`**: 自动化清理、组装 `common/` 与 `web/` 入口文件，输出独立运行包到 `build/web/`。
   - **`build_chrome_ext.sh`**: 自动化构建 Manifest V3 Chrome 扩展，输出解压版扩展工程到 `build/chrome_ext/` 并打包压缩为可直接发行的 `build/chrome_ext.zip`。
   - **[`build.md`](file:///Users/edy/Desktop/1hhq/1AItools/HqQrUtils/build.md)**: 增加多端打包构建流程与 Chrome 扩展/Web 服务器部署说明文档。

3. **📂 多端分层代码架构重构 (`common/`, `web/`, `chrome_ext/`, `mobile/`)**
   - **`common/`**: 抽取通用核心引擎 (`QREngine`)、统一存储服务 (`StorageManager`)、Toast 通用组件与历史渲染模型。
   - **`web/`**: 独立 Web 部署版工程。
   - **`chrome_ext/`**: Chrome 扩展独立工程（包含 Manifest V3、Service Worker、图标与插件初始化控制器）。
   - **`mobile/`**: 移动端 App Capacitor 打包工程（包含移动端 Tab 导航、安全区域适配与原生 Bridge 适配器）。
   - **根目录纯净归类**：彻底清理了根目录下的旧冗余文件与文件夹（如旧 `css/`, `js/`, `lib/`, `icons/` 等），结构更加规范纯粹。

4. **🎨 像素级 UI 细节对齐与标点修复**
   - 对齐 `二维码生成器` 品牌 Header 栏与右侧 `已保存 X 条记录` Badge 胶囊。
   - 恢复 `.preview-viewport` 浅灰蓝背景容器与 2×2 网格布局导出按钮组。
   - 规范了空历史记录提示文字中的全角中文双引号：`点击“生成并保存记录”即可自动记录至本地`。

5. **Chrome 右键菜单快捷生成 (Context Menu Integration)**
   - 在 Chrome 扩展中增加了右键上下文菜单支持：
     - **右键选中文本** ➔ `为选中文本 "%s" 生成二维码`
     - **右键网页链接** ➔ `为此链接生成二维码`
     - **右键网页空白处** ➔ `为当前页面网址生成二维码`
   - 点击右键菜单后，直接唤起主标签页载入文本并完成保存，无需手动复制粘贴。

6. **二维码图片与摄像头实时解码 (QR Code Decoder & Camera Scanner)**
   - **图片识别**：支持切换至“识别二维码”模式，拖拽图片文件、点击上传或使用键盘快捷键 `Ctrl+V` / `Cmd+V` 粘贴截图识别。
   - **📷 摄像头实时扫描**：支持开启手机/笔记本摄像头进行实时扫码，带有精致的绿光激光扫描对焦框与自动侦测闭环。
   - **高效解析**：内置 Chrome 原生 `BarcodeDetector` 与离线解析双引擎，秒级解析出文本或网页链接。
   - **一键联动**：识别结果支持一键复制文本、直接在新标签页打开链接、或一键导入生成器重新设计。

7. **⭐ 历史记录星标收藏与置顶 (Favorites & Top Pinning)**
   - 每条历史记录卡片增加 `★` / `☆` 星标按钮。
   - 点击可一键为高频使用的二维码（如办公 Wi-Fi、个人主页）打上星标。
   - 标注星标的记录会自动获得**左侧金黄高亮边线**并**自动优先置顶**排列在最上方。

8. **🏷️ 历史记录分类标签管理与筛选 (Category Tag Filtering)**
   - 生成/编辑二维码时支持指定所属分类标签（如：`💼 工作`、`👤 个人`、`📶 网络`、`🧪 测试`）。
   - 历史记录栏新增分类标签筛选栏（Category Chips），点击 `⭐ 收藏`、`💼 工作`、`👤 个人` 等标签可一键即时过滤显示。

9. **💄 界面布局与滚动条稳定性优化 (Layout & Spacing Tweak)**
   - 优化三栏比例与历史卡片 Flex 截断，增加 `scrollbar-gutter: stable` 消除分类切换时的宽度抖动。
   - 为左侧“所属分类标签”控件增加上下合适间距，界面更加精致舒展。

10. **中心 Logo 图标嵌入 (Center Logo Overlay)**
   - 高级设置中新增 **“中心 Logo 图标”** 上传控件。
   - 支持上传自定义 PNG/JPG/SVG 图片置于二维码正中央。
   - 上传 Logo 时会自动将纠错等级设为最高级 **H (30%)**，并在 Canvas 中央绘制带轮廓边框的隔离遮罩，保障带 Logo 的二维码 100% 完美扫描。

11. **扩展数据防擦除保护机制 (`chrome.storage.local`)**
   - 存储服务升级为优先使用 `chrome.storage.local` API。
   - 在 Chrome 扩展模式下，即便用户执行了浏览器的“清理 Cookies 和网站缓存”，历史生成记录也**不会被误删**。

---

### 🎨 架构优化与重构 (Refactoring & Architecture)

1. **CSS 模块化解耦拆分 (`css/`)**
   - 将原单文件样式重构拆分为 7 个单一职责的 CSS 模块：
     - `css/variables.css`: 设计 Token、主题变量与暗黑模式。
     - `css/base.css`: 基础重置与响应式网格布局。
     - `css/header.css`: 顶部导航栏与品牌标识。
     - `css/panels.css`: 表单卡片、模式 Tab、输入控件与按钮。
     - `css/preview.css`: 预览视口与二维码容器。
     - `css/history.css`: 历史记录列表与卡片样式。
     - `css/toast.css`: 消息提示框动画。

2. **JavaScript 模块化解耦拆分 (`js/`)**
   - 将原单文件脚本重构拆分为 5 个结构清晰的 JS 模块：
     - `js/storage.js`: 存储服务 (`StorageManager`)。
     - `js/qr-engine.js`: 二维码生成与解码引擎 (`QREngine`)。
     - `js/ui-toast.js`: 全局 Toast 提示组件 (`ToastManager`)。
     - `js/ui-history.js`: 历史记录 UI 组件 (`HistoryUIManager`)。
     - `js/app.js`: 主控制器 (Main Controller)。

3. **UI 视觉与交互体验提质**
   - 简化顶部导航栏高度与文字描述。
   - 将“生成并保存记录”与“重置”按钮直接放置在主文本输入框正下方。
   - 重新设计并绘制了高精度的品牌蓝四宫格专属插件图标 (`icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`)。

---

## 📦 [v1.0.0] - 2026-08-14 (初始发布)

### ✨ 基础功能
- **二维码生成**：支持文本、URL、Wi-Fi 热点与 vCard 电子名片快捷模板。
- **外观调整**：支持前景色、背景色、纠错等级 (L/M/Q/H)、点阵尺寸与边距调整。
- **本地历史记录**：自动保存生成记录至 `localStorage`，点击历史记录卡片即可双向回显配置与大图二维码。
- **导出与复制**：支持 PNG / SVG 格式下载，直接复制图片/文本至剪贴板，JSON 数据导入导出备份。
- **Chrome 扩展兼容**：配置 Manifest V3，点击图标直接打开主标签页使用。
