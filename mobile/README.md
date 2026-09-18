# 📱 HQ 二维码工具箱 - 移动端 (Android App) 构建说明

本文档介绍当前 Android 原生 App 的构建与扩展方式。共享 Web 层通过 `NativeHost` 对接平台能力；iOS 原生 Host 将在后续阶段以同一契约接入。

---

## 📱 1. Android 原生功能与特性支持 (Android Features)

1. **统一原生宿主桥接 (NativeHost)**：
   - 共享 Web 应用仅通过 `NativeHost` 调用扫码、历史同步、收藏、删除、清空、触觉与提示能力。
   - `mobile/js/native-bridge.js` 将该契约映射到 Android WebView 的 `AndroidNative` 接口，为后续 iOS Host 预留同一组命令与事件。
2. **原生扫码与历史同步**：
   - CameraX、ML Kit 和 Room 负责原生扫码与历史持久化；扫码结果及数据库快照通过 NativeHost 回写共享 Web UI。
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
