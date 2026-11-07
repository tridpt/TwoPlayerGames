package com.twoplayergames.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** Native shell for the bundled web app. Its URL stays on the game server's HTTPS
 * origin, so existing same-origin account requests and WebSockets still work. */
public final class MainActivity extends Activity {
    private static final String HOST = "two-player-games-rnu3.onrender.com";
    private static final String HOME_URL = "https://" + HOST + "/";
    private static final int PICK_BACKUP = 1001;
    private static final int SAVE_BACKUP = 1002;
    private static final int MAX_BACKUP_CHARS = 8 * 1024 * 1024;
    private static final String CSP = "default-src 'self'; base-uri 'self'; object-src 'none'; "
            + "script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            + "img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; "
            + "connect-src 'self' ws: wss:; worker-src 'none'; frame-ancestors 'self'";

    private WebView webView;
    private View errorView;
    private boolean mainPageFailed;
    private android.webkit.ValueCallback<Uri[]> fileCallback;
    private String pendingBackup;
    private OnBackInvokedCallback backCallback;

    @SuppressLint("SetJavaScriptEnabled") // All 77 games require JS; only the pinned HTTPS origin loads in this WebView.
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(33, 26, 18));
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return windowInsets;
            });
        } else {
            root.setFitsSystemWindows(true);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(33, 26, 18));
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        errorView = createErrorView();
        root.addView(errorView, new FrameLayout.LayoutParams(-1, -1));
        errorView.setVisibility(View.GONE);
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Android document picker for JSON imports.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidApp");
        webView.setWebViewClient(new GameWebViewClient());
        webView.setWebChromeClient(new GameChromeClient());
        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = this::handleBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
        webView.loadUrl(HOME_URL);
    }

    private View createErrorView() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(dp(24), dp(24), dp(24), dp(24));
        box.setBackgroundColor(Color.rgb(33, 26, 18));

        TextView message = new TextView(this);
        message.setText(R.string.load_failed);
        message.setTextColor(Color.WHITE);
        message.setTextSize(18);
        message.setGravity(Gravity.CENTER);
        box.addView(message);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(-2, -2);
        buttonParams.topMargin = dp(20);
        box.addView(retry, buttonParams);
        retry.setOnClickListener(view -> webView.loadUrl(HOME_URL));
        return box;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static boolean isOurOrigin(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme())
                && HOST.equalsIgnoreCase(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443);
    }

    private void openExternal(Uri uri) {
        String scheme = uri.getScheme();
        if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            Toast.makeText(this, R.string.load_failed, Toast.LENGTH_SHORT).show();
        }
    }

    private static boolean isBundledPath(String path) {
        if ("/".equals(path)) return true;
        if ("/index.html".equals(path) || "/offline.html".equals(path)
                || "/styles.css".equals(path) || "/icon.svg".equals(path)
                || "/manifest.webmanifest".equals(path)) return true;
        return path.startsWith("/js/") && path.endsWith(".js")
                && !path.contains("..") && !path.contains("\\") && !path.contains("//");
    }

    private WebResourceResponse bundledResponse(WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (!isOurOrigin(uri) || !"GET".equalsIgnoreCase(request.getMethod())) return null;
        String path = uri.getPath();
        if (path == null || !isBundledPath(path)) return null;
        String assetPath = "www" + ("/".equals(path) ? "/index.html" : path);
        String mime;
        if (path.endsWith(".js")) mime = "text/javascript";
        else if (path.endsWith(".css")) mime = "text/css";
        else if (path.endsWith(".svg")) mime = "image/svg+xml";
        else if (path.endsWith(".webmanifest")) mime = "application/manifest+json";
        else mime = "text/html";

        try {
            InputStream stream = getAssets().open(assetPath);
            WebResourceResponse response = new WebResourceResponse(mime, "UTF-8", stream);
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-store");
            headers.put("X-Content-Type-Options", "nosniff");
            if (mime.equals("text/html")) headers.put("Content-Security-Policy", CSP);
            response.setResponseHeaders(headers);
            return response;
        } catch (IOException missing) {
            WebResourceResponse response = new WebResourceResponse("text/plain", "UTF-8",
                    new ByteArrayInputStream("Bundled asset missing".getBytes(StandardCharsets.UTF_8)));
            response.setStatusCodeAndReasonPhrase(404, "Not Found");
            return response;
        }
    }

    private final class GameWebViewClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return bundledResponse(request);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isOurOrigin(uri)) return false;
            if (request.isForMainFrame()) openExternal(uri);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            mainPageFailed = false;
            errorView.setVisibility(View.GONE);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                mainPageFailed = true;
                errorView.setVisibility(View.VISIBLE);
            }
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request,
                                        WebResourceResponse response) {
            if (request.isForMainFrame() && response.getStatusCode() >= 400) {
                mainPageFailed = true;
                errorView.setVisibility(View.VISIBLE);
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (!mainPageFailed) errorView.setVisibility(View.GONE);
        }
    }

    private final class GameChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, android.webkit.ValueCallback<Uri[]> callback,
                                         FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            try {
                Intent intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(intent, PICK_BACKUP);
            } catch (ActivityNotFoundException e) {
                fileCallback.onReceiveValue(null);
                fileCallback = null;
            }
            return true;
        }

        @Override
        public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
            new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                    .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel())
                    .show();
            return true;
        }

        @Override
        public boolean onJsPrompt(WebView view, String url, String message, String defaultValue,
                                  JsPromptResult result) {
            EditText input = new EditText(MainActivity.this);
            input.setSingleLine(true);
            input.setText(defaultValue == null ? "" : defaultValue);
            new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setView(input)
                    .setPositiveButton(android.R.string.ok,
                            (dialog, which) -> result.confirm(input.getText().toString()))
                    .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel())
                    .show();
            return true;
        }
    }

    private final class AndroidBridge {
        @JavascriptInterface
        public void saveBackup(String json) {
            if (json == null || json.length() > MAX_BACKUP_CHARS) return;
            try {
                if (!"TwoPlayerGames".equals(new JSONObject(json).optString("app"))) return;
            } catch (JSONException invalid) {
                return;
            }
            runOnUiThread(() -> {
                if (pendingBackup != null) return;
                pendingBackup = json;
                String date = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, "game2nguoi-backup-" + date + ".json");
                try {
                    startActivityForResult(intent, SAVE_BACKUP);
                } catch (ActivityNotFoundException e) {
                    pendingBackup = null;
                    Toast.makeText(MainActivity.this, R.string.backup_failed, Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void shareText(String text) {
            if (text == null || text.isEmpty()) return;
            String safeText = text.length() > 5000 ? text.substring(0, 5000) : text;
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_TEXT, safeText);
                startActivity(Intent.createChooser(intent, getString(R.string.app_name)));
            });
        }

        @JavascriptInterface
        public void copyText(String text) {
            if (text == null || text.length() > 5000) return;
            runOnUiThread(() -> {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                if (clipboard != null) clipboard.setPrimaryClip(ClipData.newPlainText("Game 2 Người", text));
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_BACKUP) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                fileCallback = null;
            }
            return;
        }
        if (requestCode == SAVE_BACKUP) {
            String backup = pendingBackup;
            pendingBackup = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null || backup == null) return;
            try (OutputStream stream = getContentResolver().openOutputStream(data.getData())) {
                if (stream == null) throw new IOException("No output stream");
                stream.write(backup.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this, R.string.backup_saved, Toast.LENGTH_SHORT).show();
            } catch (IOException e) {
                Toast.makeText(this, R.string.backup_failed, Toast.LENGTH_SHORT).show();
            }
        }
    }

    // The web app uses in-page views, so WebView.canGoBack() does not describe its UI.
    @Override
    public void onBackPressed() {
        handleBack();
    }

    private void handleBack() {
        String script = "(function(){"
                + "var shown=function(id){var e=document.getElementById(id);return e&&!e.classList.contains('hidden')};"
                + "var tap=function(id){var e=document.getElementById(id);if(e){e.click();return true}return false};"
                + "if(shown('tourOverlay'))return tap('tourSkip');"
                + "if(shown('replayOverlay'))return tap('replayClose');"
                + "if(shown('helpOverlay'))return tap('helpClose');"
                + "if(shown('winOverlay'))return tap('winMenu');"
                + "if(shown('lobbyView'))return tap('lobbyBackBtn');"
                + "if(shown('gameView'))return tap('backBtn');"
                + "if(shown('modeView'))return tap('modeBackBtn');"
                + "if(shown('detailView'))return tap('detailBackBtn');"
                + "if(shown('profileView'))return tap('profileBackBtn');"
                + "return false})()";
        webView.evaluateJavascript(script, handled -> {
            if (!"true".equals(handled)) finish();
        });
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidApp");
            webView.destroy();
        }
        super.onDestroy();
    }
}
