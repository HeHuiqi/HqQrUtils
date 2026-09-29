//
//  ScanOverlayViewIOS.swift
//  HqQrUtils - iOS 扫描框覆盖层
//
//  半透明遮罩 + 中央镂空 + 四角高亮框 (参照 Android ScanOverlayView)
//

import UIKit

class ScanOverlayViewIOS: UIView {

    private let maskColor = UIColor(red: 0, green: 0, blue: 0, alpha: 0.55)
    private let borderColor = UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1.0) // #2563EB
    private(set) var scanFrame: CGRect = .zero

    override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        commonInit()
    }

    private func commonInit() {
        backgroundColor = .clear
        isOpaque = false
        isUserInteractionEnabled = false
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }

        // 计算扫描框大小 (68% of min dimension, 稍偏上方居中)
        let scanSize = min(rect.width, rect.height) * 0.68
        let left = (rect.width - scanSize) / 2
        let top = (rect.height - scanSize) / 2 - scanSize * 0.08
        scanFrame = CGRect(x: left, y: top, width: scanSize, height: scanSize)

        // 1. 绘制半透明遮罩 (覆盖整个屏幕)
        context.setFillColor(maskColor.cgColor)
        context.fill(rect)

        // 2. 镂空中央扫描框区域 (显示底层真实的相机预览画面)
        context.setBlendMode(.clear)
        context.fill(scanFrame)
        context.setBlendMode(.normal)

        // 3. 绘制四角高亮框
        context.setStrokeColor(borderColor.cgColor)
        context.setLineWidth(4.0)
        context.setLineCap(.round)
        context.setLineJoin(.round)

        let cornerLength = scanSize * 0.12
        let l = scanFrame.minX
        let t = scanFrame.minY
        let r = scanFrame.maxX
        let b = scanFrame.maxY

        // 左上
        context.move(to: CGPoint(x: l, y: t + cornerLength))
        context.addLine(to: CGPoint(x: l, y: t))
        context.addLine(to: CGPoint(x: l + cornerLength, y: t))

        // 右上
        context.move(to: CGPoint(x: r - cornerLength, y: t))
        context.addLine(to: CGPoint(x: r, y: t))
        context.addLine(to: CGPoint(x: r, y: t + cornerLength))

        // 左下
        context.move(to: CGPoint(x: l, y: b - cornerLength))
        context.addLine(to: CGPoint(x: l, y: b))
        context.addLine(to: CGPoint(x: l + cornerLength, y: b))

        // 右下
        context.move(to: CGPoint(x: r - cornerLength, y: b))
        context.addLine(to: CGPoint(x: r, y: b))
        context.addLine(to: CGPoint(x: r, y: b - cornerLength))

        context.strokePath()

        // 4. 绘制提示文本
        let tipText = "将二维码/条码放入框内即可自动扫描"
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 13, weight: .medium),
            .foregroundColor: UIColor.white.withAlphaComponent(0.85)
        ]
        let textSize = (tipText as NSString).size(withAttributes: attributes)
        let textRect = CGRect(
            x: (rect.width - textSize.width) / 2,
            y: scanFrame.maxY + 24,
            width: textSize.width,
            height: textSize.height
        )
        (tipText as NSString).draw(in: textRect, withAttributes: attributes)
    }
}
