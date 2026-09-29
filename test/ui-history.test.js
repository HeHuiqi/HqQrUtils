'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'common', 'js', 'ui-history.js'),
    'utf8'
);

function createManager() {
    const sandbox = { console };
    sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, { filename: 'ui-history.js' });
    return sandbox.HistoryUIManager;
}

(function testSafeSchemeUrl() {
    const ui = createManager();

    // 标准网络链接与业务 Custom Scheme
    assert.equal(ui.isSafeSchemeUrl('https://example.com'), true);
    assert.equal(ui.isSafeSchemeUrl('http://example.com/a?b=1'), true);
    assert.equal(ui.isSafeSchemeUrl('voghion://product/123'), true);
    assert.equal(ui.isSafeSchemeUrl('intent://scan/#Intent;scheme=zxing;end'), true);
    assert.equal(ui.isSafeSchemeUrl('  https://example.com  '), true);

    // 无 "//" 的标准 Scheme 白名单 (v1.3.1 补全)
    assert.equal(ui.isSafeSchemeUrl('mailto:liming@example.com'), true);
    assert.equal(ui.isSafeSchemeUrl('tel:13800008888'), true);
    assert.equal(ui.isSafeSchemeUrl('sms:10086'), true);
    assert.equal(ui.isSafeSchemeUrl('geo:31.23,121.47'), true);

    // 危险伪协议必须被严格拦截
    assert.equal(ui.isSafeSchemeUrl('javascript:alert(1)'), false);
    assert.equal(ui.isSafeSchemeUrl('JavaScript:alert(1)'), false);
    assert.equal(ui.isSafeSchemeUrl('data:text/html;base64,PHNjcmlwdD4='), false);
    assert.equal(ui.isSafeSchemeUrl('vbscript:msgbox(1)'), false);
    assert.equal(ui.isSafeSchemeUrl('file:///etc/passwd'), false);
    assert.equal(ui.isSafeSchemeUrl('about:blank'), false);
    assert.equal(ui.isSafeSchemeUrl('blob:https://example.com/uuid'), false);
    assert.equal(ui.isSafeSchemeUrl('chrome://settings'), false);
    assert.equal(ui.isSafeSchemeUrl('resource://gre/modules/x.js'), false);

    // 非 URL 内容与非法输入
    assert.equal(ui.isSafeSchemeUrl('纯文本内容'), false);
    assert.equal(ui.isSafeSchemeUrl('WIFI:S:HQ-Office-5G;T:WPA;P:8888;;'), false);
    assert.equal(ui.isSafeSchemeUrl('mailto:'), false);
    assert.equal(ui.isSafeSchemeUrl(''), false);
    assert.equal(ui.isSafeSchemeUrl('   '), false);
    assert.equal(ui.isSafeSchemeUrl(null), false);
    assert.equal(ui.isSafeSchemeUrl(undefined), false);
    assert.equal(ui.isSafeSchemeUrl(12345), false);
})();

(function testFormatTime() {
    const ui = createManager();
    const now = Date.now();

    assert.equal(ui.formatTime(now - 10 * 1000), '刚刚');
    assert.equal(ui.formatTime(now - 5 * 60 * 1000), '5 分钟前');
    assert.equal(ui.formatTime(now - 3 * 3600 * 1000), '3 小时前');

    // 超过 24 小时回退为 MM-DD HH:mm
    assert.equal(ui.formatTime(new Date(2026, 0, 5, 9, 7).getTime()), '01-05 09:07');

    // 空值保护
    assert.equal(ui.formatTime(0), '');
    assert.equal(ui.formatTime(null), '');
    assert.equal(ui.formatTime(undefined), '');
})();

console.log('HistoryUIManager tests passed');
