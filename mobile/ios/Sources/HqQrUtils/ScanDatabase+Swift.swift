//
//  ScanDatabase+Swift.swift
//  HqQrUtils - iOS 数据存储 Swift 扩展层
//
//  对 Objective-C ScanDatabase 类的 Swift 友好扩展
//  允许 Swift 代码直接使用 ScanRecord 结构体而无需手动转换
//

import Foundation

extension ScanDatabase {

    /// Swift 便捷方法：插入 ScanRecord 结构体
    @discardableResult
    func insertSwift(_ record: ScanRecord) -> Void {
        self.insertOrReplace(record.toOCRecord())
    }

    /// Swift 便捷方法：插入或替换
    func insertOrReplaceSwift(_ record: ScanRecord) {
        self.insertOrReplace(record.toOCRecord())
    }

    /// Swift 便捷方法：获取所有记录为字典数组
    func getAllRecordsSwift() -> [[String: Any]] {
        let ocRecords = self.getAllRecords()
        return (ocRecords as? [[String: Any]]) ?? []
    }
}
