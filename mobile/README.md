# 📱 HQ 二维码工具箱 - 移动端 (Android & iOS) 原生工程指南

本文档介绍 HQ 二维码工具箱移动原生工程（Android 与 iOS）的架构设计、NativeHost 统一桥接协议以及打包构建指南。

---

## 🏗️ 1. 移动端跨平台架构与 NativeHost 桥接体系

HQ 二维码工具箱在移动端采用 **Web 容器 + 原生能力宿主 (Hybrid Architecture)** 架构：
- **Web 层**：作为主界面展示与交互层（UI 主控、生成器、历史列表、分类标签与外观配置）。
- **Native 层**：提供硬件级极速扫码（CameraX / AVFoundation）、相册选择识别、本地高性能 SQLite 存储与系统交互能力。
- **通信层 (`NativeHost`)**：Web 端与 Native 端统一通过标准契约交互，无需针对特定平台编写侵入式代码。

### 统一通信契约方法与事件

| 方向 | 方法 / 标识 | 说明 |
| :--- | :--- | :--- |
| **Web ➔ Native** | `NativeHost.openScanner()` | 调起原生极速扫码界面 |
| **Web ➔ Native** | `NativeHost.syncDatabase(records)` | Web 变更（生成/修改）推送同步至原生 SQLite |
| **Web ➔ Native** | `NativeHost.toggleFavorite(id, isFavorite)` | 同步收藏状态至原生 SQLite |
| **Web ➔ Native** | `NativeHost.deleteRecord(id)` | 同步单条删除至原生 SQLite |
| **Web ➔ Native** | `NativeHost.clearAll()` | 同步清空全部原生记录 |
| **Web ➔ Native** | `NativeHost.saveImage(dataUrl, filename)` | 请求原生将 Base64 图片保存至系统相册 |
| **Web ➔ Native** | `NativeHost.haptic(type)` | 触发轻量级触觉振动反馈 |
| **Web ➔ Native** | `NativeHost.toast(msg, type)` | 触发原生 Toast 消息 |
| **Native ➔ Web** | `NativeHost.emitScanSuccess(result)` | 原生扫码成功后回传结果并更新 UI |
| **Native ➔ Web** | `NativeHost.emitDatabaseSync(records)` | 原生数据变更后全量同步至 Web `localStorage` |

---

## 🍏 2. iOS 原生工程 (`mobile/ios/`)

### 核心模块
1. **`WebViewContainer.swift`**：基于 `WKWebView` 承载 Web 应用，实现 `WKScriptMessageHandler` 与 `WKUIDelegate`（接管 `confirm/alert` 弹窗与相册保存）。
2. **`ScannerViewController.swift`**：基于 `AVFoundation` 的原生相机扫码，支持手电筒补光与 `PHPickerViewController` 相册照片识别。
3. **`HistoryViewController.swift` & `HistoryCell.swift`**：基于 AutoLayout 的原生历史记录列表，支持分类筛选、搜索、收藏与删除。
4. **`ScanDatabase.h` / `ScanDatabase.m`**：线程安全 SQLite 数据库引擎（采用 `NSRecursiveLock` 与 `SQLITE_OPEN_FULLMUTEX` 互斥保护）。
5. **`ToastHUD.swift`**：毛玻璃视觉风格的原生 Toast 提示组件。

### 构建与运行 iOS 工程
```bash
# 1. 组装 Web 资源并生成 Xcode 项目
./build_script/generate_xcode_project.sh

# 2. 打开生成的 Xcode 项目
open mobile/ios/HqQrUtils.xcodeproj
```

---

## 🤖 3. Android 原生工程 (`mobile/android/`)

### 核心模块
1. **`MainActivity.java`**：基于 Android 原生 `WebView` 承载 Web 页面，实现 `@JavascriptInterface` 原生桥接。
2. **`ScanActivity.kt`**：基于 `CameraX` + `Google ML Kit BarcodeScanning` 的毫秒级扫码组件。
3. **`ScanHistoryActivity.kt`**：基于 `RecyclerView` 的原生历史列表组件。
4. **`ScanDatabase.kt` / `ScanRecordDao.kt`**：基于 Jetpack Room 的本地持久化数据库。

### 构建与打包 Android APK
```bash
# 1. 组装 Web 资源到 Android assets 目录
./build_script/build_android.sh

# 2. 编译生成 Debug APK
cd mobile/android && ./gradlew assembleDebug
```
生成的 APK 路径：`mobile/android/app/build/outputs/apk/debug/app-debug.apk`。

---

## 🔒 4. 权限与安全配置

- **iOS**：`Info.plist` 中声明 `NSCameraUsageDescription`（相机权限）与 `NSPhotoLibraryAddUsageDescription`（保存图片至相册权限）。
- **Android**：`AndroidManifest.xml` 中声明 `CAMERA` 与 `VIBRATE` 权限；`allowBackup="false"` 防数据提取，禁用明文流量。
