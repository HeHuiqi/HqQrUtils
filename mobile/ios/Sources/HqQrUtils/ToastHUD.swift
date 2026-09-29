//
//  ToastHUD.swift
//  HqQrUtils - iOS 全局浮层提示组件 (毛玻璃药丸风格)
//

import UIKit

// MARK: - Toast 类型枚举

enum ToastType {
    case success
    case error
    case warning
    case info

    var iconName: String {
        switch self {
        case .success: return "checkmark.circle.fill"
        case .error: return "xmark.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .info: return "info.circle.fill"
        }
    }

    var iconColor: UIColor {
        switch self {
        case .success: return UIColor(red: 0.2, green: 0.78, blue: 0.35, alpha: 1.0)
        case .error: return UIColor(red: 0.94, green: 0.27, blue: 0.27, alpha: 1.0)
        case .warning: return UIColor(red: 0.96, green: 0.62, blue: 0.05, alpha: 1.0)
        case .info: return UIColor(red: 0.38, green: 0.65, blue: 0.98, alpha: 1.0)
        }
    }
}

// MARK: - ToastHUD 单例管理类

class ToastHUD {
    static let shared = ToastHUD()
    private weak var currentToast: UIView?

    private init() {}

    /// 在当前活跃窗口中弹出 Toast 提示
    func show(message: String, type: ToastType = .info, in window: UIWindow? = nil) {
        DispatchQueue.main.async {
            guard let targetWindow = window ??
                    UIApplication.shared.connectedScenes
                        .compactMap({ $0 as? UIWindowScene })
                        .flatMap({ $0.windows })
                        .first(where: { $0.isKeyWindow }) ??
                    UIApplication.shared.windows.first else { return }

            // 移除当前已有 Toast，防止重叠
            self.currentToast?.removeFromSuperview()

            // 容器视图 (圆角毛玻璃药丸样式)
            let container = UIView()
            container.translatesAutoresizingMaskIntoConstraints = false
            container.isUserInteractionEnabled = false
            container.layer.cornerRadius = 22
            container.layer.masksToBounds = true

            // 毛玻璃背景
            let blurEffect = UIBlurEffect(style: .systemMaterialDark)
            let blurView = UIVisualEffectView(effect: blurEffect)
            blurView.translatesAutoresizingMaskIntoConstraints = false
            container.addSubview(blurView)

            // 状态图标
            let iconConfig = UIImage.SymbolConfiguration(pointSize: 17, weight: .semibold)
            let iconImage = UIImage(systemName: type.iconName, withConfiguration: iconConfig)
            let iconView = UIImageView(image: iconImage)
            iconView.tintColor = type.iconColor
            iconView.contentMode = .scaleAspectFit
            iconView.setContentHuggingPriority(.required, for: .horizontal)
            iconView.setContentCompressionResistancePriority(.required, for: .horizontal)

            // 提示文本
            let label = UILabel()
            label.text = message
            label.font = UIFont.systemFont(ofSize: 14, weight: .medium)
            label.textColor = .white
            label.numberOfLines = 0
            label.textAlignment = .left
            label.setContentHuggingPriority(.defaultLow, for: .horizontal)

            // 内容水平布局
            let contentStack = UIStackView(arrangedSubviews: [iconView, label])
            contentStack.axis = .horizontal
            contentStack.alignment = .center
            contentStack.spacing = 10
            contentStack.translatesAutoresizingMaskIntoConstraints = false
            container.addSubview(contentStack)

            targetWindow.addSubview(container)
            self.currentToast = container

            // AutoLayout 约束
            NSLayoutConstraint.activate([
                blurView.topAnchor.constraint(equalTo: container.topAnchor),
                blurView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
                blurView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
                blurView.bottomAnchor.constraint(equalTo: container.bottomAnchor),

                contentStack.topAnchor.constraint(equalTo: container.topAnchor, constant: 11),
                contentStack.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -11),
                contentStack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 16),
                contentStack.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -18),

                container.centerXAnchor.constraint(equalTo: targetWindow.centerXAnchor),
                container.bottomAnchor.constraint(equalTo: targetWindow.safeAreaLayoutGuide.bottomAnchor, constant: -48),
                container.widthAnchor.constraint(lessThanOrEqualTo: targetWindow.widthAnchor, constant: -48),
                container.widthAnchor.constraint(greaterThanOrEqualToConstant: 120)
            ])

            // 初始入场弹性动画
            container.alpha = 0.0
            container.transform = CGAffineTransform(scaleX: 0.85, y: 0.85).translatedBy(x: 0, y: 15)

            UIView.animate(withDuration: 0.35, delay: 0, usingSpringWithDamping: 0.75, initialSpringVelocity: 0.5, options: .curveEaseOut, animations: {
                container.alpha = 1.0
                container.transform = .identity
            }) { _ in
                UIView.animate(withDuration: 0.3, delay: 2.0, options: .curveEaseIn, animations: {
                    container.alpha = 0.0
                    container.transform = CGAffineTransform(scaleX: 0.9, y: 0.9).translatedBy(x: 0, y: 10)
                }) { _ in
                    if self.currentToast == container {
                        container.removeFromSuperview()
                        self.currentToast = nil
                    }
                }
            }
        }
    }
}
