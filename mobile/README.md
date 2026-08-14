# 📱 HQ 二维码移动端 App 工程 (Mobile App Target)

本目录为移动端（iOS / Android）Capacitor 打包工程。

---

## 🛠️ 打包步骤指南 (Capacitor Step-by-Step)

### 1. 安装依赖
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

### 2. 初始化项目配置
```bash
npx cap init "HQ二维码" "com.hqqr.utils" --web-dir "."
```

### 3. 添加平台工程
```bash
npx cap add android
npx cap add ios
```

### 4. 同步代码与打包导出
```bash
npx cap sync
npx cap open android   # 用 Android Studio 构建生成 APK
npx cap open ios       # 用 Xcode 构建生成 iOS App
```
