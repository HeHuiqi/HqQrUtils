/**
 * 二维码生成引擎与图像解码封装模块 (QREngine)
 */

(function (window) {
    'use strict';

    const QREngine = {
        /**
         * 生成 Canvas 画布格式的二维码（支持中心嵌入 Logo）
         */
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

            // 如果嵌入了 Logo，自动强行提升容错率为 H (30%) 保证扫描识别率
            if (logoImage) {
                ecl = 'H';
            }

            const qr = qrcode(0, ecl);
            qr.addData(content);
            qr.make();

            const canvas = qr.createCanvas(cellSize, margin, fgColor, bgColor);

            // 如果提供了 Logo 图像，将其绘制在 Canvas 居中位置
            if (logoImage && logoImage.complete && logoImage.naturalWidth !== 0) {
                const ctx = canvas.getContext('2d');
                const canvasSize = canvas.width;
                const logoSize = Math.floor(canvasSize * logoSizePercent);
                const x = (canvasSize - logoSize) / 2;
                const y = (canvasSize - logoSize) / 2;
                const padding = 6;

                // 1. 绘制带有背景色的圆角隔离块
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

                // 2. 绘制微弱精致轮廓边框
                ctx.strokeStyle = fgColor;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // 3. 居中绘制 Logo 图片
                ctx.drawImage(logoImage, x, y, logoSize, logoSize);
            }

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
         * 解码/识别图片或 Canvas 中的二维码内容
         * @param {HTMLImageElement | HTMLCanvasElement} imageElement 图像源对象
         * @returns {Promise<string>} 解码出的字符串内容
         */
        async decodeImage(imageElement) {
            // 1. 优先尝试浏览器原生 BarcodeDetector API (速度最快，原生支持)
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

            // 2. 回退使用 Canvas jsQR 图像像素深度分析
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

        /**
         * 实时检测视频流 (<video> 元素) 中的二维码
         * @param {HTMLVideoElement} videoElement
         * @returns {Promise<string | null>} 识别出的字符串或 null
         */
        async decodeVideo(videoElement) {
            if (!videoElement || videoElement.readyState < 2) return null;

            // 1. 优先尝试原生 BarcodeDetector (硬件极速级)
            if ('BarcodeDetector' in window) {
                try {
                    const detector = new BarcodeDetector({ formats: ['qr_code'] });
                    const results = await detector.detect(videoElement);
                    if (results && results.length > 0) {
                        return results[0].rawValue;
                    }
                } catch (e) {
                    // 降级回退
                }
            }

            // 2. 回退使用 jsQR 逐帧分析
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
