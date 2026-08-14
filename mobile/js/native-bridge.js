/**
 * HQ 二维码工具箱 - Android 平台原生能力适配器 (Android Native Bridge)
 * 支持唤起原生 CameraX & ML Kit 扫码 Activity (ScanActivity) 及其回调处理
 */

(function (window) {
    'use strict';

    const AndroidBridge = {
        isNative: false,
        Capacitor: null,

        /**
         * 初始化 Android 平台桥接能力
         */
        init() {
            if (window.AndroidNative || (window.Capacitor && window.Capacitor.isNativePlatform())) {
                this.isNative = true;
                this.Capacitor = window.Capacitor || null;
                
                // 标记 Android 移动端 Native 容器，自动隐藏 H5 重复的点击/拖拽上传模块
                if (document.body) {
                    document.body.classList.add('is-android-app');
                } else {
                    document.addEventListener('DOMContentLoaded', () => document.body.classList.add('is-android-app'));
                }
                
                console.log('📱 [Android Native Bridge] 运行于 Android 原生 APP 容器内');
                
                this.bindNativeScanCallback();
                this.setupBackButtonListener();
            } else {
                console.log('🌐 [Android Native Bridge] 当前处于 Web / 浏览器调试环境');
            }
        },

        /**
         * 唤起原生 CameraX & ML Kit 扫码界面 (ScanActivity)
         */
        startNativeScan() {
            if (window.AndroidNative && window.AndroidNative.scanQRCode) {
                window.AndroidNative.scanQRCode();
                return true;
            }
            return false;
        },

        /**
         * 绑定原生扫码成功后的全局回调 onNativeScanSuccess
         */
        bindNativeScanCallback() {
            const originalCallback = window.onNativeScanSuccess;
            window.onNativeScanSuccess = function (resultText) {
                if (!resultText) return;
                console.log('📱 [Native Scan Callback] 收到原生扫码识别结果:', resultText);
                
                // 1. 优先调用 app.js 中已挂载的存储与历史列表刷新方法
                if (typeof originalCallback === 'function') {
                    originalCallback(resultText);
                    return;
                }

                // 2. 兜底策略：如果 app.js 中尚未挂载，手动写入 StorageManager 存储
                if (window.StorageManager && window.StorageManager.loadHistory) {
                    window.StorageManager.loadHistory(function (records) {
                        const historyRecords = records || [];
                        const newRecord = {
                            id: Date.now().toString(),
                            title: '原生扫码识别',
                            content: resultText,
                            category: 'none',
                            isFavorite: false,
                            createdAt: Date.now()
                        };
                        historyRecords.unshift(newRecord);
                        window.StorageManager.saveHistory(historyRecords);
                    });
                }

                // 自动切换到识别标签页并填充文本
                const tabDecode = document.getElementById('tabDecode');
                if (tabDecode) tabDecode.click();

                const decodeResultText = document.getElementById('decodeResultText');
                const decodeResultCard = document.getElementById('decodeResultCard');
                if (decodeResultText && decodeResultCard) {
                    decodeResultText.value = resultText;
                    decodeResultCard.style.display = 'block';
                }

                if (window.ToastManager) {
                    window.ToastManager.show('原生扫码识别成功，已自动保存至历史记录！', 'success');
                }
            };
        },

        /**
         * 触觉反馈 (Vibration / Haptic Feedback)
         */
        vibrate(type = 'light') {
            if (window.AndroidNative && window.AndroidNative.vibrate) {
                window.AndroidNative.vibrate();
                return;
            }
            if (navigator.vibrate) {
                navigator.vibrate(type === 'success' ? [50, 50, 50] : 30);
            }
        },

        /**
         * 原生 Android Toast 提示
         */
        showToast(message) {
            if (window.AndroidNative && window.AndroidNative.showToast) {
                window.AndroidNative.showToast(message);
                return;
            }
            if (window.ToastManager) {
                window.ToastManager.show(message, 'info');
            }
        },

        /**
         * 原生剪贴板复制
         */
        async copyToClipboard(text, successMsg = '内容已复制到剪贴板') {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(text);
                    this.vibrate('light');
                    this.showToast(successMsg);
                    return true;
                } catch (err) {}
            }
            return false;
        },

        /**
         * 监听 Android 物理返回键
         */
        setupBackButtonListener() {
            // Web 页面中已处理常规导航
        }
    };

    // 挂载至全局
    window.AndroidBridge = AndroidBridge;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AndroidBridge.init());
    } else {
        AndroidBridge.init();
    }

})(window);
