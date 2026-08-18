package com.hq.qrutils

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.hq.qrutils.databinding.ActivityScanHistoryBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class ScanHistoryActivity : AppCompatActivity() {

    private lateinit var binding: ActivityScanHistoryBinding
    private lateinit var adapter: ScanHistoryAdapter
    private val dao by lazy {
        ScanDatabase.getInstance(this).scanRecordDao()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityScanHistoryBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        setupWindowInsets()
        setupRecyclerView()
        loadHistoryRecords()
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

    private fun setupRecyclerView() {
        adapter = ScanHistoryAdapter(
            onItemClick = { record ->
                copyToClipboard(record.content)
            },
            onItemLongClick = { record ->
                showDeleteConfirmDialog(record)
            }
        )
        binding.recyclerViewHistory.apply {
            layoutManager = LinearLayoutManager(this@ScanHistoryActivity)
            adapter = this@ScanHistoryActivity.adapter
        }
    }

    private fun loadHistoryRecords() {
        lifecycleScope.launch {
            val records = withContext(Dispatchers.IO) {
                dao.getAllRecords()
            }
            adapter.submitList(records)
            binding.textViewEmpty.visibility =
                if (records.isEmpty()) android.view.View.VISIBLE else android.view.View.GONE
        }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_scan_history, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_clear -> {
                showClearAllConfirmDialog()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun copyToClipboard(content: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("scan_history", content))
        Toast.makeText(this, "记录内容已复制到剪贴板", Toast.LENGTH_SHORT).show()
    }

    private fun showDeleteConfirmDialog(record: ScanRecord) {
        AlertDialog.Builder(this)
            .setTitle("删除历史记录")
            .setMessage("确定要删除此条记录吗？")
            .setPositiveButton("删除") { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { dao.delete(record) }
                    loadHistoryRecords()
                    Toast.makeText(this@ScanHistoryActivity, "已删除记录", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun showClearAllConfirmDialog() {
        AlertDialog.Builder(this)
            .setTitle("清空历史记录")
            .setMessage("确定要清空全部扫码历史记录吗？")
            .setPositiveButton("清空") { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { dao.clearAll() }
                    loadHistoryRecords()
                    Toast.makeText(this@ScanHistoryActivity, "已清空全部历史记录", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("取消", null)
            .show()
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }
}
