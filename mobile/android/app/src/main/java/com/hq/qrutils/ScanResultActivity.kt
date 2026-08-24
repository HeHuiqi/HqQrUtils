package com.hq.qrutils

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.hq.qrutils.databinding.ActivityScanResultBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class ScanResultActivity : AppCompatActivity() {

    private lateinit var binding: ActivityScanResultBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityScanResultBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val content = intent.getStringExtra(EXTRA_CONTENT).orEmpty()
        val format = intent.getStringExtra(EXTRA_FORMAT).orEmpty()

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        setupWindowInsets()

        binding.textViewTypeValue.text = ScanRecord.formatLabel(format)
        binding.textViewResult.text = content

        // 扫码或识别成功后，自动将结果写入本地数据库历史记录
        // recordId / recordTime 同时作为结果回传给 MainActivity，保证 Web 端记录与原生库使用统一 UUID 主键与时间戳
        val recordId = java.util.UUID.randomUUID().toString()
        val recordTime = System.currentTimeMillis()
        saveRecordToHistory(recordId, content, format, recordTime)

        // 设置原生返回结果，传递给 MainActivity / WebBridge
        setResult(RESULT_OK, Intent()
            .putExtra("scan_id", recordId)
            .putExtra("scan_result", content)
            .putExtra("scan_created_at", recordTime)
            .putExtra("scan_time_millis", recordTime))
        
        setupListeners()
    }

    private fun setupWindowInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.main) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val density = resources.displayMetrics.density
            val padding = (16 * density).toInt()
            v.setPadding(
                systemBars.left + padding,
                systemBars.top + padding,
                systemBars.right + padding,
                systemBars.bottom + padding
            )
            insets
        }
    }

    /**
     * 自动写入扫码历史记录
     */
    private fun saveRecordToHistory(id: String, content: String, format: String, recordTime: Long) {
        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                ScanDatabase.getInstance(this@ScanResultActivity)
                    .scanRecordDao()
                    .insert(
                        ScanRecord(
                            id = id,
                            content = content,
                            type = format,
                            createdAt = recordTime
                        )
                    )
            }
        }
    }

    private fun setupListeners() {
        binding.buttonCopy.setOnClickListener {
            val output = binding.textViewResult.text.toString()
            if (output.isBlank()) {
                Toast.makeText(this, "没有可复制的内容", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("scan_result", output))
            Toast.makeText(this, R.string.scan_result_copied, Toast.LENGTH_SHORT).show()
        }

        binding.buttonAgain.setOnClickListener {
            finish()
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    companion object {
        const val EXTRA_CONTENT = "extra_content"
        const val EXTRA_FORMAT = "extra_format"
    }
}
