//
//  HistoryCell.swift
//  HqQrUtils - iOS 历史记录列表单元格
//

import UIKit

class HistoryCell: UITableViewCell {

    private let titleLabel = UILabel()
    private let contentLabel = UILabel()
    private let typeLabel = PaddingLabel()
    private let timeLabel = UILabel()
    private let favoriteBadge = UIImageView()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupViews()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupViews() {
        selectionStyle = .default

        titleLabel.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        titleLabel.textColor = UIColor.label
        titleLabel.numberOfLines = 1
        titleLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)
        titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        contentLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        contentLabel.textColor = UIColor.secondaryLabel
        contentLabel.numberOfLines = 2
        contentLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)
        contentLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        typeLabel.font = UIFont.systemFont(ofSize: 11, weight: .medium)
        typeLabel.textColor = UIColor.secondaryLabel
        typeLabel.backgroundColor = UIColor.secondarySystemBackground
        typeLabel.layer.cornerRadius = 4
        typeLabel.layer.masksToBounds = true
        typeLabel.textAlignment = .center
        typeLabel.setContentHuggingPriority(.required, for: .horizontal)
        typeLabel.setContentCompressionResistancePriority(.required, for: .horizontal)

        timeLabel.font = UIFont.systemFont(ofSize: 12, weight: .regular)
        timeLabel.textColor = UIColor.tertiaryLabel
        timeLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)

        favoriteBadge.image = UIImage(systemName: "star.fill")
        favoriteBadge.tintColor = UIColor.systemYellow
        favoriteBadge.contentMode = .scaleAspectFit
        favoriteBadge.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            favoriteBadge.widthAnchor.constraint(equalToConstant: 14),
            favoriteBadge.heightAnchor.constraint(equalToConstant: 14)
        ])

        let vStack = UIStackView(arrangedSubviews: [titleLabel, contentLabel])
        vStack.axis = .vertical
        vStack.spacing = 4
        vStack.alignment = .fill
        vStack.distribution = .fill
        vStack.setContentHuggingPriority(.defaultLow, for: .horizontal)
        vStack.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let topStack = UIStackView(arrangedSubviews: [vStack, typeLabel])
        topStack.axis = .horizontal
        topStack.alignment = .top
        topStack.spacing = 8
        topStack.distribution = .fill

        let bottomStack = UIStackView(arrangedSubviews: [favoriteBadge, timeLabel])
        bottomStack.axis = .horizontal
        bottomStack.spacing = 4
        bottomStack.alignment = .center
        bottomStack.distribution = .fill

        let mainStack = UIStackView(arrangedSubviews: [topStack, bottomStack])
        mainStack.axis = .vertical
        mainStack.alignment = .fill
        mainStack.distribution = .fill
        mainStack.spacing = 8

        contentView.addSubview(mainStack)
        mainStack.translatesAutoresizingMaskIntoConstraints = false

        let bottomConstraint = mainStack.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -12)
        bottomConstraint.priority = UILayoutPriority(999)

        NSLayoutConstraint.activate([
            mainStack.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            mainStack.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            mainStack.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            bottomConstraint
        ])
    }

    func configure(title: String, content: String, type: String,
                   timeString: String, isFavorite: Bool) {
        titleLabel.text = title.isEmpty ? "未命名记录" : title
        contentLabel.text = content
        typeLabel.text = ScanRecord.formatLabel(type: type)
        timeLabel.text = timeString
        favoriteBadge.isHidden = !isFavorite
    }
}

// MARK: - 自定义内边距 Label (用于类型标签 Badge)
private class PaddingLabel: UILabel {
    var insets = UIEdgeInsets(top: 2, left: 6, bottom: 2, right: 6)

    override func drawText(in rect: CGRect) {
        super.drawText(in: rect.inset(by: insets))
    }

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(
            width: size.width + insets.left + insets.right,
            height: size.height + insets.top + insets.bottom
        )
    }
}
