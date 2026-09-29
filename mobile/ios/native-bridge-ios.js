/**
 * HQ 二维码工具箱 - iOS 平台原生能力适配器 (iOS Native Bridge)
 *
 * 该模块实现 NativeHost Adapter 接口，将 NativeHost 的抽象方法映射到 iOS
 * WKWebView 的 `window.webkit.messageHandlers` 通信机制。
 *
 * 通信约定：
 *   JS  →  Native : window.webkit.messageHandlers.<name>.postMessage(data)
 *   Native →  JS   : webView.evaluateJavaScript("NativeHost.emit*(...)")
 */

(function (window) {
    'use strict';

    // 检查是否运行在 iOS WKWebView 容器内
    function isIosWebView() {
        return typeof WKWebView !== 'undefined' ||
               (window.webkit && window.webkit.messageHandlers &&
                window.webkit.messageHandlers.qrScan);
    }

    // 安全的 messageHandlers 调用包装器
    function postMessage(handlerName, data) {
        const handlers = window.webkit && window.webkit.messageHandlers;
        if (!handlers || !handlers[handlerName] || typeof handlers[handlerName].postMessage !== 'function') {
            return false;
        }
        try {
            handlers[handlerName].postMessage(data || {});
            return true;
        } catch (e) {
            console.warn('[iOS Bridge] Failed to post message to ' + handlerName + ':', e);
            return false;
        }
    }

    // iOS 原生适配器 — 实现 NativeHost.installAdapter() 所需的接口
    const IosAdapter = {
        platform: 'ios',

        startScan() {
            return postMessage('qrScan');
        },

        requestHistorySync() {
            return postMessage('qrSync');
        },

        upsertRecord(record) {
            return postMessage('qrUpsert', record);
        },

        deleteRecord(id) {
            return postMessage('qrDelete', { id: id });
        },

        setFavorite(id, isFavorite) {
            return postMessage('qrFavorite', { id: id, isFavorite: isFavorite });
        },

        clearRecords() {
            return postMessage('qrClear');
        },

        vibrate(type) {
            return postMessage('qrVibrate', { type: type || 'light' });
        },

        showToast(message) {
            return postMessage('qrToast', { message: message });
        },

        saveImage(dataUrl, filename) {
            return postMessage('qrSaveImage', { dataUrl: dataUrl, filename: filename });
        }
    };

    // 自动安装适配器 (在 iOS WKWebView 环境下)
    if (isIosWebView() && window.NativeHost) {
        NativeHost.installAdapter(IosAdapter);
        console.log('📱 [iOS Native Bridge] 已安装 iOS 适配器，连接 NativeHost');

        // 标记 iOS 容器，隐藏 H5 重复的点击/拖拽上传模块
        if (document.body) {
            document.body.classList.add('is-native-app', 'is-ios-app');
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                document.body.classList.add('is-native-app', 'is-ios-app');
            });
        }
    }

})(window);
