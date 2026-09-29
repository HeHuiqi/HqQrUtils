'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'common', 'js', 'qr-engine.js'),
    'utf8'
);

function createEngine() {
    const sandbox = { console };
    sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, { filename: 'qr-engine.js' });
    return sandbox.QREngine;
}

(function testEclPercentage() {
    const engine = createEngine();

    assert.equal(engine.getEclPercentage('L'), '7%');
    assert.equal(engine.getEclPercentage('M'), '15%');
    assert.equal(engine.getEclPercentage('Q'), '25%');
    assert.equal(engine.getEclPercentage('H'), '30%');

    // 未知/非标准取值统一回退为 M (15%)，避免渲染出非法容错等级
    assert.equal(engine.getEclPercentage('m'), '15%');
    assert.equal(engine.getEclPercentage('Z'), '15%');
    assert.equal(engine.getEclPercentage(''), '15%');
    assert.equal(engine.getEclPercentage(undefined), '15%');
    assert.equal(engine.getEclPercentage(null), '15%');
})();

console.log('QREngine tests passed');
