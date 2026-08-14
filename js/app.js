/**
 * HQ 二维码生成器 - 主应用控制器 (Main Controller)
 */

(function (window) {
    'use strict';

    // State Variables
    let historyRecords = [];
    let activeRecordId = null;
    let autoPreviewTimer = null;
    let currentLogoImage = null;
    let cameraStream = null;
    let cameraScanInterval = null;
    let isCameraActive = false;

    // DOM Cache
    const DOM = {
        // Mode Tabs & Views
        tabGenerate: document.getElementById('tabGenerate'),
        tabDecode: document.getElementById('tabDecode'),
        generatorSection: document.getElementById('generatorSection'),
        decoderSection: document.getElementById('decoderSection'),

        // Camera Controls
        toggleCameraBtn: document.getElementById('toggleCameraBtn'),
        cameraBtnText: document.getElementById('cameraBtnText'),
        cameraViewport: document.getElementById('cameraViewport'),
        cameraVideo: document.getElementById('cameraVideo'),
        closeCameraBtn: document.getElementById('closeCameraBtn'),

        // Form Inputs
        qrContentInput: document.getElementById('qrContentInput'),
        qrTitleInput: document.getElementById('qrTitleInput'),
        fgColorInput: document.getElementById('fgColorInput'),
        fgHexInput: document.getElementById('fgHexInput'),
        bgColorInput: document.getElementById('bgColorInput'),
        bgHexInput: document.getElementById('bgHexInput'),
        eclSelect: document.getElementById('eclSelect'),
        cellSizeInput: document.getElementById('cellSizeInput'),
        cellSizeVal: document.getElementById('cellSizeVal'),
        marginInput: document.getElementById('marginInput'),
        marginVal: document.getElementById('marginVal'),
        charCounter: document.getElementById('charCounter'),
        clearContentBtn: document.getElementById('clearContentBtn'),

        // Logo Controls
        logoFileInput: document.getElementById('logoFileInput'),
        uploadLogoBtn: document.getElementById('uploadLogoBtn'),
        logoFileName: document.getElementById('logoFileName'),
        removeLogoBtn: document.getElementById('removeLogoBtn'),

        // Buttons
        generateBtn: document.getElementById('generateBtn'),
        resetFormBtn: document.getElementById('resetFormBtn'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),

        // Preview & Actions
        qrCanvasContainer: document.getElementById('qrCanvasContainer'),
        emptyPreview: document.getElementById('emptyPreview'),
        qrMetaInfo: document.getElementById('qrMetaInfo'),
        metaSizeTag: document.getElementById('metaSizeTag'),
        metaEclTag: document.getElementById('metaEclTag'),
        metaTimeTag: document.getElementById('metaTimeTag'),
        activeRecordTag: document.getElementById('activeRecordTag'),
        
        downloadPngBtn: document.getElementById('downloadPngBtn'),
        downloadSvgBtn: document.getElementById('downloadSvgBtn'),
        copyImageBtn: document.getElementById('copyImageBtn'),
        copyTextBtn: document.getElementById('copyTextBtn'),

        // Decoder Controls
        dropZone: document.getElementById('dropZone'),
        decodeFileInput: document.getElementById('decodeFileInput'),
        decodeResultCard: document.getElementById('decodeResultCard'),
        decodeResultText: document.getElementById('decodeResultText'),
        decodeTimeTag: document.getElementById('decodeTimeTag'),
        copyDecodeTextBtn: document.getElementById('copyDecodeTextBtn'),
        openDecodeUrlBtn: document.getElementById('openDecodeUrlBtn'),
        transferToEditBtn: document.getElementById('transferToEditBtn'),

        // History
        historySearchInput: document.getElementById('historySearchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        exportHistoryBtn: document.getElementById('exportHistoryBtn'),
        importHistoryBtn: document.getElementById('importHistoryBtn'),
        importFileInput: document.getElementById('importFileInput'),

        presetChips: document.querySelectorAll('.chip')
    };

    // --- 初始化入口 ---
    function init() {
        initTheme();
        bindEvents();
        updateCharCount();

        // 从 Storage 模块加载历史数据
        StorageManager.loadHistory((records) => {
            historyRecords = records || [];
            refreshHistoryUI();
        });

        // 检查右键菜单 URL 参数
        checkUrlQueryParams();
    }

    // --- 检查 URL 参数（响应右键菜单快捷生成）---
    function checkUrlQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const contentParam = params.get('content');
        const titleParam = params.get('title');
        const autoSaveParam = params.get('autoSave');

        if (contentParam) {
            switchMode('generate');
            DOM.qrContentInput.value = contentParam;
            if (titleParam) DOM.qrTitleInput.value = titleParam;
            updateCharCount();
            renderPreview(autoSaveParam === '1');
        }
    }

    // --- 模式切换（生成 vs 解码识别）---
    function switchMode(mode) {
        if (mode === 'generate') {
            stopCameraScan(); // 切换回生成模式时自动关闭摄像头释放资源
            DOM.tabGenerate.classList.add('active');
            DOM.tabDecode.classList.remove('active');
            DOM.generatorSection.style.display = 'block';
            DOM.decoderSection.style.display = 'none';
        } else {
            DOM.tabDecode.classList.add('active');
            DOM.tabGenerate.classList.remove('active');
            DOM.decoderSection.style.display = 'flex';
            DOM.generatorSection.style.display = 'none';
        }
    }

    // --- 摄像头实时扫描逻辑 ---
    async function startCameraScan() {
        if (isCameraActive) {
            stopCameraScan();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });

            cameraStream = stream;
            DOM.cameraVideo.srcObject = stream;
            DOM.cameraVideo.setAttribute('playsinline', true);
            await DOM.cameraVideo.play();

            isCameraActive = true;
            DOM.cameraViewport.style.display = 'flex';
            DOM.cameraBtnText.textContent = '关闭摄像头扫描';
            ToastManager.show('已开启摄像头，请将二维码放入对焦框中', 'info');

            // 启动实时帧扫描循环 (每 150ms 轮询检测一帧)
            clearInterval(cameraScanInterval);
            cameraScanInterval = setInterval(async () => {
                if (!isCameraActive || DOM.cameraVideo.paused || DOM.cameraVideo.ended) return;

                try {
                    const decodedText = await QREngine.decodeVideo(DOM.cameraVideo);
                    if (decodedText) {
                        stopCameraScan();
                        showDecodeResult(decodedText);
                        ToastManager.show('实时扫码识别成功！', 'success');
                    }
                } catch (e) {
                    // Ignore transient frame errors
                }
            }, 150);

        } catch (err) {
            console.error('Camera Access Error:', err);
            ToastManager.show('无法开启摄像头：' + (err.message || '权限被拒绝或设备无摄像头'), 'error');
            stopCameraScan();
        }
    }

    function stopCameraScan() {
        isCameraActive = false;
        clearInterval(cameraScanInterval);

        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }

        if (DOM.cameraVideo) {
            DOM.cameraVideo.srcObject = null;
        }

        if (DOM.cameraViewport) {
            DOM.cameraViewport.style.display = 'none';
        }
        if (DOM.cameraBtnText) {
            DOM.cameraBtnText.textContent = '开启摄像头扫描';
        }
    }

    // --- 主题控制 ---
    function initTheme() {
        const savedTheme = StorageManager.getTheme();
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.replace('theme-light', 'theme-dark');
        } else {
            document.body.classList.replace('theme-dark', 'theme-light');
        }
    }

    function toggleTheme() {
        const isDark = document.body.classList.contains('theme-dark');
        if (isDark) {
            document.body.classList.replace('theme-dark', 'theme-light');
            StorageManager.setTheme('light');
            ToastManager.show('已切换至浅色主题', 'info');
        } else {
            document.body.classList.replace('theme-light', 'theme-dark');
            StorageManager.setTheme('dark');
            ToastManager.show('已切换至深色主题', 'info');
        }
    }

    // --- 获取表单设置 ---
    function getFormValues() {
        return {
            content: DOM.qrContentInput.value.trim(),
            title: DOM.qrTitleInput.value.trim(),
            fgColor: DOM.fgColorInput.value || '#0f172a',
            bgColor: DOM.bgColorInput.value || '#ffffff',
            ecl: DOM.eclSelect.value || 'M',
            cellSize: parseInt(DOM.cellSizeInput.value, 10) || 8,
            margin: parseInt(DOM.marginInput.value, 10) || 4,
            logoImage: currentLogoImage
        };
    }

    // --- 实时预览渲染 ---
    function renderPreview(shouldSave = false) {
        const options = getFormValues();

        if (!options.content) {
            DOM.qrCanvasContainer.innerHTML = '';
            DOM.qrCanvasContainer.appendChild(DOM.emptyPreview);
            DOM.qrMetaInfo.style.display = 'none';
            toggleActionButtons(false);
            return null;
        }

        try {
            const { canvas } = QREngine.createCanvas(options);

            DOM.qrCanvasContainer.innerHTML = '';
            DOM.qrCanvasContainer.appendChild(canvas);

            DOM.metaSizeTag.textContent = `尺寸: ${canvas.width}×${canvas.height}px`;
            DOM.metaEclTag.textContent = `容错: ${options.logoImage ? 'H (30%)' : options.ecl + ' (' + QREngine.getEclPercentage(options.ecl) + ')'}`;
            DOM.metaTimeTag.textContent = `生成时间: ${new Date().toLocaleTimeString()}`;
            DOM.qrMetaInfo.style.display = 'flex';

            toggleActionButtons(true);

            if (shouldSave) {
                const record = saveRecord(options);
                activeRecordId = record.id;
                DOM.activeRecordTag.textContent = record.title || '记录已保存';
                refreshHistoryUI();
                ToastManager.show('已成功生成并保存到本地记录', 'success');
            } else if (!activeRecordId) {
                DOM.activeRecordTag.textContent = '实时预览';
            }

            return canvas;
        } catch (err) {
            console.error('QR Render Error:', err);
            ToastManager.show('生成二维码失败：' + (err.message || '内容过多或参数有误'), 'error');
            return null;
        }
    }

    function toggleActionButtons(enabled) {
        DOM.downloadPngBtn.disabled = !enabled;
        DOM.downloadSvgBtn.disabled = !enabled;
        DOM.copyImageBtn.disabled = !enabled;
        DOM.copyTextBtn.disabled = !enabled;
    }

    // --- 保存记录 ---
    function saveRecord(options) {
        const now = Date.now();
        let displayTitle = options.title;
        if (!displayTitle) {
            displayTitle = options.content.length > 20 ? options.content.substring(0, 20) + '...' : options.content;
        }

        const newRecord = {
            id: 'qr_' + now + '_' + Math.random().toString(36).substring(2, 7),
            title: displayTitle,
            content: options.content,
            fgColor: options.fgColor,
            bgColor: options.bgColor,
            ecl: options.logoImage ? 'H' : options.ecl,
            cellSize: options.cellSize,
            margin: options.margin,
            createdAt: now
        };

        historyRecords.unshift(newRecord);
        StorageManager.saveHistory(historyRecords);
        return newRecord;
    }

    // --- 刷新历史记录 UI ---
    function refreshHistoryUI() {
        HistoryUIManager.renderList(
            historyRecords,
            activeRecordId,
            DOM.historySearchInput.value,
            {
                onSelectRecord: selectHistoryRecord,
                onDeleteRecord: deleteRecord,
                onCopyContent: (content) => copyTextToClipboard(content)
            }
        );
    }

    // --- 选择并回显历史记录 ---
    function selectHistoryRecord(record) {
        switchMode('generate');
        activeRecordId = record.id;

        DOM.qrContentInput.value = record.content;
        DOM.qrTitleInput.value = record.title;
        DOM.fgColorInput.value = record.fgColor || '#0f172a';
        DOM.fgHexInput.value = record.fgColor || '#0f172a';
        DOM.bgColorInput.value = record.bgColor || '#ffffff';
        DOM.bgHexInput.value = record.bgColor || '#ffffff';
        DOM.eclSelect.value = record.ecl || 'M';
        DOM.cellSizeInput.value = record.cellSize || 8;
        DOM.cellSizeVal.textContent = (record.cellSize || 8) + 'px';
        DOM.marginInput.value = typeof record.margin !== 'undefined' ? record.margin : 4;
        DOM.marginVal.textContent = typeof record.margin !== 'undefined' ? record.margin : 4;

        updateCharCount();
        renderPreview(false);

        DOM.activeRecordTag.textContent = `已回显: ${record.title}`;
        refreshHistoryUI();
        ToastManager.show(`已回显历史记录："${record.title}"`, 'info');
    }

    function deleteRecord(id) {
        historyRecords = historyRecords.filter(item => item.id !== id);
        StorageManager.saveHistory(historyRecords);
        if (activeRecordId === id) {
            activeRecordId = null;
            DOM.activeRecordTag.textContent = '新建生成';
        }
        refreshHistoryUI();
        ToastManager.show('已删除该条记录', 'info');
    }

    function clearAllHistory() {
        if (historyRecords.length === 0) return;
        if (confirm('确定要清空全部本地历史生成记录吗？该操作不可撤销。')) {
            historyRecords = [];
            activeRecordId = null;
            StorageManager.saveHistory(historyRecords);
            refreshHistoryUI();
            DOM.activeRecordTag.textContent = '新建生成';
            ToastManager.show('已清空所有历史记录', 'info');
        }
    }

    // --- 解码与识别业务逻辑 ---
    function processDecodeFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            ToastManager.show('请选择有效的图片文件！', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    const resultText = await QREngine.decodeImage(img);
                    showDecodeResult(resultText);
                    ToastManager.show('二维码解析成功！', 'success');
                } catch (err) {
                    ToastManager.show(err.message || '未能在图片中解析出二维码', 'error');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function showDecodeResult(text) {
        DOM.decodeResultText.value = text;
        DOM.decodeTimeTag.textContent = new Date().toLocaleTimeString();
        DOM.decodeResultCard.style.display = 'flex';

        const isUrl = /^https?:\/\//i.test(text.trim());
        DOM.openDecodeUrlBtn.style.display = isUrl ? 'inline-flex' : 'none';
        if (isUrl) {
            DOM.openDecodeUrlBtn.onclick = () => window.open(text.trim(), '_blank');
        }
    }

    // --- 导出与剪贴板操作 ---
    function downloadPNG() {
        const canvas = DOM.qrCanvasContainer.querySelector('canvas');
        if (!canvas) {
            ToastManager.show('无法找到导出的二维码图', 'error');
            return;
        }
        const link = document.createElement('a');
        const fileName = `qrcode_${Date.now()}.png`;
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        ToastManager.show(`已下载 ${fileName}`, 'success');
    }

    function downloadSVG() {
        const options = getFormValues();
        if (!options.content) return;
        try {
            const svgString = QREngine.createSVG(options);
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const fileName = `qrcode_${Date.now()}.svg`;
            link.download = fileName;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            ToastManager.show(`已下载矢量格式 ${fileName}`, 'success');
        } catch (e) {
            ToastManager.show('导出 SVG 失败', 'error');
        }
    }

    function copyImageToClipboard() {
        const canvas = DOM.qrCanvasContainer.querySelector('canvas');
        if (!canvas) return;

        canvas.toBlob(blob => {
            if (!blob) return;
            if (navigator.clipboard && window.ClipboardItem) {
                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]).then(() => {
                    ToastManager.show('二维码图片已成功复制到剪贴板！', 'success');
                }).catch(() => {
                    ToastManager.show('复制图片失败', 'error');
                });
            } else {
                ToastManager.show('当前浏览器不支持直接复制图片', 'error');
            }
        }, 'image/png');
    }

    function copyTextToClipboard(textToCopy) {
        const text = textToCopy || DOM.qrContentInput.value;
        if (!text) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                ToastManager.show('文本内容已复制到剪贴板', 'success');
            }).catch(() => fallbackCopyText(text));
        } else {
            fallbackCopyText(text);
        }
    }

    function fallbackCopyText(text) {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        try {
            document.execCommand('copy');
            ToastManager.show('文本内容已复制到剪贴板', 'success');
        } catch (err) {
            ToastManager.show('复制失败', 'error');
        }
        document.body.removeChild(temp);
    }

    // --- 快捷预设 ---
    function applyPreset(presetType) {
        switch (presetType) {
            case 'url':
                DOM.qrContentInput.value = 'https://www.example.com';
                DOM.qrTitleInput.value = '演示网站链接';
                break;
            case 'wifi':
                DOM.qrContentInput.value = 'WIFI:S:HQ-Office-5G;T:WPA;P:Password8888;;';
                DOM.qrTitleInput.value = '办公室 Wi-Fi';
                break;
            case 'text':
                DOM.qrContentInput.value = '欢迎使用 HQ 二维码生成与本地管理工具！';
                DOM.qrTitleInput.value = '测试纯文本';
                break;
            case 'contact':
                DOM.qrContentInput.value = 'BEGIN:VCARD\nVERSION:3.0\nFN:李明\nTITLE:产品经理\nTEL:13800008888\nEMAIL:liming@example.com\nEND:VCARD';
                DOM.qrTitleInput.value = '个人电子名片';
                break;
        }
        updateCharCount();
        renderPreview(false);
        ToastManager.show('已载入快捷模板', 'info');
    }

    function updateCharCount() {
        DOM.charCounter.textContent = `字符数: ${DOM.qrContentInput.value.length}`;
    }

    // --- 事件绑定 ---
    function bindEvents() {
        // 模式切换 Tab
        DOM.tabGenerate.addEventListener('click', () => switchMode('generate'));
        DOM.tabDecode.addEventListener('click', () => switchMode('decode'));

        // 摄像头扫描事件
        DOM.toggleCameraBtn.addEventListener('click', startCameraScan);
        DOM.closeCameraBtn.addEventListener('click', stopCameraScan);

        // 主题切换
        DOM.themeToggleBtn.addEventListener('click', toggleTheme);

        // 文本输入实时防抖
        DOM.qrContentInput.addEventListener('input', () => {
            updateCharCount();
            activeRecordId = null;
            DOM.activeRecordTag.textContent = '实时预览';
            clearTimeout(autoPreviewTimer);
            autoPreviewTimer = setTimeout(() => renderPreview(false), 200);
        });

        DOM.qrTitleInput.addEventListener('input', () => activeRecordId = null);

        DOM.clearContentBtn.addEventListener('click', () => {
            DOM.qrContentInput.value = '';
            DOM.qrTitleInput.value = '';
            updateCharCount();
            activeRecordId = null;
            renderPreview(false);
        });

        // Logo 图片上传与移除
        DOM.uploadLogoBtn.addEventListener('click', () => DOM.logoFileInput.click());
        DOM.logoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = new Image();
                img.onload = () => {
                    currentLogoImage = img;
                    DOM.logoFileName.textContent = file.name;
                    DOM.removeLogoBtn.style.display = 'block';
                    DOM.eclSelect.value = 'H'; // 自动提高纠错至 H
                    renderPreview(false);
                    ToastManager.show('Logo 已载入（已自动调高容错率至 30%）', 'info');
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });

        DOM.removeLogoBtn.addEventListener('click', () => {
            currentLogoImage = null;
            DOM.logoFileInput.value = '';
            DOM.logoFileName.textContent = '未选择图片';
            DOM.removeLogoBtn.style.display = 'none';
            renderPreview(false);
            ToastManager.show('已移除中心 Logo', 'info');
        });

        // 颜色选择器
        DOM.fgColorInput.addEventListener('input', (e) => {
            DOM.fgHexInput.value = e.target.value;
            renderPreview(false);
        });
        DOM.fgHexInput.addEventListener('change', (e) => {
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                DOM.fgColorInput.value = e.target.value;
                renderPreview(false);
            }
        });

        DOM.bgColorInput.addEventListener('input', (e) => {
            DOM.bgHexInput.value = e.target.value;
            renderPreview(false);
        });
        DOM.bgHexInput.addEventListener('change', (e) => {
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                DOM.bgColorInput.value = e.target.value;
                renderPreview(false);
            }
        });

        DOM.eclSelect.addEventListener('change', () => renderPreview(false));
        
        DOM.cellSizeInput.addEventListener('input', (e) => {
            DOM.cellSizeVal.textContent = e.target.value + 'px';
            renderPreview(false);
        });

        DOM.marginInput.addEventListener('input', (e) => {
            DOM.marginVal.textContent = e.target.value;
            renderPreview(false);
        });

        DOM.generateBtn.addEventListener('click', () => {
            if (!DOM.qrContentInput.value.trim()) {
                ToastManager.show('请先输入二维码内容！', 'error');
                DOM.qrContentInput.focus();
                return;
            }
            renderPreview(true);
        });

        DOM.resetFormBtn.addEventListener('click', () => {
            DOM.qrContentInput.value = '';
            DOM.qrTitleInput.value = '';
            DOM.fgColorInput.value = '#0f172a';
            DOM.fgHexInput.value = '#0f172a';
            DOM.bgColorInput.value = '#ffffff';
            DOM.bgHexInput.value = '#ffffff';
            DOM.eclSelect.value = 'M';
            DOM.cellSizeInput.value = 8;
            DOM.cellSizeVal.textContent = '8px';
            DOM.marginInput.value = 4;
            DOM.marginVal.textContent = '4';
            currentLogoImage = null;
            DOM.logoFileInput.value = '';
            DOM.logoFileName.textContent = '未选择图片';
            DOM.removeLogoBtn.style.display = 'none';
            activeRecordId = null;
            updateCharCount();
            renderPreview(false);
            ToastManager.show('已重置所有设置选项', 'info');
        });

        // 导出与复制
        DOM.downloadPngBtn.addEventListener('click', downloadPNG);
        DOM.downloadSvgBtn.addEventListener('click', downloadSVG);
        DOM.copyImageBtn.addEventListener('click', copyImageToClipboard);
        DOM.copyTextBtn.addEventListener('click', () => copyTextToClipboard(DOM.qrContentInput.value));

        // 解码识别交互
        DOM.dropZone.addEventListener('click', () => DOM.decodeFileInput.click());
        DOM.decodeFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                processDecodeFile(e.target.files[0]);
            }
        });

        // 拖拽文件上传
        DOM.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            DOM.dropZone.classList.add('dragover');
        });
        DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('dragover'));
        DOM.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            DOM.dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                processDecodeFile(e.dataTransfer.files[0]);
            }
        });

        // 剪贴板粘贴识别 Ctrl+V / Cmd+V
        document.addEventListener('paste', (e) => {
            const items = (e.clipboardData || window.clipboardData).items;
            if (!items) return;
            for (let item of items) {
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const blob = item.getAsFile();
                    switchMode('decode');
                    processDecodeFile(blob);
                    e.preventDefault();
                    break;
                }
            }
        });

        // 解码结果按钮
        DOM.copyDecodeTextBtn.addEventListener('click', () => {
            copyTextToClipboard(DOM.decodeResultText.value);
        });

        DOM.transferToEditBtn.addEventListener('click', () => {
            const text = DOM.decodeResultText.value;
            if (!text) return;
            switchMode('generate');
            DOM.qrContentInput.value = text;
            updateCharCount();
            renderPreview(false);
            ToastManager.show('已导入生成器输入框', 'info');
        });

        // 预设芯片
        DOM.presetChips.forEach(chip => {
            chip.addEventListener('click', () => applyPreset(chip.dataset.preset));
        });

        // 历史搜索
        DOM.historySearchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            DOM.clearSearchBtn.style.display = val ? 'block' : 'none';
            refreshHistoryUI();
        });

        DOM.clearSearchBtn.addEventListener('click', () => {
            DOM.historySearchInput.value = '';
            DOM.clearSearchBtn.style.display = 'none';
            refreshHistoryUI();
        });

        DOM.clearHistoryBtn.addEventListener('click', clearAllHistory);

        DOM.exportHistoryBtn.addEventListener('click', () => {
            if (StorageManager.exportJSON(historyRecords)) {
                ToastManager.show('历史记录 JSON 已成功导出', 'success');
            } else {
                ToastManager.show('暂无历史记录可导出', 'info');
            }
        });

        DOM.importHistoryBtn.addEventListener('click', () => DOM.importFileInput.click());
        DOM.importFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                StorageManager.importJSON(e.target.files[0], (err, imported) => {
                    if (err) {
                        ToastManager.show('解析 JSON 文件失败: ' + err.message, 'error');
                        return;
                    }
                    let count = 0;
                    imported.forEach(item => {
                        if (item.content && !historyRecords.some(r => r.id === item.id)) {
                            historyRecords.push(item);
                            count++;
                        }
                    });
                    historyRecords.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                    StorageManager.saveHistory(historyRecords);
                    refreshHistoryUI();
                    ToastManager.show(`成功导入 ${count} 条历史记录`, 'success');
                });
                e.target.value = '';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
