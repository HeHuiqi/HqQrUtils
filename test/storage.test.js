'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'common', 'js', 'storage.js'),
    'utf8'
);

const HISTORY_KEY = 'hq_qr_history_records_v1';
const THEME_KEY = 'hq_qr_theme_preference';

function createLocalStorage(seed) {
    const store = Object.assign({}, seed);
    return {
        __store: store,
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        },
        setItem(key, value) {
            store[key] = String(value);
        },
        removeItem(key) {
            delete store[key];
        }
    };
}

function createStorage(localStorageStub, sandboxConsole) {
    const sandbox = { console: sandboxConsole || console, localStorage: localStorageStub };
    sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, { filename: 'storage.js' });
    return sandbox.StorageManager;
}

// 说明：vm 沙箱内的 JSON.parse 产物来自另一个 Realm，其原型链与宿主 Realm 不同，
// 因此 deepStrictEqual 会失败 —— 这里统一用序列化结果做跨 Realm 精确比较。
const serialize = (value) => JSON.stringify(value);

(function testFallbackLoadFromLocalStorage() {
    const withData = createStorage(createLocalStorage({
        [HISTORY_KEY]: JSON.stringify([{ id: 'a', content: 'https://example.com' }])
    }));
    assert.equal(
        serialize(withData.fallbackLoadFromLocalStorage()),
        serialize([{ id: 'a', content: 'https://example.com' }])
    );

    const empty = createStorage(createLocalStorage({}));
    assert.equal(serialize(empty.fallbackLoadFromLocalStorage()), serialize([]));

    // 数据损坏时必须安全降级为空数组并记录错误，而不是抛出异常
    const capturedErrors = [];
    const broken = createStorage(
        createLocalStorage({ [HISTORY_KEY]: '{not valid json' }),
        { log() {}, warn() {}, error(message) { capturedErrors.push(message); } }
    );
    assert.equal(serialize(broken.fallbackLoadFromLocalStorage()), serialize([]));
    assert.equal(capturedErrors.length, 1);
})();

(function testSaveHistoryFallback() {
    const stub = createLocalStorage({});
    const storage = createStorage(stub);
    let callbackCalled = false;

    storage.saveHistory([{ id: 'a' }], () => { callbackCalled = true; });

    assert.equal(callbackCalled, true);
    assert.equal(stub.__store[HISTORY_KEY], JSON.stringify([{ id: 'a' }]));
})();

(function testExportJSONGuard() {
    const storage = createStorage(createLocalStorage({}));

    assert.equal(storage.exportJSON([]), false);
    assert.equal(storage.exportJSON(null), false);
    assert.equal(storage.exportJSON(undefined), false);
})();

(function testThemeFallback() {
    const stub = createLocalStorage({ [THEME_KEY]: 'dark' });
    const storage = createStorage(stub);

    assert.equal(storage.getTheme(), 'dark');

    storage.setTheme('light');
    assert.equal(storage.getTheme(), 'light');
})();

(function testNativeMigrationFlagPersistence() {
    const stub = createLocalStorage({});
    const storage = createStorage(stub);

    // 全新安装：尚未做过冷迁移
    assert.equal(storage.hasNativeMigrationCompleted(), false);

    storage.setNativeMigrationCompleted();
    assert.equal(storage.hasNativeMigrationCompleted(), true);

    // 模拟进程重启 (重新加载模块，但保留同一份 localStorage)：
    // 标记必须仍能读回，否则原生端已清空的记录会在重启后被重新灌回。
    const restarted = createStorage(stub);
    assert.equal(restarted.hasNativeMigrationCompleted(), true);
})();

console.log('StorageManager tests passed');
