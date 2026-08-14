# HQ 二维码生成与历史记录管理工具 (Chrome Extension & Web)

一个功能强大、设计现代、全离线运行的二维码生成与本地历史记录管理工具。既可作为单页 Web 应用运行，也完全支持作为 **Chrome 浏览器扩展程序 (Manifest V3)** 使用——点击扩展图标即可在全新标签页中直接开启应用。

![HQ QR Utils Banner](icons/icon128.png)

---

## 🌟 核心功能亮点

1. **二维码生成与多样式自定义**
   - **多格式支持**：内置网址 URL、Wi-Fi 热点连接、纯文本、电子名片 (vCard) 等快捷模板。
   - **外观定制**：支持自由选择前景色 (点阵) 与背景色、纠错等级 (L: 7%, M: 15%, Q: 25%, H: 30%)、点阵尺寸 (3px-16px) 及留白边距 (Quiet Zone)。
   - **实时预览**：输入文本自动防抖预览，即时反馈效果。

2. **本地持久化与双向回显**
   - **自动保存**：每次点击“生成并保存记录”，数据自动存储至本地。
   - **点击历史回显**：点击历史记录列表中的任意卡片，**会自动回填表单的所有配置**并在主预览区重新绘制二维码。
   - **搜索与过滤**：支持通过文本或标题快速检索历史生成记录。

3. **数据防擦除保护机制 (`chrome.storage.local`)**
   - 在 Chrome 插件模式下，数据优先存入插件专属存储 API `chrome.storage.local`，**即使清除浏览器 Cookie 和网页缓存，历史记录也不会被清空**。

4. **多格式导出与数据备份**
   - **图片导出**：支持一键下载 **PNG** 图片与 **SVG** 矢量图。
   - **剪贴板复制**：支持直接将二维码图片（Blob）或文本复制到系统剪贴板。
   - **数据迁移**：支持导出历史记录为 JSON 文件，以及随时导入备份 JSON 数据。

5. **响应式 UI 与双主题**
   - **深浅色主题**：自动识别系统主题，支持手动切换暗黑模式/浅色模式。
   - **全端适配**：响应式三栏网格布局，自适应桌面端与移动端。
   - **轻量化导航**：优化的高度的顶栏设计与便携式的输入框下方按钮流。

---

## 📁 架构设计与模块划分

为了保证代码的高可维护性与单一职责原则，项目采用了高度解耦的模块化结构：

```text
HqQrUtils/
├── manifest.json         # Chrome Extension Manifest V3 配置文件
├── background.js        # Background Service Worker（监听图标点击开新标签页）
├── index.html           # 主 HTML5 语义化页面 (CSP 合规)
├── style.css            # 主 CSS 样式引入入口 (@import)
├── icons/               # 品牌专属图标 (16x16, 48x48, 128x128)
├── lib/
│   └── qrcode.min.js    # 离线 standalone 核心二维码算法引擎
├── css/                 # 模块化样式目录
│   ├── variables.css    # 设计 Token 与主题变量
│   ├── base.css         # 基础重置与响应式网格布局
│   ├── header.css       # 顶栏导航与 Logo 样式
│   ├── panels.css       # 表单控件、按钮与预设芯片
│   ├── preview.css      # 预览视口与二维码容器
│   ├── history.css      # 历史记录列表与卡片样式
│   └── toast.css        # 全局 Toast 消息弹窗动画
└── js/                  # 模块化 JS 脚本目录
    ├── storage.js       # 存储服务 (StorageManager: chrome.storage.local + localStorage)
    ├── qr-engine.js     # 二维码 Canvas / SVG 绘制算法封装 (QREngine)
    ├── ui-toast.js      # Toast 消息提示组件 (ToastManager)
    ├── ui-history.js    # 历史记录 UI 渲染组件 (HistoryUIManager)
    └── app.js           # 主应用控制器 (Main Controller: 事件绑定与模块调度)
```

---

## 💡 核心实现逻辑说明

### 1. 双重存储逻辑 (`js/storage.js`)
为了解决常规网页数据容易随 Cookie 被清理的问题，存储层实现了双重适配：
- **插件环境**：优先调用 Chrome Extension 专属 `chrome.storage.local` API，独立于网页 Cookie 存储，保障数据安全；
- **网页环境**：自动降级回退至 `localStorage`；
- 同时在保存时进行双同步备份，确保跨环境的兼容性。

### 2. 点击历史记录回显逻辑 (`js/app.js` & `js/ui-history.js`)
点击历史卡片时，触发 `selectHistoryRecord(record)` 函数：
1. **填充表单**：将记录中的 `content`、`title`、`fgColor`、`bgColor`、`ecl`、`cellSize`、`margin` 逐一回填至 DOM 输入控件。
2. **激活与高亮**：更新 `activeRecordId` 状态，并高亮历史列表中对应的卡片。
3. **重新渲染**：调用 `QREngine.createCanvas()`，在主视口无缝重绘大图二维码。

### 3. Chrome 插件点击打开标签页 (`background.js` & `manifest.json`)
在 Manifest V3 规范中：
- `manifest.json` 中配置了 `"background": { "service_worker": "background.js" }` 并去除了 `default_popup`；
- 当用户点击 Chrome 工具栏中的扩展图标时，`background.js` 监听到 `chrome.action.onClicked` 事件，调用 `chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })`，直接以主标签页形式全屏打开应用。

---

## 🛠️ 安装与运行指南

### 作为 Chrome 浏览器插件安装使用

1. 克隆或下载本项目到本地文件夹（例如 `/Users/edy/Desktop/1hhq/1AItools/HqQrUtils`）。
2. 打开 Chrome 浏览器，在地址栏输入 `chrome://extensions/` 并回车。
3. 打开右上角的 **“开发者模式” (Developer mode)** 开关。
4. 点击左上角的 **“加载已解压的扩展程序” (Load unpacked)**。
5. 选择本项目的根目录文件夹。
6. 点击浏览器工具栏中的插件图标（📌 建议固定在工具栏），即可直接打开二维码生成器标签页！

### 作为普通网页运行

双击直接打开目录下的 `index.html` 即可在任意标准浏览器中使用。

---

## 📄 开源许可

[MIT License](LICENSE)
