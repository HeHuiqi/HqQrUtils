package com.hq.qrutils

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface ScanRecordDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(record: ScanRecord)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertSync(record: ScanRecord)

    @Query("SELECT * FROM scan_records ORDER BY isFavorite DESC, createdAt DESC")
    suspend fun getAllRecords(): List<ScanRecord>

    @Query("SELECT * FROM scan_records ORDER BY isFavorite DESC, createdAt DESC")
    fun getAllRecordsSync(): List<ScanRecord>

    /** 根据统一的 UUID 主键删除记录 */
    @Query("DELETE FROM scan_records WHERE id = :id")
    fun deleteById(id: String): Int

    @Query("DELETE FROM scan_records WHERE id = :id")
    suspend fun deleteByIdAsync(id: String): Int

    /** 更新单条记录的星标收藏状态 */
    @Query("UPDATE scan_records SET isFavorite = :isFavorite WHERE id = :id")
    fun updateFavorite(id: String, isFavorite: Boolean): Int

    @Query("DELETE FROM scan_records WHERE content = :content")
    fun deleteByContentSync(content: String)

    @Query("DELETE FROM scan_records")
    fun clearAllSync()

    @Delete
    suspend fun delete(record: ScanRecord)

    @Query("DELETE FROM scan_records")
    suspend fun clearAll()
}
