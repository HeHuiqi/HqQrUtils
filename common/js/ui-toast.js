/**
 * Toast 提示框 UI 模块 (ToastManager)
 */

(function (window) {
    'use strict';

    const ToastManager = {
        show(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;

            const iconSpan = document.createElement('span');
            iconSpan.textContent = iconHtml;
            const msgSpan = document.createElement('span');
            msgSpan.textContent = message;

            toast.appendChild(iconSpan);
            toast.appendChild(document.createTextNode(' '));
            toast.appendChild(msgSpan);
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(1rem)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 2600);
        }
    };

    window.ToastManager = ToastManager;

})(window);
