/**
 * Toast 提示框 UI 模块 (ToastManager) - Common
 */

(function (window) {
    'use strict';

    const ToastManager = {
        show(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;

            let iconHtml = 'ℹ️';
            if (type === 'success') iconHtml = '✅';
            if (type === 'error') iconHtml = '⚠️';

            toast.innerHTML = `<span>${iconHtml}</span> <span>${message}</span>`;
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
