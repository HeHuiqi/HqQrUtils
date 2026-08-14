/**
 * 通用存储适配器 (StorageAdapter)
 * 抽象契约：支持扩展版 (chrome.storage.local)、Web版 (localStorage) 与 移动端App (Capacitor)
 */

(function (window) {
    'use strict';

    const STORAGE_KEY = 'hq_qr_history_records_v1';
    const THEME_KEY = 'hq_qr_theme_preference';

    const StorageAdapter = {
        /**
         * 跨平台通用保存机制
         */
        saveHistory(records, callback) {
            // 1. Chrome 扩展优先使用 chrome.storage.local
            if (window.chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ [STORAGE_KEY]: records }, () => {
                    if (callback) callback();
                });
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
                } catch (e) {}
            } else {
                // 2. 普通 Web 或移动端默认降级使用 localStorage
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
                } catch (e) {
                    console.error('Failed to save to localStorage:', e);
                }
                if (callback) callback();
            }
        },

        /**
         * 跨平台通用加载机制
         */
        loadHistory(callback) {
            if (window.chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get([STORAGE_KEY], (result) => {
                    if (result && Array.isArray(result[STORAGE_KEY])) {
                        callback(result[STORAGE_KEY]);
                    } else {
                        callback(StorageAdapter.fallbackLoadFromLocalStorage());
                    }
                });
            } else {
                callback(StorageAdapter.fallbackLoadFromLocalStorage());
            }
        },

        /**
         * localStorage 回退
         */
        fallbackLoadFromLocalStorage() {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                return [];
            }
        },

        /**
         * 主题获取与保存
         */
        getTheme() {
            return localStorage.getItem(THEME_KEY);
        },

        setTheme(theme) {
            localStorage.setItem(THEME_KEY, theme);
        },

        /**
         * 导出数据 JSON
         */
        exportJSON(records) {
            if (!records || records.length === 0) return false;
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
         * 导入解析 JSON 文件
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

    window.StorageAdapter = StorageAdapter;
    window.StorageManager = StorageAdapter;

})(window);
