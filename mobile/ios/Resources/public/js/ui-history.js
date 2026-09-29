/**
 * 历史记录 UI 管理模块 (HistoryUIManager) - 支持星标收藏与分类筛选
 */

(function (window) {
    'use strict';

    const CATEGORY_NAMES = {
        work: '💼 工作',
        personal: '👤 个人',
        network: '📶 网络',
        test: '🧪 测试'
    };

    const HistoryUIManager = {
        /**
         * 渲染历史记录列表
         * @param {Array} records 记录列表
         * @param {String} activeRecordId 当前激活的 ID
         * @param {String} filterKeyword 搜索关键词
         * @param {String} currentCategory 当前选中的分类 ('all' | 'favorite' | 'work' | ...)
         * @param {Object} handlers 事件回调 { onSelectRecord, onDeleteRecord, onCopyContent, onToggleFavorite }
         */
        renderList(records, activeRecordId, filterKeyword, currentCategory, handlers) {
            const listEl = document.getElementById('historyList');
            const emptyEl = document.getElementById('emptyHistory');
            const countTextEl = document.getElementById('historyCountText');

            if (!listEl) return;

            const keyword = (filterKeyword || '').toLowerCase().trim();

            // 1. 过滤算法
            let filtered = records.filter(item => {
                // 关键词搜索
                const matchKeyword = !keyword ||
                    (item.title && item.title.toLowerCase().includes(keyword)) ||
                    (item.content && item.content.toLowerCase().includes(keyword));

                if (!matchKeyword) return false;

                // 分类与星标筛选
                if (currentCategory === 'favorite') {
                    return !!item.isFavorite;
                } else if (currentCategory && currentCategory !== 'all') {
                    return item.category === currentCategory;
                }
                return true;
            });

            // 2. 排序策略：星标收藏置顶 (isFavorite)，其次按时间最新排序
            filtered.sort((a, b) => {
                const favA = a.isFavorite ? 1 : 0;
                const favB = b.isFavorite ? 1 : 0;
                if (favA !== favB) return favB - favA;
                return (b.createdAt || 0) - (a.createdAt || 0);
            });

            listEl.innerHTML = '';

            if (filtered.length === 0) {
                emptyEl.style.display = 'flex';
                listEl.style.display = 'none';
            } else {
                emptyEl.style.display = 'none';
                listEl.style.display = 'flex';

                filtered.forEach(record => {
                    const itemCard = HistoryUIManager.createItemCard(record, activeRecordId === record.id, handlers);
                    listEl.appendChild(itemCard);
                });
            }

            if (countTextEl) {
                countTextEl.textContent = `已保存 ${records.length} 条记录`;
            }
        },

        /**
         * 创建单条历史卡片 DOM 节点
         */
        createItemCard(record, isActive, handlers) {
            const card = document.createElement('div');
            card.className = `history-item ${isActive ? 'active' : ''} ${record.isFavorite ? 'favorite-item' : ''}`;
            card.dataset.id = record.id;

            // 缩略图
            const thumbContainer = document.createElement('div');
            thumbContainer.className = 'history-thumb';
            try {
                const { canvas } = QREngine.createCanvas({
                    content: record.content,
                    ecl: record.ecl || 'M',
                    cellSize: 2,
                    margin: 1,
                    fgColor: record.fgColor || '#000000',
                    bgColor: record.bgColor || '#ffffff'
                });
                thumbContainer.appendChild(canvas);
            } catch (e) {
                thumbContainer.innerHTML = '🔳';
            }

            // 详情
            const details = document.createElement('div');
            details.className = 'history-details';

            const title = document.createElement('div');
            title.className = 'history-title';
            
            const titleText = document.createElement('span');
            titleText.textContent = record.title || record.content;
            title.appendChild(titleText);

            // 分类 Pill 标签
            if (record.category && record.category !== 'none' && CATEGORY_NAMES[record.category]) {
                const catPill = document.createElement('span');
                catPill.className = 'cat-badge-pill';
                catPill.textContent = CATEGORY_NAMES[record.category];
                title.appendChild(catPill);
            }

            const snippet = document.createElement('div');
            snippet.className = 'history-content-snippet';
            snippet.textContent = record.content;

            const meta = document.createElement('div');
            meta.className = 'history-meta';
            const timeSpan = document.createElement('span');
            timeSpan.textContent = HistoryUIManager.formatTime(record.createdAt);
            const dotSpan = document.createElement('span');
            dotSpan.textContent = '·';
            const eclSpan = document.createElement('span');
            const safeEcl = ['L', 'M', 'Q', 'H'].includes((record.ecl || '').toUpperCase()) ? (record.ecl || '').toUpperCase() : 'M';
            eclSpan.textContent = `容错 ${safeEcl}`;
            meta.appendChild(timeSpan);
            meta.appendChild(dotSpan);
            meta.appendChild(eclSpan);

            details.appendChild(title);
            details.appendChild(snippet);
            details.appendChild(meta);

            // 右侧容器（包含右上角“打开”按钮与垂直居中的操作按钮组）
            const rightWrapper = document.createElement('div');
            rightWrapper.className = 'history-right-wrapper';

            // 检查文本是否为安全的协议链接（支持 http/https 及 voghion://, alipays://, weixin://, intent:// 等自定义 App Scheme，严格拦截 javascript:/data:/file: 等危险伪协议）
            if (HistoryUIManager.isSafeSchemeUrl(record.content)) {
                const openLink = document.createElement('a');
                openLink.className = 'history-open-btn-top';
                openLink.href = record.content.trim();
                openLink.target = '_blank';
                openLink.rel = 'noopener noreferrer';
                openLink.title = `打开链接协议: ${record.content.trim()}`;
                openLink.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    <span>打开</span>
                `;
                openLink.addEventListener('click', (e) => {
                    e.stopPropagation(); // 仅阻止父级卡片的选择回显事件，保留原生的 <a> 标签 href 导航
                });
                rightWrapper.appendChild(openLink);
            }

            // 操作按钮区 (垂直居中：收藏、复制、删除)
            const actions = document.createElement('div');
            actions.className = 'history-actions';

            // ⭐ 星标收藏按钮
            const starBtn = document.createElement('button');
            starBtn.className = `item-action-btn star ${record.isFavorite ? 'starred' : ''}`;
            starBtn.title = record.isFavorite ? '取消收藏' : '星标收藏置顶';
            starBtn.innerHTML = record.isFavorite ? '★' : '☆';
            starBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (handlers.onToggleFavorite) handlers.onToggleFavorite(record.id);
            });

            // 快捷复制文本按钮
            const copyBtn = document.createElement('button');
            copyBtn.className = 'item-action-btn';
            copyBtn.title = '复制文本';
            copyBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
            `;
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (handlers.onCopyContent) handlers.onCopyContent(record.content);
            });

            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'item-action-btn delete';
            deleteBtn.title = '删除记录';
            deleteBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            `;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (handlers.onDeleteRecord) handlers.onDeleteRecord(record.id);
            });

            actions.appendChild(starBtn);
            actions.appendChild(copyBtn);
            actions.appendChild(deleteBtn);
            rightWrapper.appendChild(actions);

            card.appendChild(thumbContainer);
            card.appendChild(details);
            card.appendChild(rightWrapper);

            // 点击查看回显
            card.addEventListener('click', () => {
                if (handlers.onSelectRecord) handlers.onSelectRecord(record);
            });

            return card;
        },

        /**
         * 相对时间格式化
         */
        formatTime(timestamp) {
            if (!timestamp) return '';
            const d = new Date(timestamp);
            const now = new Date();
            const diffSec = Math.floor((now - d) / 1000);

            if (diffSec < 60) return '刚刚';
            if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
            if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`;

            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${month}-${day} ${hours}:${minutes}`;
        },

        /**
         * 校验文本是否为安全的协议 URL (支持 http/https 及合法的自定义 App Scheme，严格拦截可执行与危险伪协议)
         */
        isSafeSchemeUrl(content) {
            if (!content || typeof content !== 'string') return false;
            const trimmed = content.trim();
            if (!trimmed.includes('://')) return false;

            // 严格拦截可执行、本地敏感或浏览器内部伪协议
            const dangerousPattern = /^(javascript|data|vbscript|file|about|blob|chrome|resource):/i;
            if (dangerousPattern.test(trimmed)) return false;

            // 必须以合法 Scheme 语法开头：[a-zA-Z][a-zA-Z0-9+.-]*://
            return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
        }
    };

    window.HistoryUIManager = HistoryUIManager;

})(window);
