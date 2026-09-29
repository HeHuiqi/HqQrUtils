//
//  ScanRecord.swift
//  HqQrUtils - iOS 数据模型 (对应 Android ScanRecord + Web Record)
//
//  该 Swift 结构体与 Objective-C 的 ScanRecordObject 一一对应
//  通过 Bridging Header 暴露给 Swift，用于 NativeHost.emitDatabaseSync
//

import Foundation

/// Swift 数据模型 — 与 Android ScanRecord 实体字段完全一致
struct ScanRecord: Codable, Equatable {
    var id: String
    var content: String
    var type: String
    var title: String
    var category: String
    var isFavorite: Bool
    var createdAt: Int64
    var fgColor: String
    var bgColor: String
    var ecl: String
    var cellSize: Int
    var margin: Int

    init(
        id: String = UUID().uuidString,
        content: String,
        type: String,
        title: String = "",
        category: String = "none",
        isFavorite: Bool = false,
        createdAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        fgColor: String = "#0f172a",
        bgColor: String = "#ffffff",
        ecl: String = "M",
        cellSize: Int = 8,
        margin: Int = 4
    ) {
        self.id = id
        self.content = content
        self.type = type
        self.title = title
        self.category = category
        self.isFavorite = isFavorite
        self.createdAt = createdAt
        self.fgColor = fgColor
        self.bgColor = bgColor
        self.ecl = ecl
        self.cellSize = cellSize
        self.margin = margin
    }

    // 转换为 Dictionary (用于 JSON 序列化 / NativeHost.emitDatabaseSync)
    func toDictionary() -> [String: Any] {
        return [
            "id": id,
            "content": content,
            "type": type,
            "title": title,
            "category": category,
            "isFavorite": isFavorite,
            "createdAt": createdAt,
            "fgColor": fgColor,
            "bgColor": bgColor,
            "ecl": ecl,
            "cellSize": cellSize,
            "margin": margin
        ]
    }

    enum CodingKeys: String, CodingKey {
        case id, content, type, title, category, isFavorite, createdAt
        case fgColor, bgColor, ecl, cellSize, margin
    }

    /// 转换为 Objective-C ScanRecordObject (用于 SQLite 插入)
    func toOCRecord() -> ScanRecordObject {
        let ocRecord = ScanRecordObject(
            identifier: id,
            content: content,
            type: type,
            title: title,
            category: category,
            isFavorite: isFavorite,
            createdAt: createdAt
        )
        ocRecord.fgColor = fgColor
        ocRecord.bgColor = bgColor
        ocRecord.ecl = ecl
        ocRecord.cellSize = cellSize
        ocRecord.margin = margin
        return ocRecord
    }

    static func formatLabel(type: String) -> String {
        switch type.uppercased() {
        case "QR_CODE", "256": return "二维码 (QR Code)"
        case "AZTEC": return "Aztec 条码"
        case "DATA_MATRIX": return "Data Matrix 码"
        case "CODE_128": return "Code 128 条码"
        case "CODE_39": return "Code 39 条码"
        case "EAN_13": return "EAN-13 商品条码"
        case "EAN_8": return "EAN-8 商品条码"
        case "UPC_A": return "UPC-A 条码"
        case "UPC_E": return "UPC-E 条码"
        default: return "识别码 (\(type))"
        }
    }
}

// MARK: - 全局数据库变更通知
extension Notification.Name {
    static let scanDatabaseDidChange = Notification.Name("ScanDatabaseDidChangeNotification")
}

