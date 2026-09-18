'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'common', 'js', 'native-host.js'),
    'utf8'
);

function createHost() {
    const sandbox = { console };
    sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, { filename: 'native-host.js' });
    return sandbox.NativeHost;
}

(function testWebFallback() {
    const host = createHost();

    assert.equal(host.isNative(), false);
    assert.equal(host.platform(), 'web');
    assert.equal(host.startScan(), false);
    assert.equal(host.requestHistorySync(), false);
    assert.equal(host.upsertRecord({ id: 'web-record' }), false);
    assert.equal(host.deleteRecord('web-record'), false);
    assert.equal(host.setFavorite('web-record', true), false);
    assert.equal(host.clearRecords(), false);
    assert.equal(host.vibrate('light'), false);
    assert.equal(host.showToast('hello'), false);
})();

(function testBufferedInboundEvents() {
    const host = createHost();
    const scanEvents = [];
    const databaseEvents = [];

    host.emitScanSuccess('first', 1, 'scan-1');
    host.emitScanSuccess('second', 2, 'scan-2');
    host.emitDatabaseSync('["stale"]');
    host.emitDatabaseSync('["latest"]');

    host.onScanSuccess((content, createdAt, scanId) => {
        scanEvents.push([content, createdAt, scanId]);
    });
    host.onDatabaseSync((recordsJson) => {
        databaseEvents.push(recordsJson);
    });

    assert.deepEqual(scanEvents, [
        ['first', 1, 'scan-1'],
        ['second', 2, 'scan-2']
    ]);
    assert.deepEqual(databaseEvents, ['["latest"]']);
})();

(function testAdapterDelegation() {
    const host = createHost();
    const calls = [];
    const record = { id: 'record-1', content: 'https://example.com' };

    host.installAdapter({
        platform: 'android',
        startScan() { calls.push(['startScan']); return true; },
        requestHistorySync() { calls.push(['requestHistorySync']); return true; },
        upsertRecord(value) { calls.push(['upsertRecord', value]); return true; },
        deleteRecord(id) { calls.push(['deleteRecord', id]); return true; },
        setFavorite(id, isFavorite) { calls.push(['setFavorite', id, isFavorite]); return true; },
        clearRecords() { calls.push(['clearRecords']); return true; },
        vibrate(type) { calls.push(['vibrate', type]); return true; },
        showToast(message) { calls.push(['showToast', message]); return true; }
    });

    assert.equal(host.isNative(), true);
    assert.equal(host.platform(), 'android');
    assert.equal(host.startScan(), true);
    assert.equal(host.requestHistorySync(), true);
    assert.equal(host.upsertRecord(record), true);
    assert.equal(host.deleteRecord(record.id), true);
    assert.equal(host.setFavorite(record.id, true), true);
    assert.equal(host.clearRecords(), true);
    assert.equal(host.vibrate('success'), true);
    assert.equal(host.showToast('saved'), true);
    assert.equal(calls[2][1].id, 'record-1');
    assert.deepEqual(calls.map(call => call[0]), [
        'startScan',
        'requestHistorySync',
        'upsertRecord',
        'deleteRecord',
        'setFavorite',
        'clearRecords',
        'vibrate',
        'showToast'
    ]);
})();

(function testOptionalAdapterMethods() {
    const host = createHost();
    host.installAdapter({
        platform: 'ios',
        startScan() { return true; }
    });

    assert.equal(host.startScan(), true);
    assert.equal(host.upsertRecord({ id: 'missing-method' }), false);
    assert.equal(host.showToast('missing-method'), false);
})();

console.log('NativeHost tests passed');
