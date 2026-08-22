# 📱 HQ 二维码工具箱 - 移动端 (Android App) 构建说明

本文档介绍如何在 `mobile/` 目录下进行 Android 原生 App 移植与功能扩展。

---

## 📱 1. Android 原生功能与特性支持 (Android Features)

1. **触觉反馈 (Haptic Feedback)**：
   - 每次点击生成二维码、切换模式或成功识别二维码时，通过 `AndroidBridge.vibrate()` 触发 Android 原生触觉震动反馈。
2. **原生 Toast 提示与剪贴板 (Native Toast & Clipboard)**：
   - 适配 Android 原生 `Toast` 消息提示浮层。
   - 快捷复制操作优先调用原生 `ClipboardManager` API。
3. **物理返回键监听 (Hardware Back Button)**：
   - 自动监听 Android 手机底部的物理/手势返回键。
   - 优先关闭相机会话视口，若位于首页双击返回键提示 `再按一次退出 HQ 二维码工具箱`。
4. **状态栏与安全区适配 (Status Bar & Safe Area)**：
   - 沉浸式状态栏适配 (`#2563EB` 品牌蓝)。
   - CSS 自动处理 Android 异形屏（刘海屏/挖孔屏）`safe-area-inset-*` 边距。
5. **相机扫描与图片权限声明 (Camera Permissions)**：
   - 在 `AndroidManifest.xml` 中配置 Android 原生 `CAMERA`、`VIBRATE` 与 `READ_EXTERNAL_STORAGE` 权限。

---

## 🚀 2. Android 打包构建命令 (Build Command)

在项目根目录下运行一键打包脚本：

```bash
./build_script/build_android.sh
```

- **脚本行为**：
  1. 编译最新的 Web 核心静态资源。
  2. 自动组装 Android `assets/public/` 工程目录。
  3. 注入 `mobile-layout.css` 移动端布局与 `native-bridge.js` Android 原生能力桥接器。
  4. 同步至 `build/android/` 目录。

---

## 🛠️ 3. 生成 APK 安装包 (Generate APK)

运行构建脚本后，可直接使用 Android Gradle 编译 APK：

### 使用 Android Gradle 编译 Debug/Release APK
```bash
cd mobile/android
./gradlew assembleDebug
```
生成的 APK 路径：`mobile/android/app/build/outputs/apk/debug/app-debug.apk`。
