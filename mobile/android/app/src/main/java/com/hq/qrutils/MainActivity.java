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
import java.net.URISyntaxException;

public class MainActivity extends AppCompatActivity {

    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1001;
    private static final int FILE_CHOOSER_REQUEST_CODE = 2001;
    private static final int SCAN_ACTIVITY_REQUEST_CODE = 3001;

    private WebView webView;
    private PermissionRequest pendingPermissionRequest;
    private ValueCallback<Uri[]> filePathCallback;

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
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
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

    /**
     * 处理 Custom Scheme (如 voghion://) 与 intent:// 语法 URL
     * 解决 WebView 报 net::ERR_UNKNOWN_URL_SCHEME 异常
     */
    private boolean handleCustomSchemeOrIntent(WebView view, String url) {
        if (url == null) return false;

        // 如果是标准的网页或基础协议，交由 WebView 内部加载处理
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://") || url.startsWith("javascript:")) {
            return false;
        }

        // 1. 处理 intent:// 语法 URL (Android Chrome Intent URI)
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
                    String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                    if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                        view.loadUrl(fallbackUrl);
                        return true;
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

        // 2. 处理其他 Custom Scheme 协议 (如 voghion://, alipays://, weixin://, myapp://)
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

        @JavascriptInterface
        public void syncWebRecordToNative(String content, String title, String category, long timeMillis) {
            if (content == null || content.isEmpty()) return;
            new Thread(() -> {
                ScanDatabase.getInstance(MainActivity.this).scanRecordDao().insertSync(
                        new ScanRecord(0, content, "QR_CODE", title != null ? title : "", category != null ? category : "none", false, timeMillis)
                );
            }).start();
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
                if (scanResult != null && !scanResult.isEmpty()) {
                    String safeResult = scanResult.replace("'", "\\'").replace("\n", "\\n");
                    webView.post(() -> webView.evaluateJavascript("if(window.onNativeScanSuccess) window.onNativeScanSuccess('" + safeResult + "');", null));
                }
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
