//
//  QRScannerViewController.swift
//  HqQrUtils - iOS Camera QR Scanner (AVFoundation + Vision)
//
//  功能：
//  1. 使用 AVFoundation 实时扫描二维码/条码
//  2. 权限动态检测与引导（相机 + 相册）
//  3. 支持手电筒开关
//  4. 支持从相册选取图片识别 (PHPicker + Vision VNDetectBarcodesRequest)
//  5. 扫描成功后保存到本地数据库并回调 Web 层
//

import AVFoundation
import UIKit
import PhotosUI
import Photos
import Vision

// MARK: - Scan Result Callback Type

typealias ScanResultHandler = (String, String, Int64) -> Void

class QRScannerViewController: UIViewController {

    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private let scanOverlay = ScanOverlayViewIOS()
    private var isTorchOn = false
    private let scanHandler: ScanResultHandler
    private let metadataOutput = AVCaptureMetadataOutput()
    private var isSessionConfigured = false

    init(scanHandler: @escaping ScanResultHandler) {
        self.scanHandler = scanHandler
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        setupUI()
        checkCameraPermissionAndSetup()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
        scanOverlay.frame = view.bounds
        scanOverlay.setNeedsDisplay()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        startScanning()
    }

    override func viewWillDisappear(_ animated: Bool) {
        stopScanning()
        super.viewWillDisappear(animated)
    }

    // MARK: - Camera Permission & Setup

