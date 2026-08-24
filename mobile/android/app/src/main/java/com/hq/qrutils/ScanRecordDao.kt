package com.hq.qrutils

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface ScanRecordDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(record: ScanRecord): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertSync(record: ScanRecord): Long

    @Query("SELECT * FROM scan_records ORDER BY isFavorite DESC, timeMillis DESC")
    suspend fun getAllRecords(): List<ScanRecord>

    @Query("SELECT * FROM scan_records ORDER BY isFavorite DESC, timeMillis DESC")
    fun getAllRecordsSync(): List<ScanRecord>

    /** 根据 timeMillis 删除 (Web 端记录的 createdAt 与 Native 同步时作为关联键) */
    @Query("DELETE FROM scan_records WHERE timeMillis = :timeMillis")
    fun deleteByTimeMillis(timeMillis: Long): Int

    @Query("DELETE FROM scan_records WHERE content = :content")
    fun deleteByContentSync(content: String)

    @Query("DELETE FROM scan_records")
    fun clearAllSync()

    @Delete
    suspend fun delete(record: ScanRecord)

    @Query("DELETE FROM scan_records")
    suspend fun clearAll()
}
