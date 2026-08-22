# 🛠️ HQ 二维码工具箱 - 多端构建与打包指南 (Build Guide)

本文档介绍本项目多端架构的构建命令、脚本工作原理以及产物部署指南。

---

## 📁 1. 多端架构目录结构 (Multi-Target Structure)

项目采用 **Monorepo 多端分层架构**，核心逻辑与平台独立工程完全解耦：

```text
HqQrUtils/
├── common/                  # 核心通用层 (跨平台 100% 复用，包含 css, js, lib)
├── web/                     # Web App 网页部署端源码
├── chrome_ext/              # Chrome 浏览器扩展端源码 (Manifest V3)
├── mobile/                  # 移动端 Android 原生 App 工程 (WebView + Kotlin 原生扫码)
├── build_script/            # 🛠️ 自动化多端构建打包脚本目录
│   ├── build_web.sh        # 打包构建 Web 网页产物
│   └── build_chrome_ext.sh # 打包构建 Chrome 扩展产物
├── build/                   # 📦 打包构建产物目录 (已被 .gitignore 自动忽略)
│   ├── web/                # 独立运行的 Web 网页版产物
│   ├── chrome_ext/         # 独立运行的 Chrome 解压版扩展工程包
│   └── chrome_ext.zip      # 可直接发行的 Chrome 扩展 Zip 压缩包
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
- **输出位置**：
  - Android Gradle 工程目录：`mobile/android/`
  - 打包产物目录：`build/android/`
- **执行逻辑**：
  1. 编译最新的 Web 核心静态资源。
  2. 组装 Android `app/src/main/assets/public/` 原生资源工程。
  3. 注入 `mobile-layout.css` 移动端布局与 `native-bridge.js` Android 触觉/剪贴板/返回键原生桥接模块。

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

---

## 🔒 4. Git 忽略说明

打包生成的 **`build/`** 目录已在 **`.gitignore`** 中配置忽略。构建产物只保留在本地磁盘或构建服务器上，不会误提交污染 Git 源码仓库。