    private func checkCameraPermissionAndSetup() {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .authorized:
            setupCamera()
            startScanning()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.setupCamera()
                        self?.startScanning()
                    } else {
                        self?.showPermissionAlert(title: "需要相机权限", message: "请在系统“设置”中允许 HQ二维码 访问相机，以便扫描二维码/条码。")
                    }
                }
            }
        case .denied, .restricted:
            showPermissionAlert(title: "相机权限未开启", message: "请在系统“设置”中开启相机权限，以便扫描二维码。")
        @unknown default:
            break
        }
    }

    private func setupCamera() {
        guard !isSessionConfigured else { return }

        let session = AVCaptureSession()
        captureSession = session

        guard let captureDevice = AVCaptureDevice.default(for: .video) else {
            showError("当前设备不支持相机或无法检测到相机")
            return
        }

        let videoInput: AVCaptureDeviceInput
        do {
            videoInput = try AVCaptureDeviceInput(device: captureDevice)
        } catch {
            showError("无法访问相机: \(error.localizedDescription)")
            return
        }

        if session.canAddInput(videoInput) {
            session.addInput(videoInput)
        } else {
            showError("无法初始化相机画面输入")
            return
        }

        // 配置元数据输出 (扫描二维码/条码)
        if session.canAddOutput(metadataOutput) {
            session.addOutput(metadataOutput)
            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = [
                .qr, .code128, .ean13, .ean8, .upce, .pdf417,
                .aztec, .dataMatrix, .code39, .code93
            ]
        }

        // 将预览图层挂载到 view 最底层
        if let preview = previewLayer {
            preview.session = session
        } else {
            let preview = AVCaptureVideoPreviewLayer(session: session)
            preview.frame = view.bounds
            preview.videoGravity = .resizeAspectFill
            view.layer.insertSublayer(preview, at: 0)
            previewLayer = preview
        }

        isSessionConfigured = true
    }

    private func setupUI() {
        // 1. 扫描框覆盖层
        scanOverlay.frame = view.bounds
        view.addSubview(scanOverlay)

        // 2. 顶部导航栏 (关闭按钮 + 标题)
        let topBar = UIView()
        topBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topBar)

        let titleLabel = UILabel()
        titleLabel.text = "扫一扫"
        titleLabel.textColor = .white
        titleLabel.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        topBar.addSubview(titleLabel)

        let closeBtn = UIButton(type: .system)
        closeBtn.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeBtn.tintColor = UIColor.white.withAlphaComponent(0.8)
        closeBtn.translatesAutoresizingMaskIntoConstraints = false
        closeBtn.addTarget(self, action: #selector(closeScanner), for: .touchUpInside)
        topBar.addSubview(closeBtn)

        let historyTopBtn = UIButton(type: .system)
        historyTopBtn.setImage(UIImage(systemName: "clock.arrow.circlepath"), for: .normal)
        historyTopBtn.tintColor = UIColor.white.withAlphaComponent(0.9)
        historyTopBtn.translatesAutoresizingMaskIntoConstraints = false
        historyTopBtn.addTarget(self, action: #selector(openHistory), for: .touchUpInside)
        topBar.addSubview(historyTopBtn)

        NSLayoutConstraint.activate([
            topBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            topBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topBar.heightAnchor.constraint(equalToConstant: 44),

            titleLabel.centerXAnchor.constraint(equalTo: topBar.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),

            closeBtn.leadingAnchor.constraint(equalTo: topBar.leadingAnchor, constant: 16),
            closeBtn.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            closeBtn.widthAnchor.constraint(equalToConstant: 32),
            closeBtn.heightAnchor.constraint(equalToConstant: 32),

            historyTopBtn.trailingAnchor.constraint(equalTo: topBar.trailingAnchor, constant: -16),
            historyTopBtn.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            historyTopBtn.widthAnchor.constraint(equalToConstant: 32),
            historyTopBtn.heightAnchor.constraint(equalToConstant: 32)
        ])

        // 3. 底部控制栏 (手电筒 + 相册选择 + 历史记录)
        let bottomBar = UIView()
        bottomBar.backgroundColor = UIColor.black.withAlphaComponent(0.4)
        bottomBar.layer.cornerRadius = 28
        bottomBar.layer.masksToBounds = true
        bottomBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bottomBar)

        let toolbar = UIStackView()
        toolbar.axis = .horizontal
        toolbar.distribution = .equalSpacing
        toolbar.alignment = .center
        toolbar.spacing = 40
        toolbar.translatesAutoresizingMaskIntoConstraints = false
        bottomBar.addSubview(toolbar)

        NSLayoutConstraint.activate([
            bottomBar.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            bottomBar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            bottomBar.heightAnchor.constraint(equalToConstant: 56),

            toolbar.topAnchor.constraint(equalTo: bottomBar.topAnchor),
            toolbar.bottomAnchor.constraint(equalTo: bottomBar.bottomAnchor),
            toolbar.leadingAnchor.constraint(equalTo: bottomBar.leadingAnchor, constant: 28),
            toolbar.trailingAnchor.constraint(equalTo: bottomBar.trailingAnchor, constant: -28)
        ])

        // 手电筒按钮
        let torchBtn = UIButton(type: .system)
        torchBtn.setImage(UIImage(systemName: "flashlight.off.fill"), for: .normal)
        torchBtn.tintColor = .white
        torchBtn.addTarget(self, action: #selector(toggleTorch(_:)), for: .touchUpInside)
        toolbar.addArrangedSubview(torchBtn)

        // 相册按钮
        let galleryBtn = UIButton(type: .system)
        galleryBtn.setImage(UIImage(systemName: "photo.on.rectangle.angled"), for: .normal)
        galleryBtn.tintColor = .white
        galleryBtn.addTarget(self, action: #selector(openGallery), for: .touchUpInside)
        toolbar.addArrangedSubview(galleryBtn)

        // 历史记录按钮
        let historyBtn = UIButton(type: .system)
        historyBtn.setImage(UIImage(systemName: "list.bullet.rectangle.portrait"), for: .normal)
        historyBtn.tintColor = .white
        historyBtn.addTarget(self, action: #selector(openHistory), for: .touchUpInside)
        toolbar.addArrangedSubview(historyBtn)
    }

    // MARK: - Actions

    @objc private func openHistory() {
        stopScanning()
        let historyVC = HistoryViewController()
        historyVC.onDismiss = { [weak self] in
            NotificationCenter.default.post(name: .scanDatabaseDidChange, object: nil)
            self?.startScanning()
        }
        let nav = UINavigationController(rootViewController: historyVC)
        nav.modalPresentationStyle = .pageSheet
        present(nav, animated: true)
    }

    @objc private func toggleTorch(_ sender: UIButton) {
        guard let captureDevice = AVCaptureDevice.default(for: .video), captureDevice.hasTorch else { return }
        do {
            try captureDevice.lockForConfiguration()
            isTorchOn.toggle()
            captureDevice.torchMode = isTorchOn ? .on : .off
            captureDevice.unlockForConfiguration()

            sender.setImage(UIImage(systemName: isTorchOn ? "flashlight.on.fill" : "flashlight.off.fill"), for: .normal)
            sender.tintColor = isTorchOn ? UIColor.systemYellow : UIColor.white
        } catch {
            print("Torch error: \(error)")
        }
    }

    @objc private func openGallery() {
        stopScanning()

        var config = PHPickerConfiguration()
        config.filter = .images
        config.selectionLimit = 1
        config.preferredAssetRepresentationMode = .current

        let picker = PHPickerViewController(configuration: config)
        picker.delegate = self
        present(picker, animated: true)
    }

    @objc private func closeScanner() {
        stopScanning()
        dismiss(animated: true)
    }

    // MARK: - Session Control

    private func startScanning() {
        guard isSessionConfigured else { return }
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self, let session = self.captureSession, !session.isRunning else { return }
            session.startRunning()
        }
    }

    private func stopScanning() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self, let session = self.captureSession, session.isRunning else { return }
            session.stopRunning()
        }
    }

    private func showPermissionAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "前往设置", style: .default) { _ in
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
        })
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { [weak self] _ in
            self?.dismiss(animated: true)
        })
        present(alert, animated: true)
    }

    private func showError(_ message: String) {
        let alert = UIAlertController(title: "提示", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "确定", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - AVCaptureMetadataOutputObjectsDelegate

extension QRScannerViewController: AVCaptureMetadataOutputObjectsDelegate {
    func metadataOutput(_ output: AVCaptureMetadataOutput,
                        didOutput metadataObjects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        guard let metadataObject = metadataObjects.first,
              let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject,
              let scanText = readableObject.stringValue,
              !scanText.isEmpty else { return }

        // 停止继续接收帧
        stopScanning()

        // 触觉反馈
        let feedback = UINotificationFeedbackGenerator()
        feedback.notificationOccurred(.success)

        let scanId = UUID().uuidString
        let createdAt = Int64(Date().timeIntervalSince1970 * 1000)
        let typeName = (readableObject.type.rawValue)

        // 保存到本地 SQLite 数据库
        ScanDatabase.shared().insertSwift(ScanRecord(
            id: scanId,
            content: scanText,
            type: typeName,
            title: "iOS 扫码识别",
            category: "none",
            isFavorite: false,
            createdAt: createdAt
        ))
        NotificationCenter.default.post(name: .scanDatabaseDidChange, object: nil)

        // 回调 Web 端
        scanHandler(scanText, scanId, createdAt)

        // 关闭扫描页面
        DispatchQueue.main.async { [weak self] in
            self?.dismiss(animated: true)
        }
    }
}

// MARK: - PHPickerViewControllerDelegate

extension QRScannerViewController: PHPickerViewControllerDelegate {
    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        picker.dismiss(animated: true) { [weak self] in
            guard let self = self else { return }

            guard let item = results.first else {
                // 用户取消选择，恢复相机扫描
                self.startScanning()
                return
            }

            let provider = item.itemProvider

            // 1. 优先使用 loadObject(ofClass: UIImage.self) 加载图片对象
            if provider.canLoadObject(ofClass: UIImage.self) {
                provider.loadObject(ofClass: UIImage.self) { [weak self] (object, error) in
                    if let image = object as? UIImage {
                        self?.processImageForQR(image)
                    } else {
                        DispatchQueue.main.async {
                            self?.showError("图片加载失败: \(error?.localizedDescription ?? "未知错误")")
                        }
                    }
                }
            } else {
                // 2. 兜底策略：使用 loadItem 读取数据/文件 URL
                provider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] (item, error) in
                    var resolvedImage: UIImage? = nil
                    if let image = item as? UIImage {
                        resolvedImage = image
                    } else if let data = item as? Data {
                        resolvedImage = UIImage(data: data)
                    } else if let url = item as? URL, let data = try? Data(contentsOf: url) {
                        resolvedImage = UIImage(data: data)
                    }

                    if let image = resolvedImage {
                        self?.processImageForQR(image)
                    } else {
                        DispatchQueue.main.async {
                            self?.showError("无法读取所选图片数据")
                        }
                    }
                }
            }
        }
    }

    // MARK: - 图片 QR 识别 (Vision framework)

    private func processImageForQR(_ image: UIImage) {
        guard let cgImage = image.cgImage else {
            DispatchQueue.main.async { [weak self] in
                self?.showError("无法解析图片位图")
            }
            return
        }

        let request = VNDetectBarcodesRequest { [weak self] (request, error) in
            DispatchQueue.main.async {
                guard let self = self else { return }

                if let error = error {
                    self.showError("识别失败: \(error.localizedDescription)")
                    return
                }

                guard let results = request.results as? [VNBarcodeObservation],
                      let observation = results.first,
                      let payload = observation.payloadStringValue,
                      !payload.isEmpty else {
                    self.showError("未在所选图片中检测到有效的二维码或条码")
                    return
                }

                let scanId = UUID().uuidString
                let createdAt = Int64(Date().timeIntervalSince1970 * 1000)

                ScanDatabase.shared().insertSwift(ScanRecord(
                    id: scanId,
                    content: payload,
                    type: "QR_CODE",
                    title: "iOS 相册识别",
                    category: "none",
                    isFavorite: false,
                    createdAt: createdAt
                ))
                NotificationCenter.default.post(name: .scanDatabaseDidChange, object: nil)

                self.scanHandler(payload, scanId, createdAt)
                self.dismiss(animated: true)
            }
        }

        request.symbologies = [.QR, .code128, .EAN13, .EAN8, .UPCE, .Aztec, .DataMatrix, .code39, .code93]

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        DispatchQueue.global(qos: .userInitiated).async {
            try? handler.perform([request])
        }
    }
}
