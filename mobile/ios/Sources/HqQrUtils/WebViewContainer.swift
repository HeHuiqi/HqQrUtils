//
//  WebViewContainer.swift
//  HqQrUtils - iOS WKWebView Container & Native Bridge
//
//  负责：
//  1. 加载本地 Web 应用 (bundle 中的 public/index.html)
//  2. 处理 WKWebView ←→ JavaScript 的双向通信 (WKScriptMessageHandler)
//  3. 路由 NativeHost 的 Adapter 方法调用到 iOS 原生实现
//  4. 处理文件选择器 (WebKit 文件上传)
//

import SwiftUI
import WebKit
import UIKit
import Photos

// MARK: - WebView Container View (SwiftUI)

struct WebViewContainer: UIViewRepresentable {
    func makeCoordinator() -> WebViewCoordinator {
        WebViewCoordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let contentController = WKUserContentController()

        // 注册所有 messageHandlers (对应 native-bridge-ios.js 中的 postMessage 调用)
        let handlers = ["qrScan", "qrSync", "qrUpsert", "qrDelete",
                        "qrFavorite", "qrClear", "qrVibrate", "qrToast",
                        "qrHistory", "qrOpenHistory", "qrSaveImage"]
        for name in handlers {
            contentController.add(context.coordinator, name: name)
        }

        let config = WKWebViewConfiguration()
        config.preferences = WKPreferences()
        config.userContentController = contentController
        config.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator

        // 保存对 WebView 的弱引用 (供 Coordinator 在消息处理时调用 JS)
        context.coordinator.webView = webView

        // 加载本地 Web 应用
        loadLocalHTML(webView: webView)

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No-op: 静态内容，无需更新
    }

    private func loadLocalHTML(webView: WKWebView) {
        // 优先加载 bundle 中的 Web 应用 (iOS 打包产物)
        if let path = Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "public") {
            let url = URL(fileURLWithPath: path)
            webView.loadFileURL(url, allowingReadAccessTo: Bundle.main.bundleURL)
        } else if let path = Bundle.main.path(forResource: "public/index", ofType: "html") {
            let url = URL(fileURLWithPath: path)
            webView.loadFileURL(url, allowingReadAccessTo: Bundle.main.bundleURL)
        } else if let path = Bundle.main.path(forResource: "index", ofType: "html") {
            let url = URL(fileURLWithPath: path)
            webView.loadFileURL(url, allowingReadAccessTo: Bundle.main.bundleURL)
        } else if let url = URL(string: "http://localhost:8080/index.html") {
            // 开发调试模式
            webView.load(URLRequest(url: url))
        } else {
            print("❌ [iOS WKWebView] 未能在 Bundle 中找到 public/index.html")
        }
    }
}

// MARK: - WebView Coordinator

class WebViewCoordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, ObservableObject {
    weak var webView: WKWebView?
    private let database = ScanDatabase.shared()

