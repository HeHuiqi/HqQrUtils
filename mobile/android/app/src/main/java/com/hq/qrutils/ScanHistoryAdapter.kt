package com.hq.qrutils

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.hq.qrutils.databinding.ItemScanHistoryBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ScanHistoryAdapter(
    private val onItemClick: (ScanRecord) -> Unit,
    private val onItemLongClick: (ScanRecord) -> Unit
) : ListAdapter<ScanRecord, ScanHistoryAdapter.ViewHolder>(DiffCallback) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemScanHistoryBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val record = getItem(position)
        holder.bind(record)
    }

    inner class ViewHolder(
        private val binding: ItemScanHistoryBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(record: ScanRecord) {
            binding.textViewHistoryContent.text = record.content
            binding.textViewHistoryType.text = ScanRecord.formatLabel(record.type)
            
            val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
            binding.textViewHistoryTime.text = dateFormat.format(Date(record.timeMillis))

            binding.root.setOnClickListener { onItemClick(record) }
            binding.root.setOnLongClickListener {
                onItemLongClick(record)
                true
            }
        }
    }

    companion object DiffCallback : DiffUtil.ItemCallback<ScanRecord>() {
        override fun areItemsTheSame(oldItem: ScanRecord, newItem: ScanRecord): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: ScanRecord, newItem: ScanRecord): Boolean {
            return oldItem == newItem
        }
    }
}
