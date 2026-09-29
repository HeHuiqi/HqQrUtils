'use strict';

/**
 * 测试聚合运行器 (Test Runner)
 *
 * 依次在当前 Node 进程中加载 test/ 目录下的全部 *.test.js 文件；
 * 每个测试文件在被加载时同步执行断言（基于 node:assert/strict + node:vm），
 * 无需浏览器、模拟器或网络环境，也无需任何第三方依赖。
 *
 * 用法: npm test  |  node test/run-tests.js
 */

const fs = require('node:fs');
const path = require('node:path');

const testDir = __dirname;
const testFiles = fs.readdirSync(testDir)
    .filter((name) => name.endsWith('.test.js'))
    .sort();

if (testFiles.length === 0) {
    console.error('❌ 未找到任何测试文件 (*.test.js)');
    process.exit(1);
}

console.log(`🔍 共发现 ${testFiles.length} 个测试文件：${testFiles.join(', ')}\n`);

testFiles.forEach((file) => {
    require(path.join(testDir, file));
});

console.log(`\n✅ 全部测试通过 (${testFiles.length} 个文件)`);
