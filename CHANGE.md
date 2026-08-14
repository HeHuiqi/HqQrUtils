# CHANGELOG / 更新日志

本项目的所有重要更新与新增功能均记录在此文档中。

---

## 🚀 [v1.1.0] - 2026-08-14 (最新功能更新)

### ✨ 新增功能 (New Features)

1. **🛠️ 自动化构建脚本 (`build_script/`)**
   - **`build_web.sh`**: 自动化清理、组装 `common/` 与 `web/` 入口文件，修正路径依赖并输出独立运行包到 `build/web/`。
   - **`build_chrome_ext.sh`**: 自动化构建 Manifest V3 Chrome 扩展，输出解压版扩展工程到 `build/chrome_ext/` 并打包压缩为可直接发行的 `build/chrome_ext.zip`。

2. **📂 多端分层代码架构重构 (`common/`, `web/`, `chrome_ext/`, `mobile/`)**
   - **`common/`**: 抽象抽取通用核心引擎 (`QREngine`)、抽象存储适配器 (`StorageAdapter`)、Toast 通用组件与历史渲染模型。
   - **`web/`**: 独立 Web 部署版工程。
   - **`chrome_ext/`**: Chrome 扩展独立工程（包含 Manifest V3、Service Worker、图标与插件初始化控制器）。
   - **`mobile/`**: 移动端 App Capacitor 打包工程（包含移动端 Tab 导航、安全区域适配与原生 Bridge 适配器）。

2. **Chrome 右键菜单快捷生成 (Context Menu Integration)**
   - 在 Chrome 扩展中增加了右键上下文菜单支持：
     - **右键选中文本** ➔ `为选中文本 "%s" 生成二维码`
     - **右键网页链接** ➔ `为此链接生成二维码`
     - **右键网页空白处** ➔ `为当前页面网址生成二维码`
   - 点击右键菜单后，直接唤起主标签页载入文本并完成保存，无需手动复制粘贴。

2. **二维码图片与摄像头实时解码 (QR Code Decoder & Camera Scanner)**
   - **图片识别**：支持切换至“识别二维码”模式，拖拽图片文件、点击上传或使用键盘快捷键 `Ctrl+V` / `Cmd+V` 粘贴截图识别。
   - **📷 摄像头实时扫描**：支持开启手机/笔记本摄像头进行实时扫码，带有精致的绿光激光扫描对焦框与自动侦测闭环。
   - **高效解析**：内置 Chrome 原生 `BarcodeDetector` 与离线解析双引擎，秒级解析出文本或网页链接。
   - **一键联动**：识别结果支持一键复制文本、直接在新标签页打开链接、或一键导入生成器重新设计。

3. **⭐ 历史记录星标收藏与置顶 (Favorites & Top Pinning)**
   - 每条历史记录卡片增加 `★` / `☆` 星标按钮。
   - 点击可一键为高频使用的二维码（如办公 Wi-Fi、个人主页）打上星标。
   - 标注星标的记录会自动获得**左侧金黄高亮边线**并**自动优先置顶**排列在最上方。

4. **🏷️ 历史记录分类标签管理与筛选 (Category Tag Filtering)**
   - 生成/编辑二维码时支持指定所属分类标签（如：`💼 工作`、`👤 个人`、`📶 网络`、`🧪 测试`）。
   - 历史记录栏新增分类标签筛选栏（Category Chips），点击 `⭐ 收藏`、`💼 工作`、`👤 个人` 等标签可一键即时过滤显示。

5. **💄 界面布局与滚动条稳定性优化 (Layout & Spacing Tweak)**
   - 优化三栏比例与历史卡片 Flex 截断，增加 `scrollbar-gutter: stable` 消除分类切换时的宽度抖动。
   - 为左侧“所属分类标签”控件增加上下合适间距，界面更加精致舒展。

6. **中心 Logo 图标嵌入 (Center Logo Overlay)**
   - 高级设置中新增 **“中心 Logo 图标”** 上传控件。
   - 支持上传自定义 PNG/JPG/SVG 图片置于二维码正中央。
   - 上传 Logo 时会自动将纠错等级设为最高级 **H (30%)**，并在 Canvas 中央绘制带轮廓边框的隔离遮罩，保障带 Logo 的二维码 100% 完美扫描。

4. **扩展数据防擦除保护机制 (`chrome.storage.local`)**
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
