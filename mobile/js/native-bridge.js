/**
 * Android NativeHost 适配器。
 * 将 Android WebView 的 AndroidNative 接口映射为共享的 NativeHost 契约。
 */

(function (window) {
    'use strict';

    function invokeAndroid(method, args) {
        if (!window.AndroidNative || typeof window.AndroidNative[method] !== 'function') {
            return false;
        }

        try {
            window.AndroidNative[method].apply(window.AndroidNative, args);
            return true;
        } catch (error) {
            console.error('Android native bridge call failed:', method, error);
            return false;
        }
    }

    function markNativeApp() {
        if (!document.body) return;
        document.body.classList.add('is-native-app', 'is-android-app');
    }

    const AndroidBridge = {
        backPressTimestamp: 0,

        startNativeScan() {
            return window.NativeHost.startScan();
        },

        vibrate(type) {
            return window.NativeHost.vibrate(type);
        },

        showToast(message) {
            return window.NativeHost.showToast(message);
        },

        async copyToClipboard(text, successMsg = '内容已复制到剪贴板') {
            if (!navigator.clipboard || !navigator.clipboard.writeText) {
                return false;
            }

            try {
                await navigator.clipboard.writeText(text);
                window.NativeHost.vibrate('light');
                window.NativeHost.showToast(successMsg);
                return true;
            } catch (error) {
                return false;
            }
        },

        /**
         * 由 MainActivity 通过 evaluateJavascript 调用。
         * 返回 true 表示 Web 已处理；false 表示由 Android 继续处理系统返回行为。
         */
        handleBackButton() {
            const cameraViewport = document.getElementById('cameraViewport');
            if (cameraViewport && cameraViewport.style.display === 'flex') {
                const closeCameraBtn = document.getElementById('closeCameraBtn');
                if (closeCameraBtn) {
                    closeCameraBtn.click();
                }
                return true;
            }

            const params = new URLSearchParams(window.location.search);
            if (params.toString() === '') {
                const now = Date.now();
                if (this.backPressTimestamp && now - this.backPressTimestamp < 2000) {
                    this.backPressTimestamp = 0;
                    return false;
                }
                this.backPressTimestamp = now;
                window.NativeHost.showToast('再按一次退出 HQ 二维码工具箱');
                return true;
            }

            return false;
        }
    };

    function installAndroidAdapter() {
        if (!window.AndroidNative || !window.NativeHost) return;

        window.NativeHost.installAdapter({
            platform: 'android',
            startScan() {
                return invokeAndroid('scanQRCode', []);
            },
            requestHistorySync() {
                return invokeAndroid('requestHistorySync', []);
            },
            upsertRecord(record) {
                return invokeAndroid('syncWebRecordToNative', [JSON.stringify(record)]);
            },
            deleteRecord(id) {
                return invokeAndroid('deleteWebRecordFromNative', [id]);
            },
            setFavorite(id, isFavorite) {
                return invokeAndroid('toggleFavoriteNative', [id, isFavorite]);
            },
            clearRecords() {
                return invokeAndroid('clearAllNativeRecords', []);
            },
            vibrate() {
                return invokeAndroid('vibrate', []);
            },
            showToast(message) {
                return invokeAndroid('showToast', [message]);
            }
        });

        markNativeApp();

        // Android Java 保持调用这两个固定全局名；这里仅转发到共享事件总线。
        window.onNativeScanSuccess = function (resultText, createdAt, scanId) {
            window.NativeHost.emitScanSuccess(resultText, createdAt, scanId);
        };
        window.onNativeDatabaseSync = function (nativeRecordsJson) {
            window.NativeHost.emitDatabaseSync(nativeRecordsJson);
        };
    }

    window.AndroidBridge = AndroidBridge;
    installAndroidAdapter();

})(window);
