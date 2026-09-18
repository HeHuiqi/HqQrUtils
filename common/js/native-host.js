/**
 * 平台无关的原生宿主契约。
 * Web/Chrome 使用安全降级实现；Android 和未来 iOS 通过 installAdapter 接入原生能力。
 */

(function (window) {
    'use strict';

    let adapter = null;
    let scanSuccessHandler = null;
    let databaseSyncHandler = null;
    const pendingScanEvents = [];
    let pendingDatabaseSnapshot = null;

    function callAdapter(method, args, fallbackValue) {
        if (!adapter || typeof adapter[method] !== 'function') {
            return fallbackValue;
        }
        return adapter[method].apply(adapter, args);
    }

    function deliverPendingEvents() {
        if (scanSuccessHandler) {
            while (pendingScanEvents.length > 0) {
                scanSuccessHandler.apply(null, pendingScanEvents.shift());
            }
        }

        if (databaseSyncHandler && pendingDatabaseSnapshot !== null) {
            const snapshot = pendingDatabaseSnapshot;
            pendingDatabaseSnapshot = null;
            databaseSyncHandler(snapshot);
        }
    }

    const NativeHost = {
        isNative() {
            return !!adapter;
        },

        platform() {
            return adapter && adapter.platform ? adapter.platform : 'web';
        },

        installAdapter(nextAdapter) {
            adapter = nextAdapter || null;
        },

        startScan() {
            return callAdapter('startScan', [], false) === true;
        },

        requestHistorySync() {
            return callAdapter('requestHistorySync', [], false) === true;
        },

        upsertRecord(record) {
            return callAdapter('upsertRecord', [record], false) === true;
        },

        deleteRecord(id) {
            return callAdapter('deleteRecord', [id], false) === true;
        },

        setFavorite(id, isFavorite) {
            return callAdapter('setFavorite', [id, isFavorite], false) === true;
        },

        clearRecords() {
            return callAdapter('clearRecords', [], false) === true;
        },

        vibrate(type) {
            return callAdapter('vibrate', [type], false) === true;
        },

        showToast(message) {
            return callAdapter('showToast', [message], false) === true;
        },

        onScanSuccess(handler) {
            scanSuccessHandler = typeof handler === 'function' ? handler : null;
            deliverPendingEvents();
        },

        onDatabaseSync(handler) {
            databaseSyncHandler = typeof handler === 'function' ? handler : null;
            deliverPendingEvents();
        },

        emitScanSuccess(resultText, createdAt, scanId) {
            const event = [resultText, createdAt, scanId];
            if (scanSuccessHandler) {
                scanSuccessHandler.apply(null, event);
            } else {
                pendingScanEvents.push(event);
            }
        },

        emitDatabaseSync(nativeRecordsJson) {
            if (databaseSyncHandler) {
                databaseSyncHandler(nativeRecordsJson);
            } else {
                pendingDatabaseSnapshot = nativeRecordsJson;
            }
        }
    };

    window.NativeHost = NativeHost;

})(window);
