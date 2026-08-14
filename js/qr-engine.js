/**
 * 二维码生成引擎封装模块 (QREngine)
 */

(function (window) {
    'use strict';

    const QREngine = {
        /**
         * 生成 Canvas 画布格式的二维码
         */
        createCanvas(options) {
            const { content, ecl = 'M', cellSize = 8, margin = 4, fgColor = '#000000', bgColor = '#ffffff' } = options;

            if (typeof qrcode === 'undefined') {
                throw new Error('QRCode 引擎未初始化加载');
            }

            // typeNumber = 0 表示自动决定纠错矩阵大小
            const qr = qrcode(0, ecl);
            qr.addData(content);
            qr.make();

            const canvas = qr.createCanvas(cellSize, margin, fgColor, bgColor);
            return { canvas, qr };
        },

        /**
         * 生成 SVG 矢量格式的二维码标签
         */
        createSVG(options) {
            const { content, ecl = 'M', cellSize = 8, margin = 4, fgColor = '#000000', bgColor = '#ffffff' } = options;
            const qr = qrcode(0, ecl);
            qr.addData(content);
            qr.make();
            return qr.createSvgTag(cellSize, margin, fgColor, bgColor);
        },

        /**
         * 获取容错百分比说明
         */
        getEclPercentage(ecl) {
            switch (ecl) {
                case 'L': return '7%';
                case 'M': return '15%';
                case 'Q': return '25%';
                case 'H': return '30%';
                default: return '15%';
            }
        }
    };

    window.QREngine = QREngine;

})(window);
