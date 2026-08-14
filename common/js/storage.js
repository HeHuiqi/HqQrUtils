/**
 * 本地存储服务模块 (StorageManager)
 * 优先使用 chrome.storage.local（支持扩展防擦除），无环境时自动降级使用 localStorage
 */

(function (window) {
    'use strict';

    const STORAGE_KEY = 'hq_qr_history_records_v1';
    const THEME_KEY = 'hq_qr_theme_preference';

    const StorageManager = {
        /**
         * 加载历史记录数组
         * @param {Function} callback 异步回调函数 (records) => void
         */
        loadHistory(callback) {
            if (window.chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get([STORAGE_KEY], (result) => {
                    if (result && Array.isArray(result[STORAGE_KEY])) {
                        callback(result[STORAGE_KEY]);
                    } else {
                        callback(StorageManager.fallbackLoadFromLocalStorage());
                    }
                });
            } else {
                callback(StorageManager.fallbackLoadFromLocalStorage());
            }
        },

        /**
         * 备用加载机制 (localStorage)
         */
        fallbackLoadFromLocalStorage() {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.error('Failed to parse localStorage history:', e);
                return [];
            }
        },

        /**
         * 保存历史记录
         * @param {Array} records 完整历史记录数组
         * @param {Function} callback 完成回调
         */
        saveHistory(records, callback) {
            if (window.chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ [STORAGE_KEY]: records }, () => {
                    if (callback) callback();
                });
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
                } catch (e) {}
            } else {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
                } catch (e) {
                    console.error('Failed to save to localStorage:', e);
                }
                if (callback) callback();
            }
        },

        /**
         * 保存与获取主题配置
         */
        getTheme() {
            return localStorage.getItem(THEME_KEY);
        },

        setTheme(theme) {
            localStorage.setItem(THEME_KEY, theme);
        },

        /**
         * 导出历史数据为 JSON 文件
         */
        exportJSON(records) {
            if (!records || records.length === 0) {
                return false;
            }
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute('href', dataStr);
            downloadAnchor.setAttribute('download', `hq_qr_history_export_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            document.body.removeChild(downloadAnchor);
            return true;
        },

        /**
         * 解析并读取导入的 JSON 文件
         */
        importJSON(file, callback) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (Array.isArray(imported)) {
                        callback(null, imported);
                    } else {
                        callback(new Error('导入文件格式不符合数组规范'));
                    }
                } catch (err) {
                    callback(err);
                }
            };
            reader.readAsText(file);
        }
    };

    window.StorageManager = StorageManager;

})(window);
