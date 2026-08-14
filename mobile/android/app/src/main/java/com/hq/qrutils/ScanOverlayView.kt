package com.hq.qrutils

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import kotlin.math.min

/**
 * 扫码取景框覆盖层：半透明遮罩 + 中央镂空 + 四角高亮绿框
 */
class ScanOverlayView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    private val density = resources.displayMetrics.density

    private val maskPaint = Paint().apply {
        color = Color.parseColor("#8A000000")
        style = Paint.Style.FILL
    }

    private val cornerPaint = Paint().apply {
        color = Color.parseColor("#FF2563EB")
        style = Paint.Style.STROKE
        strokeWidth = 4f * density
        strokeCap = Paint.Cap.ROUND
        isAntiAlias = true
    }

    private val frameRect = RectF()
    private val maskPath = Path().apply {
        fillType = Path.FillType.EVEN_ODD
    }

    private val cornerLength = 36f * density

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        val size = min(w, h) * 0.68f
        val left = (w - size) / 2f
        val top = (h - size) / 2f - size * 0.08f
        frameRect.set(left, top, left + size, top + size)

        maskPath.reset()
        maskPath.addRect(0f, 0f, w.toFloat(), h.toFloat(), Path.Direction.CW)
        maskPath.addRect(frameRect, Path.Direction.CCW)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawPath(maskPath, maskPaint)
        drawCorners(canvas)
    }

    private fun drawCorners(canvas: Canvas) {
        val l = frameRect.left
        val t = frameRect.top
        val r = frameRect.right
        val b = frameRect.bottom

        // 左上角
        canvas.drawLine(l, t, l + cornerLength, t, cornerPaint)
        canvas.drawLine(l, t, l, t + cornerLength, cornerPaint)
        // 右上角
        canvas.drawLine(r, t, r - cornerLength, t, cornerPaint)
        canvas.drawLine(r, t, r, t + cornerLength, cornerPaint)
        // 左下角
        canvas.drawLine(l, b, l + cornerLength, b, cornerPaint)
        canvas.drawLine(l, b, l, b - cornerLength, cornerPaint)
        // 右下角
        canvas.drawLine(r, b, r - cornerLength, b, cornerPaint)
        canvas.drawLine(r, b, r, b - cornerLength, cornerPaint)
    }
}
