/**
 * 移动端 App 原生 API 桥接适配器 (Capacitor Native Bridge)
 */

(function (window) {
    'use strict';

    const NativeBridge = {
        /**
         * 检查是否运行在 Capacitor 原生 App 环境中
         */
        isNativeApp() {
            return !!(window.Capacitor && window.Capacitor.isNativePlatform());
        },

        /**
         * 触发手机原生震动反馈
         */
        vibrate(pattern = 50) {
            if (navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        },

        /**
         * 写入剪贴板
         */
        async copyToClipboard(text) {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            return false;
        }
    };

    window.NativeBridge = NativeBridge;

})(window);
