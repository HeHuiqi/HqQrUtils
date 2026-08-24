package com.hq.qrutils

import androidx.room.Entity
import androidx.room.PrimaryKey

import java.util.UUID

@Entity(tableName = "scan_records")
data class ScanRecord(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val content: String,
    val type: String = "QR_CODE",
    val title: String = "",
    val category: String = "none",
    val isFavorite: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val fgColor: String? = "#0f172a",
    val bgColor: String? = "#ffffff",
    val ecl: String? = "M",
    val cellSize: Int? = 8,
    val margin: Int? = 4
) {
    companion object {
        fun formatLabel(type: String): String {
            return when (type.uppercase()) {
                "QR_CODE", "256" -> "二维码 (QR Code)"
                "AZTEC" -> "Aztec 条码"
                "DATA_MATRIX" -> "Data Matrix 码"
                "CODE_128" -> "Code 128 条码"
                "CODE_39" -> "Code 39 条码"
                "EAN_13" -> "EAN-13 商品条码"
                else -> "识别码 ($type)"
            }
        }
    }
}
