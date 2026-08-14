/**
 * 历史记录 UI 管理模块 (HistoryUIManager)
 */

(function (window) {
    'use strict';

    const HistoryUIManager = {
        /**
         * 渲染历史记录列表
         * @param {Array} records 记录列表
         * @param {String} activeRecordId 当前激活的 ID
         * @param {String} filterKeyword 搜索关键词
         * @param {Object} handlers 事件回调 { onSelectRecord, onDeleteRecord, onCopyContent }
         */
        renderList(records, activeRecordId, filterKeyword, handlers) {
            const listEl = document.getElementById('historyList');
            const emptyEl = document.getElementById('emptyHistory');
            const countTextEl = document.getElementById('historyCountText');

            if (!listEl) return;

            const keyword = (filterKeyword || '').toLowerCase().trim();
            const filtered = records.filter(item => {
                if (!keyword) return true;
                return (item.title && item.title.toLowerCase().includes(keyword)) ||
                       (item.content && item.content.toLowerCase().includes(keyword));
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
            card.className = `history-item ${isActive ? 'active' : ''}`;
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
            title.textContent = record.title || record.content;

            const snippet = document.createElement('div');
            snippet.className = 'history-content-snippet';
            snippet.textContent = record.content;

            const meta = document.createElement('div');
            meta.className = 'history-meta';
            meta.innerHTML = `
                <span>${HistoryUIManager.formatTime(record.createdAt)}</span>
                <span>·</span>
                <span>容错 ${record.ecl || 'M'}</span>
            `;

            details.appendChild(title);
            details.appendChild(snippet);
            details.appendChild(meta);

            // 操作
            const actions = document.createElement('div');
            actions.className = 'history-actions';

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

            actions.appendChild(copyBtn);
            actions.appendChild(deleteBtn);

            card.appendChild(thumbContainer);
            card.appendChild(details);
            card.appendChild(actions);

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
        }
    };

    window.HistoryUIManager = HistoryUIManager;

})(window);
