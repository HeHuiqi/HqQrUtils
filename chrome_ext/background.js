// Chrome Extension Background Service Worker

// 插件安装/更新时注册右键菜单
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'qr_gen_page',
        title: '为当前页面网址生成二维码',
        contexts: ['page']
    });

    chrome.contextMenus.create({
        id: 'qr_gen_selection',
        title: '为选中文本 "%s" 生成二维码',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: 'qr_gen_link',
        title: '为此链接生成二维码',
        contexts: ['link']
    });
});

// 点击右键菜单回调
chrome.contextMenus.onClicked.addListener((info) => {
    let content = '';
    let title = '';

    if (info.menuItemId === 'qr_gen_selection' && info.selectionText) {
        content = info.selectionText;
        title = '选中文本';
    } else if (info.menuItemId === 'qr_gen_link' && info.linkUrl) {
        content = info.linkUrl;
        title = '网页链接';
    } else if (info.menuItemId === 'qr_gen_page' && info.pageUrl) {
        content = info.pageUrl;
        title = '网页地址';
    }

    if (content) {
        const targetUrl = chrome.runtime.getURL(`index.html?content=${encodeURIComponent(content)}&title=${encodeURIComponent(title)}&autoSave=1`);
        chrome.tabs.create({ url: targetUrl });
    }
});

// 点击扩展图标回调
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: chrome.runtime.getURL('index.html')
    });
});
