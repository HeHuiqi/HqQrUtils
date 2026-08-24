package com.hq.qrutils;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.net.URISyntaxException;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {

    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1001;
    private static final int FILE_CHOOSER_REQUEST_CODE = 2001;
    private static final int SCAN_ACTIVITY_REQUEST_CODE = 3001;

    private WebView webView;
    private PermissionRequest pendingPermissionRequest;
    private ValueCallback<Uri[]> filePathCallback;

    // Web 与原生数据库的同步任务统一提交到单线程串行队列，
    // 保证「插入」先于「删除」执行，避免并发竞态导致原生记录残留
    private final ExecutorService dbExecutor = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            settings.setAllowFileAccessFromFileURLs(false);
            settings.setAllowUniversalAccessFromFileURLs(false);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        // 注册 Android 原生 JS 桥接对象 AndroidNative
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidNative");

        // 配置支持 Custom Scheme (voghion://) 及 intent:// 协议的 WebViewClient (解决 net::ERR_UNKNOWN_URL_SCHEME)
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleCustomSchemeOrIntent(view, url);
            }

            @RequiresApi(api = Build.VERSION_CODES.N)
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                return handleCustomSchemeOrIntent(view, url);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // 安全校验：仅允许本地 asset 或 localhost 域请求摄像头等系统敏感权限
                String origin = request.getOrigin() != null ? request.getOrigin().toString() : "";
                if (!origin.startsWith("file://") && !origin.startsWith("http://localhost") && !origin.startsWith("https://localhost")) {
                    request.deny();
                    return;
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                            != PackageManager.PERMISSION_GRANTED) {
                        pendingPermissionRequest = request;
                        ActivityCompat.requestPermissions(
                                MainActivity.this,
                                new String[]{Manifest.permission.CAMERA},
                                CAMERA_PERMISSION_REQUEST_CODE
                        );
                    } else {
                        request.grant(request.getResources());
                    }
                } else {
                    request.grant(request.getResources());
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                startActivityForResult(Intent.createChooser(intent, "选择二维码图片"), FILE_CHOOSER_REQUEST_CODE);
                return true;
            }
        });

        // 加载 Web 主应用入口
        webView.loadUrl("file:///android_asset/public/index.html");
    }

    @Override
    protected void onResume() {
        super.onResume();
        // 当从原生扫码 (ScanActivity) 或原生历史页面 (ScanHistoryActivity) 返回时，
        // 自动将原生数据库的最新记录全量同步给 Web 端，使 Web 界面及时感知原生端的删除/清空变动
        syncNativeDatabaseToWeb();
    }

    /**
     * 将原生数据库 (ScanDatabase) 中的最新记录全量同步至 Web 端 WebView
     */
    public void syncNativeDatabaseToWeb() {
        if (webView == null) return;
        dbExecutor.execute(() -> {
            try {
                List<ScanRecord> records = ScanDatabase.getInstance(MainActivity.this).scanRecordDao().getAllRecordsSync();
                JSONArray jsonArray = new JSONArray();
                for (ScanRecord r : records) {
                    JSONObject obj = new JSONObject();
                    obj.put("id", r.getId());
                    obj.put("content", r.getContent());
                    obj.put("type", r.getType());
                    obj.put("title", r.getTitle());
                    obj.put("category", r.getCategory());
                    obj.put("isFavorite", r.isFavorite());
                    obj.put("createdAt", r.getCreatedAt());
                    obj.put("fgColor", r.getFgColor() != null ? r.getFgColor() : "#0f172a");
                    obj.put("bgColor", r.getBgColor() != null ? r.getBgColor() : "#ffffff");
                    obj.put("ecl", r.getEcl() != null ? r.getEcl() : "M");
                    obj.put("cellSize", r.getCellSize() != null ? r.getCellSize() : 8);
                    obj.put("margin", r.getMargin() != null ? r.getMargin() : 4);
                    jsonArray.put(obj);
                }
                String jsonStr = jsonArray.toString();
                String jsCode = String.format("if (typeof window.onNativeDatabaseSync === 'function') { window.onNativeDatabaseSync(%s); }", JSONObject.quote(jsonStr));
                webView.post(() -> {
                    webView.evaluateJavascript(jsCode, null);
                });
            } catch (Exception e) {
                Log.e("HqQrUtils", "Failed to sync native database to web: " + e.getMessage());
            }
        });
    }

    /**
     * 处理 Custom Scheme (如 voghion://) 与 intent:// 语法 URL
     * 解决 WebView 报 net::ERR_UNKNOWN_URL_SCHEME 异常
     */
    private boolean handleCustomSchemeOrIntent(WebView view, String url) {
        if (url == null) return false;

        // 1. 显式拦截危险可执行伪协议 (javascript:, data:, vbscript:, about:, blob:)
        String lowerUrl = url.trim().toLowerCase();
        if (lowerUrl.startsWith("javascript:") || lowerUrl.startsWith("data:") ||
                lowerUrl.startsWith("vbscript:") || lowerUrl.startsWith("about:") || lowerUrl.startsWith("blob:")) {
            Log.w("HqQrUtils", "Blocked dangerous URL scheme attempt: " + url);
            return true; // 拦截阻止，防止在当前 WebView file:// 上下文中执行脚本
        }

        // 2. 如果是标准的网页或合法本地 asset 基础协议，交由 WebView 内部加载处理
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file:///android_asset/")) {
            return false;
        }

        // 拦截其他非 asset 的本地 file:// 协议，防止任意文件读取
        if (url.startsWith("file://")) {
            Log.w("HqQrUtils", "Blocked external file URL: " + url);
            return true;
        }

        // 3. 处理 intent:// 语法 URL (Android Chrome Intent URI)
        if (url.startsWith("intent://")) {
            try {
                Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                if (intent != null) {
                    // 检查本地是否有匹配的 App 可被拉起
                    PackageManager packageManager = getPackageManager();
                    if (packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY) != null) {
                        startActivity(intent);
                        return true;
                    }

                    // 如果未安装目标 App，优先检查是否存在 S.browser_fallback_url 参数跳转 Fallback 网页
                    // 安全校验：browser_fallback_url 严格仅允许 http:// 或 https:// 协议，防止注入 javascript:
                    String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                    if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                        String lowerFallback = fallbackUrl.trim().toLowerCase();
                        if (lowerFallback.startsWith("http://") || lowerFallback.startsWith("https://")) {
                            view.loadUrl(fallbackUrl);
                            return true;
                        } else {
                            Log.w("HqQrUtils", "Ignored unsafe fallbackUrl: " + fallbackUrl);
                        }
                    }

                    // 尝试通过 Package 包名调起应用商店
                    String packageName = intent.getPackage();
                    if (packageName != null && !packageName.isEmpty()) {
                        try {
                            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + packageName)));
                            return true;
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this, "未安装目标应用: " + packageName, Toast.LENGTH_SHORT).show();
                            return true;
                        }
                    }
                }
            } catch (URISyntaxException e) {
                Toast.makeText(MainActivity.this, "Intent 协议解析失败", Toast.LENGTH_SHORT).show() ;
            } catch (ActivityNotFoundException e) {
                Toast.makeText(MainActivity.this, "未找到可响应此 Intent 的应用", Toast.LENGTH_SHORT).show();
            }
            return true; // 已原生截获处理，防止 WebView 报错 net::ERR_UNKNOWN_URL_SCHEME
        }

        // 4. 处理其他 Custom Scheme 协议 (如 voghion://, alipays://, weixin://, myapp://)
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
            return true;
        } catch (ActivityNotFoundException e) {
            Toast.makeText(MainActivity.this, "未安装响应 " + Uri.parse(url).getScheme() + " 协议的应用", Toast.LENGTH_SHORT).show();
            return true; // 已原生截获处理
        }
    }

    /**
     * JS 桥接接口类 (暴露给 H5 / native-bridge.js 调用)
     */
    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void scanQRCode() {
            Intent intent = new Intent(MainActivity.this, ScanActivity.class);
            startActivityForResult(intent, SCAN_ACTIVITY_REQUEST_CODE);
        }

        /**
         * 接收 Web 端完整 Record JSON 格式数据并同步写入 SQLite (包含 UUID 与样式字段)
         */
        @JavascriptInterface
        public void syncWebRecordToNative(String recordJson) {
            if (recordJson == null || recordJson.isEmpty()) return;
            dbExecutor.execute(() -> {
                try {
                    JSONObject obj = new JSONObject(recordJson);
                    String id = obj.optString("id", java.util.UUID.randomUUID().toString());
                    String content = obj.optString("content", "");
                    if (content.isEmpty()) return;
                    String type = obj.optString("type", "QR_CODE");
                    String title = obj.optString("title", "");
                    String category = obj.optString("category", "none");
                    boolean isFavorite = obj.optBoolean("isFavorite", false);
                    long createdAt = obj.optLong("createdAt", System.currentTimeMillis());
                    String fgColor = obj.optString("fgColor", "#0f172a");
                    String bgColor = obj.optString("bgColor", "#ffffff");
                    String ecl = obj.optString("ecl", "M");
                    int cellSize = obj.optInt("cellSize", 8);
                    int margin = obj.optInt("margin", 4);

                    ScanRecord record = new ScanRecord(
                            id, content, type, title, category, isFavorite, createdAt, fgColor, bgColor, ecl, cellSize, margin
                    );
                    ScanDatabase.getInstance(MainActivity.this).scanRecordDao().insertSync(record);
                } catch (Exception e) {
                    Log.e("HqQrUtils", "Failed to parse and sync web record: " + e.getMessage());
                }
            });
        }

        /**
         * 兼容旧版参数签名的重载方法
         */
        @JavascriptInterface
        public void syncWebRecordToNative(String content, String title, String category, long timeMillis) {
            if (content == null || content.isEmpty()) return;
            dbExecutor.execute(() -> {
                ScanRecord record = new ScanRecord(
                        java.util.UUID.randomUUID().toString(),
                        content, "QR_CODE",
                        title != null ? title : "",
                        category != null ? category : "none",
                        false, timeMillis,
                        "#0f172a", "#ffffff", "M", 8, 4
                );
                ScanDatabase.getInstance(MainActivity.this).scanRecordDao().insertSync(record);
            });
        }

        /**
         * 根据统一的 UUID 主键从原生 SQLite 数据库中精确删除记录
         */
        @JavascriptInterface
        public void deleteWebRecordFromNative(String id) {
            if (id == null || id.isEmpty()) return;
            dbExecutor.execute(() -> {
                ScanRecordDao dao = ScanDatabase.getInstance(MainActivity.this).scanRecordDao();
                int deleted = dao.deleteById(id);
                if (deleted == 0) {
                    Log.w("HqQrUtils", "deleteById miss, id=" + id);
                }
            });
        }

        /**
         * 兼容旧版参数签名的重载方法
         */
        @JavascriptInterface
        public void deleteWebRecordFromNative(String content, long timeMillis) {
            Log.w("HqQrUtils", "Legacy deleteWebRecordFromNative called with content=" + content);
        }

        /**
         * 同步星标收藏状态至原生 SQLite 数据库
         */
        @JavascriptInterface
        public void toggleFavoriteNative(String id, boolean isFavorite) {
            if (id == null || id.isEmpty()) return;
            dbExecutor.execute(() -> {
                ScanDatabase.getInstance(MainActivity.this).scanRecordDao().updateFavorite(id, isFavorite);
            });
        }

        @JavascriptInterface
        public void clearAllNativeRecords() {
            dbExecutor.execute(() -> {
                ScanDatabase.getInstance(MainActivity.this).scanRecordDao().clearAllSync();
            });
        }

        @JavascriptInterface
        public void requestHistorySync() {
            syncNativeDatabaseToWeb();
        }

        @JavascriptInterface
        public void vibrate() {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.vibrate(40);
        }

        @JavascriptInterface
        public void showToast(String message) {
            Toast.makeText(mContext, message, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                    pendingPermissionRequest = null;
                }
            } else {
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.deny();
                    pendingPermissionRequest = null;
                }
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        } else if (requestCode == SCAN_ACTIVITY_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                String scanResult = data.getStringExtra("scan_result");
                String scanId = data.getStringExtra("scan_id");
                long scanCreatedAt = data.getLongExtra("scan_created_at", data.getLongExtra("scan_time_millis", System.currentTimeMillis()));
                if (scanId == null || scanId.isEmpty()) {
                    scanId = java.util.UUID.randomUUID().toString();
                }
                if (scanResult != null && !scanResult.isEmpty()) {
                    String finalScanId = scanId;
                    String jsCode = String.format("if(window.onNativeScanSuccess) window.onNativeScanSuccess(%s, %d, %s);",
                            JSONObject.quote(scanResult), scanCreatedAt, JSONObject.quote(finalScanId));
                    webView.post(() -> webView.evaluateJavascript(jsCode, null));
                }
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            // 优先让 Web 层 (AndroidBridge.handleBackButton) 处理返回键
            // JS 返回 true 表示已处理 (如关闭摄像头或双击提示)；返回 false 表示交由 Native 处理
            webView.evaluateJavascript("typeof window.AndroidBridge !== 'undefined' && " +
                    "typeof window.AndroidBridge.handleBackButton === 'function' ? window.AndroidBridge.handleBackButton() : false;", (value) -> {
                boolean handled = false;
                if (value != null && value.equals("true")) {
                    handled = true;
                }
                if (!handled) {
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        super.onBackPressed();
                    }
                }
            });
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // 关闭串行队列，释放后台线程，避免 Activity 销毁后线程泄漏
        dbExecutor.shutdown();
    }
}
