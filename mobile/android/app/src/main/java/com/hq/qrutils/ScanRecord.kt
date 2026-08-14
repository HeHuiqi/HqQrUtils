package com.hq.qrutils

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "scan_records")
data class ScanRecord(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val content: String,
    val type: String,
    val title: String = "",
    val category: String = "none",
    val isFavorite: Boolean = false,
    val timeMillis: Long = System.currentTimeMillis()
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