    override init() {
        super.init()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDatabaseChangeNotification),
            name: .scanDatabaseDidChange,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDatabaseChangeNotification),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func handleDatabaseChangeNotification() {
        DispatchQueue.main.async { [weak self] in
            self?.handleHistorySyncRequest()
        }
    }

    // MARK: - WKScriptMessageHandler

    /// 处理 JS → Native 消息调用 (对应 native-bridge-ios.js 中的 messageHandlers)
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        let handlerName = message.name
        let body = message.body

        switch handlerName {
        case "qrScan":
            handleScanRequest()
        case "qrSync":
            handleHistorySyncRequest()
        case "qrUpsert":
            handleUpsertRecord(body)
        case "qrDelete":
            handleDeleteRecord(body)
        case "qrFavorite":
            handleSetFavorite(body)
        case "qrClear":
            handleClearRecords()
        case "qrVibrate":
            handleVibrate()
        case "qrToast":
            handleShowToast(body)
        case "qrHistory", "qrOpenHistory":
            handleHistoryRequest()
        case "qrSaveImage":
            handleSaveImage(body)
        default:
            print("⚠️ [iOS Bridge] Unknown message handler: \(handlerName)")
        }
    }

    // MARK: - Message Handlers (JS → Native)

    private func handleScanRequest() {
        DispatchQueue.main.async {
            guard let rootVC = UIApplication.hqKeyWindow?.rootViewController else { return }

            let scannerVC = QRScannerViewController { [weak self] resultText, scanId, createdAt in
                self?.deliverScanResult(resultText: resultText, scanId: scanId, createdAt: createdAt)
            }
            scannerVC.modalPresentationStyle = .fullScreen
            rootVC.present(scannerVC, animated: true)
        }
    }

    private func handleHistoryRequest() {
        DispatchQueue.main.async { [weak self] in
            guard let rootVC = UIApplication.hqKeyWindow?.rootViewController else { return }

            let historyVC = HistoryViewController()
            historyVC.onDismiss = { [weak self] in
                self?.handleHistorySyncRequest()
            }
            let nav = UINavigationController(rootViewController: historyVC)
            nav.modalPresentationStyle = .pageSheet
            rootVC.present(nav, animated: true)
        }
    }

    func handleHistorySyncRequest() {
        let records = database.getAllRecordsSwift()
        let jsonData = try? JSONSerialization.data(withJSONObject: records, options: [])
        let jsonString = jsonData.flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
        let js = "if (window.NativeHost && typeof window.NativeHost.emitDatabaseSync === 'function') { window.NativeHost.emitDatabaseSync(\(jsonString.quoted())); }"
        executeJS(js)
    }

    private func handleUpsertRecord(_ body: Any) {
        guard let dict = body as? [String: Any] else { return }

        let record = ScanRecord(
            id: dict["id"] as? String ?? UUID().uuidString,
            content: dict["content"] as? String ?? "",
            type: dict["type"] as? String ?? "QR_CODE",
            title: dict["title"] as? String ?? "",
            category: dict["category"] as? String ?? "none",
            isFavorite: dict["isFavorite"] as? Bool ?? false,
            createdAt: (dict["createdAt"] as? NSNumber)?.int64Value ?? Int64(Date().timeIntervalSince1970 * 1000),
            fgColor: dict["fgColor"] as? String ?? "#0f172a",
            bgColor: dict["bgColor"] as? String ?? "#ffffff",
            ecl: dict["ecl"] as? String ?? "M",
            cellSize: dict["cellSize"] as? Int ?? 8,
            margin: dict["margin"] as? Int ?? 4
        )
        database.insertOrReplaceSwift(record)
    }

    private func handleDeleteRecord(_ body: Any) {
        guard let dict = body as? [String: Any],
              let id = dict["id"] as? String else { return }
        database.delete(byId: id)
        NotificationCenter.default.post(name: .scanDatabaseDidChange, object: nil)
    }

    private func handleSetFavorite(_ body: Any) {
        guard let dict = body as? [String: Any],
              let id = dict["id"] as? String,
              let isFavorite = dict["isFavorite"] as? Bool else { return }
        database.updateFavorite(id, isFavorite: isFavorite)
        NotificationCenter.default.post(name: .scanDatabaseDidChange, object: nil)
    }

    private func handleClearRecords() {
        database.clearAll()
        NotificationCenter.default.post(name: .scanDatabaseDidChange, object: nil)
    }

    private func handleVibrate() {
        let impact = UIImpactFeedbackGenerator(style: .medium)
        impact.impactOccurred()
    }

    private func handleShowToast(_ body: Any) {
        let message: String
        var type: ToastType = .info

        if let dict = body as? [String: Any] {
            message = dict["message"] as? String ?? ""
            if let typeStr = dict["type"] as? String {
                switch typeStr.lowercased() {
                case "success": type = .success
                case "error": type = .error
                case "warning", "warn": type = .warning
                default: type = .info
                }
            }
        } else if let str = body as? String {
            message = str
        } else {
            return
        }

        guard !message.isEmpty else { return }

        // 根据消息内容智能匹配成功/错误/警告图标
        if message.contains("成功") || message.contains("已保存") || message.contains("已复制") || message.contains("已下载") {
            type = .success
        } else if message.contains("失败") || message.contains("错误") {
            type = .error
        } else if message.contains("权限") || message.contains("开启") || message.contains("请在") || message.contains("退出") {
            type = .warning
        }

        ToastHUD.shared.show(message: message, type: type)
    }

    private func handleSaveImage(_ body: Any) {
        guard let dict = body as? [String: Any],
              let dataUrl = dict["dataUrl"] as? String else {
            ToastHUD.shared.show(message: "保存图片失败：数据无效", type: .error)
            return
        }

        // 解析 Base64 图片数据 (兼容 data:image/png;base64,xxxx 或纯 base64)
        let base64String: String
        if let commaIndex = dataUrl.firstIndex(of: ",") {
            base64String = String(dataUrl[dataUrl.index(after: commaIndex)...])
        } else {
            base64String = dataUrl
        }

        guard let imageData = Data(base64Encoded: base64String, options: .ignoreUnknownCharacters),
              let image = UIImage(data: imageData) else {
            ToastHUD.shared.show(message: "图片解析失败", type: .error)
            return
        }

        saveImageToPhotosAlbum(image)
    }

    private func saveImageToPhotosAlbum(_ image: UIImage) {
        if #available(iOS 14, *) {
            let status = PHPhotoLibrary.authorizationStatus(for: .addOnly)
            switch status {
            case .authorized, .limited:
                performPhotoSave(image)
            case .notDetermined:
                PHPhotoLibrary.requestAuthorization(for: .addOnly) { [weak self] newStatus in
                    if newStatus == .authorized || newStatus == .limited {
                        self?.performPhotoSave(image)
                    } else {
                        ToastHUD.shared.show(message: "未获得相册权限，无法保存图片", type: .warning)
                    }
                }
            case .denied, .restricted:
                ToastHUD.shared.show(message: "请在“设置 - 隐私”中开启相册权限", type: .warning)
            @unknown default:
                performPhotoSave(image)
            }
        } else {
            let status = PHPhotoLibrary.authorizationStatus()
            if status == .authorized {
                performPhotoSave(image)
            } else if status == .notDetermined {
                PHPhotoLibrary.requestAuthorization { [weak self] newStatus in
                    if newStatus == .authorized {
                        self?.performPhotoSave(image)
                    } else {
                        ToastHUD.shared.show(message: "未获得相册权限，无法保存图片", type: .warning)
                    }
                }
            } else {
                ToastHUD.shared.show(message: "请在“设置 - 隐私”中开启相册权限", type: .warning)
            }
        }
    }

    private func performPhotoSave(_ image: UIImage) {
        PHPhotoLibrary.shared().performChanges({
            PHAssetChangeRequest.creationRequestForAsset(from: image)
        }) { success, error in
            DispatchQueue.main.async {
                if success {
                    ToastHUD.shared.show(message: "已成功保存到系统相册", type: .success)
                    let feedback = UINotificationFeedbackGenerator()
                    feedback.notificationOccurred(.success)
                } else {
                    let errMsg = error?.localizedDescription ?? "保存失败"
                    ToastHUD.shared.show(message: "保存失败: \(errMsg)", type: .error)
                }
            }
        }
    }

    // MARK: - Native → JS Event Delivery

    /// Native 扫码成功 → Web 层回调 NativeHost.emitScanSuccess
    func deliverScanResult(resultText: String, scanId: String, createdAt: Int64) {
        let escapedText = resultText.replacingOccurrences(of: "'", with: "\\'")
        let escapedId = scanId.replacingOccurrences(of: "'", with: "\\'")
        executeJS("NativeHost.emitScanSuccess('\(escapedText)', \(createdAt), '\(escapedId)');")
    }

    // MARK: - File Upload (for image picker in H5)

    func fileChooserCallback(_ urls: [URL]?) {
        // 当 Web 端触发文件选择时，调用此方法
        // 在 WKUIDelegate 中处理
    }

    // MARK: - WKNavigationDelegate

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        let scheme = (url.scheme ?? "").lowercased()

        // 1. 本地 bundle 页面与资源，允许正常加载
        if url.isFileURL || scheme == "about" {
            decisionHandler(.allow)
            return
        }

        // 2. 显式拦截危险可执行伪协议 (javascript:, data:, vbscript:, blob:)
        if ["javascript", "data", "vbscript", "blob"].contains(scheme) {
            decisionHandler(.cancel)
            return
        }

        // 3. 外部 HTTP(S) 网页或自定义 Scheme（如 voghion://, alipays://, weixin://, tel:, mailto:）
        // 唤起系统 Safari 浏览器或外部 App，防止在当前 WebView 内部覆盖主界面
        if UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
        decisionHandler(.cancel)
    }

    // MARK: - WKUIDelegate

    /// 支持 <a target="_blank"> 或 window.open 链接调起系统 Safari 浏览器
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
        return nil
    }

    /// 支持 window.alert(...) 原生弹窗
    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        guard let rootVC = UIApplication.hqKeyWindow?.rootViewController else {
            completionHandler()
            return
        }

        let alert = UIAlertController(title: "提示", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "确定", style: .default) { _ in
            completionHandler()
        })
        rootVC.present(alert, animated: true)
    }

    /// 支持 window.confirm(...) 原生确认对话框 (如 Web 端清空历史记录确认)
    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        guard let rootVC = UIApplication.hqKeyWindow?.rootViewController else {
            completionHandler(false)
            return
        }

        let alert = UIAlertController(title: "确认操作", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in
            completionHandler(false)
        })
        alert.addAction(UIAlertAction(title: "确定", style: .destructive) { _ in
            completionHandler(true)
        })
        rootVC.present(alert, animated: true)
    }

    /// 支持 window.prompt(...) 原生输入对话框
    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        guard let rootVC = UIApplication.hqKeyWindow?.rootViewController else {
            completionHandler(nil)
            return
        }

        let alert = UIAlertController(title: prompt, message: nil, preferredStyle: .alert)
        alert.addTextField { textField in
            textField.text = defaultText
        }
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in
            completionHandler(nil)
        })
        alert.addAction(UIAlertAction(title: "确定", style: .default) { _ in
            let text = alert.textFields?.first?.text
            completionHandler(text)
        })
        rootVC.present(alert, animated: true)
    }

    // MARK: - Utilities

    private func executeJS(_ js: String) {
        DispatchQueue.main.async {
            self.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}

// MARK: - UIApplication Extension (iOS 13+ 多场景安全的 KeyWindow 获取)

extension UIApplication {

    /// 当前活跃的 KeyWindow。
    ///
    /// 替代 iOS 15 起已废弃的 `UIApplication.shared.windows`，基于 `connectedScenes`
    /// 在多场景 (iPad 多窗口 / SceneDelegate) 环境下也能正确取到前台窗口。
    static var hqKeyWindow: UIWindow? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }
    }
}

// MARK: - String Extension

extension String {
    func quoted() -> String {
        let escaped = self.replacingOccurrences(of: "\\", with: "\\\\")
                         .replacingOccurrences(of: "\"", with: "\\\"")
                         .replacingOccurrences(of: "\n", with: "\\n")
                         .replacingOccurrences(of: "'", with: "\\'")
        return "\"\(escaped)\""
    }
}

