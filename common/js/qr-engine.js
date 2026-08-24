/**
 * 二维码生成引擎与图像解码封装模块 (QREngine)
 * 具备多尺度图像降采样、原生 BarcodeDetector 与 jsQR 降级解算能力
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
         * 解码/识别图片或 Canvas 中的二维码内容 (支持多尺度自动按比例缩放，适配高像素手机相册大图)
         * @param {HTMLImageElement | HTMLCanvasElement} imageElement 图像源对象
         * @returns {Promise<string>} 解码出的字符串内容
         */
        async decodeImage(imageElement) {
            // 1. 优先尝试浏览器原生 BarcodeDetector API (系统硬件级)
            if ('BarcodeDetector' in window) {
                try {
                    const detector = new BarcodeDetector({ formats: ['qr_code'] });
                    const results = await detector.detect(imageElement);
                    if (results && results.length > 0 && results[0].rawValue) {
                        return results[0].rawValue;
                    }
                } catch (e) {
                    console.warn('Native BarcodeDetector detect failed, falling back to jsQR:', e);
                }
            }

            // 2. jsQR 深度识别 (多尺度降采样，解决手机相册 12MP+ 高清大图解算卡顿与识别失败问题)
            if (typeof jsQR !== 'undefined') {
                const srcWidth = imageElement.naturalWidth || imageElement.width || 300;
                const srcHeight = imageElement.naturalHeight || imageElement.height || 300;

                // 多尺度算法：优先使用 800px 最佳解码尺寸，随后回退至原图或安全上限尺寸 (最高 2000px，防止 4K+ 原图 OOM)
                const MAX_SAFE_DIM = 2000;
                const naturalMax = Math.max(srcWidth, srcHeight);
                const safeMax = Math.min(naturalMax, MAX_SAFE_DIM);
                const targetSizes = naturalMax > 800 ? [800, safeMax] : [naturalMax];

                for (const maxDim of targetSizes) {
                    let width = srcWidth;
                    let height = srcHeight;

                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imageElement, 0, 0, width, height);

                    const imageData = ctx.getImageData(0, 0, width, height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: 'attemptBoth'
                    });

                    if (code && code.data) {
                        return code.data;
                    }
                }
            }

            throw new Error('未能在图片中识别出二维码，请确保图片清晰或重新截图选择');
        },

        /**
         * 实时检测视频流 (<video> 元素) 中的二维码 (极速 640px 帧降采样)
         * @param {HTMLVideoElement} videoElement
         * @returns {Promise<string | null>} 识别出的字符串或 null
         */
        async decodeVideo(videoElement) {
            if (!videoElement || videoElement.readyState < 2) return null;

            const videoWidth = videoElement.videoWidth;
            const videoHeight = videoElement.videoHeight;
            if (!videoWidth || !videoHeight) return null;

            // 1. 优先尝试原生 BarcodeDetector
            if ('BarcodeDetector' in window) {
                try {
                    const detector = new BarcodeDetector({ formats: ['qr_code'] });
                    const results = await detector.detect(videoElement);
                    if (results && results.length > 0 && results[0].rawValue) {
                        return results[0].rawValue;
                    }
                } catch (e) {}
            }

            // 2. jsQR 640px 降采样高帧率分析 (在安卓手机上实现 15ms/帧 极速响应)
            if (typeof jsQR !== 'undefined') {
                const maxDim = 640;
                let width = videoWidth;
                let height = videoHeight;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoElement, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert'
                });

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
