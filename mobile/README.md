# 📱 HQ 二维码工具箱 - 移动端 (Android & iOS) 原生工程指南

本文档介绍 HQ 二维码工具箱移动原生工程（Android 与 iOS）的架构设计、NativeHost 统一桥接协议以及打包构建指南。

---

## 🏗️ 1. 移动端跨平台架构与 NativeHost 桥接体系

HQ 二维码工具箱在移动端采用 **Web 容器 + 原生能力宿主 (Hybrid Architecture)** 架构：
- **Web 层**：作为主界面展示与交互层（UI 主控、生成器、历史列表、分类标签与外观配置）。
- **Native 层**：提供硬件级极速扫码（CameraX / AVFoundation）、相册选择识别、本地高性能 SQLite 存储与系统交互能力。
- **通信层 (`NativeHost`)**：Web 端与 Native 端统一通过标准契约交互，无需针对特定平台编写侵入式代码。

### 统一通信契约方法与事件

契约定义唯一来源：`common/js/native-host.js`（`window.NativeHost`）。
Platform 适配器通过 `NativeHost.installAdapter(adapter)` 注入，各端只实现自己需要的方法，未实现的方法调用将安全返回 `false`。

**Web ➔ Native（适配器方法，均返回 `boolean` 表示是否成功下发）**

| 方法 | 参数 | 说明 |
| :--- | :--- | :--- |
| `NativeHost.startScan()` | — | 调起原生极速扫码界面 |
| `NativeHost.requestHistorySync()` | — | 主动请求原生全量历史回流 |
| `NativeHost.upsertRecord(record)` | 完整记录对象 | Web 端新增/修改后推送至原生 SQLite |
| `NativeHost.deleteRecord(id)` | UUID 主键 | 按主键精确删除原生记录 |
| `NativeHost.setFavorite(id, isFavorite)` | UUID 主键 + `boolean` | 同步星标收藏状态 |
| `NativeHost.clearRecords()` | — | 同步清空全部原生记录 |
| `NativeHost.vibrate(type)` | `'light'` / `'success'` … | 触发原生触觉反馈 |
| `NativeHost.showToast(message)` | 文本消息 | 触发原生 Toast 提示 |
| `NativeHost.saveImage(dataUrl, filename)` | Base64 dataURL + 文件名 | 将生成的二维码保存至系统相册 |

**Native ➔ Web（由原生侧触发的事件）**

| 事件 | 参数 | 说明 |
| :--- | :--- | :--- |
| `NativeHost.onScanSuccess(handler)` | `(resultText, createdAt, scanId)` | 注册原生扫码成功回调 |
| `NativeHost.onDatabaseSync(handler)` | `(nativeRecordsJson)` | 注册原生数据库全量同步回调 |
| `NativeHost.emitScanSuccess(...)` | `resultText, createdAt, scanId` | 原生调用，回传扫码结果（Web 未注册时自动缓冲） |
| `NativeHost.emitDatabaseSync(...)` | 记录数组 JSON 字符串 | 原生调用，回传全量记录（仅保留最新快照） |

**平台适配器实现映射**

| 契约方法 | Android (`mobile/js/native-bridge.js` → `window.AndroidNative`) | iOS (`mobile/ios/native-bridge-ios.js` → `window.webkit.messageHandlers`) |
| :--- | :--- | :--- |
| `startScan` | `scanQRCode` | `qrScan` |
| `requestHistorySync` | `requestHistorySync` | `qrSync` |
| `upsertRecord` | `syncWebRecordToNative(json)` | `qrUpsert` |
| `deleteRecord` | `deleteWebRecordFromNative(id)` | `qrDelete` |
| `setFavorite` | `toggleFavoriteNative(id, isFavorite)` | `qrFavorite` |
| `clearRecords` | `clearAllNativeRecords` | `qrClear` |
| `vibrate` | `vibrate` | `qrVibrate` |
| `showToast` | `showToast(message)` | `qrToast` |
| `saveImage` | `saveImageToGallery(dataUrl, filename)` | `qrSaveImage` |

原生侧通过 `window.onNativeScanSuccess(...)` / `window.onNativeDatabaseSync(...)`（Android）或
`NativeHost.emitScanSuccess(...)` / `NativeHost.emitDatabaseSync(...)`（iOS）将事件回传 Web 层。


---

## 🍏 2. iOS 原生工程 (`mobile/ios/`)

### 核心模块
1. **`App.swift`**：SwiftUI 应用入口（`@main`），承载 `WebViewContainer`。
2. **`WebViewContainer.swift`**：基于 `WKWebView` 承载 Web 应用，实现 `WKScriptMessageHandler` 与 `WKUIDelegate`（接管 `confirm/alert/prompt` 弹窗、文件选择与相册保存）。
3. **`QRScannerViewController.swift`**：基于 `AVFoundation` 的原生相机扫码，支持手电筒补光与 `PHPickerViewController` 相册照片识别。
4. **`ScanOverlayViewIOS.swift`**：扫码取景框与激光扫描动画。
5. **`HistoryViewController.swift` & `HistoryCell.swift`**：基于 AutoLayout 的原生历史记录列表，支持点击复制、左滑星标收藏、右滑单条删除与一键清空。
6. **`ScanDatabase.h` / `ScanDatabase.m`**（+ `ScanDatabase+Swift.swift` 扩展层）：线程安全 SQLite 数据库引擎（采用 `NSRecursiveLock` 与 `SQLITE_OPEN_FULLMUTEX` 互斥保护）。
7. **`ToastHUD.swift`**：毛玻璃视觉风格的原生 Toast 提示组件。
8. **`ScanRecord.swift`**：数据模型与 `scanDatabaseDidChange` 广播通知定义。

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
2. **`ScanActivity.kt`**：基于 `CameraX` + `Google ML Kit BarcodeScanning` 的毫秒级扫码组件（含相册识别与手电筒）。
3. **`ScanOverlayView.kt`**：扫码取景框与激光动画。
4. **`ScanResultActivity.kt`**：原生识别结果展示、复制与保存。
5. **`ScanHistoryActivity.kt`**：基于 `RecyclerView` 的原生历史列表组件（点击复制、长按删除、一键清空）。
6. **`ScanDatabase.kt` / `ScanRecordDao.kt` / `ScanRecord.kt`**：基于 Jetpack Room 的本地持久化数据库（单例 + DAO + 实体）。

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

- **iOS**：`Info.plist` 中声明 `NSCameraUsageDescription`（相机权限）、`NSPhotoLibraryUsageDescription`（相册读取，用于从相册选图识别）与 `NSPhotoLibraryAddUsageDescription`（保存图片至相册权限）。
- **Android**：`AndroidManifest.xml` 中声明 `CAMERA` 与 `VIBRATE` 权限；`allowBackup="false"` 防数据提取，WebView 禁用明文流量与 `file://` 跨域访问。
