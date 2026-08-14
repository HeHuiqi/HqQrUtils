/**
 * 二维码生成引擎与图像解码封装模块 (QREngine) - Common
 */

(function (window) {
    'use strict';

    const QREngine = {
        createCanvas(options) {
            let {
                content,
                ecl = 'M',
                cellSize = 8,
                margin = 4,
                fgColor = '#000000',
                bgColor = '#ffffff',
                logoImage = null,
                logoSizePercent = 0.22
            } = options;

            if (typeof qrcode === 'undefined') {
                throw new Error('QRCode 引擎未初始化加载');
            }

            if (logoImage) {
                ecl = 'H';
            }

            const qr = qrcode(0, ecl);
            qr.addData(content);
            qr.make();

            const canvas = qr.createCanvas(cellSize, margin, fgColor, bgColor);

            if (logoImage && logoImage.complete && logoImage.naturalWidth !== 0) {
                const ctx = canvas.getContext('2d');
                const canvasSize = canvas.width;
                const logoSize = Math.floor(canvasSize * logoSizePercent);
                const x = (canvasSize - logoSize) / 2;
                const y = (canvasSize - logoSize) / 2;
                const padding = 6;

                ctx.fillStyle = bgColor;
                const rx = x - padding / 2;
                const ry = y - padding / 2;
                const rw = logoSize + padding;
                const rh = logoSize + padding;
                const radius = 8;

                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(rx, ry, rw, rh, radius);
                } else {
                    ctx.rect(rx, ry, rw, rh);
                }
                ctx.fill();

                ctx.strokeStyle = fgColor;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.drawImage(logoImage, x, y, logoSize, logoSize);
            }

            return { canvas, qr };
        },

        createSVG(options) {
            const { content, ecl = 'M', cellSize = 8, margin = 4, fgColor = '#000000', bgColor = '#ffffff' } = options;
            const qr = qrcode(0, ecl);
            qr.addData(content);
            qr.make();
            return qr.createSvgTag(cellSize, margin, fgColor, bgColor);
        },

        async decodeImage(imageElement) {
            if ('BarcodeDetector' in window) {
                try {
                    const detector = new BarcodeDetector({ formats: ['qr_code'] });
                    const results = await detector.detect(imageElement);
                    if (results && results.length > 0) {
                        return results[0].rawValue;
                    }
                } catch (e) {
                    console.warn('Native BarcodeDetector detect error:', e);
                }
            }

            if (typeof jsQR !== 'undefined') {
                const canvas = document.createElement('canvas');
                const width = imageElement.naturalWidth || imageElement.width || 300;
                const height = imageElement.naturalHeight || imageElement.height || 300;
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(imageElement, 0, 0, width, height);
                
                const imageData = ctx.getImageData(0, 0, width, height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                    return code.data;
                }
            }

            throw new Error('未能在图片中识别出二维码，请确保图片清晰度或调整图片方向');
        },

        async decodeVideo(videoElement) {
            if (!videoElement || videoElement.readyState < 2) return null;

            if ('BarcodeDetector' in window) {
                try {
                    const detector = new BarcodeDetector({ formats: ['qr_code'] });
                    const results = await detector.detect(videoElement);
                    if (results && results.length > 0) {
                        return results[0].rawValue;
                    }
                } catch (e) {}
            }

            if (typeof jsQR !== 'undefined' && videoElement.videoWidth > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                    return code.data;
                }
            }

            return null;
        },

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
