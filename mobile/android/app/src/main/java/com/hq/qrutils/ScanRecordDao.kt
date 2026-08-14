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

    @Delete
    suspend fun delete(record: ScanRecord)

    @Query("DELETE FROM scan_records")
    suspend fun clearAll()
}
