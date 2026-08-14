/**
 * Chrome Extension Background Service Worker
 */

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generate_qr_selection",
    title: "为选中文本 \"%s\" 生成二维码",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "generate_qr_link",
    title: "为此链接生成二维码",
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "generate_qr_page",
    title: "为当前页面网址生成二维码",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let targetUrl = "";
  let title = "";

  if (info.menuItemId === "generate_qr_selection") {
    targetUrl = info.selectionText;
    title = "选中文本二维码";
  } else if (info.menuItemId === "generate_qr_link") {
    targetUrl = info.linkUrl;
    title = "链接二维码";
  } else if (info.menuItemId === "generate_qr_page") {
    targetUrl = info.pageUrl || tab.url;
    title = tab.title || "网页二维码";
  }

  if (targetUrl) {
    const appUrl = chrome.runtime.getURL(`index.html?content=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(title)}&autoSave=1`);
    chrome.tabs.create({ url: appUrl });
  }
});
