package us.ci.socialindia;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.tasks.Task;

import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    public static final String TARGET_URL = "https://socialindia.web.app/";
    private static final String APP_USER_AGENT_SUFFIX = " SocialIndiaApp/1.0";

    private WebView webView;
    private SwipeRefreshLayout swipeRefreshLayout;
    private ProgressBar progressBar;
    private FrameLayout fullscreenContainer;
    private LinearLayout layoutError;
    private Button btnRetry;

    // Fullscreen video playback state
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;

    // File Chooser state for uploads
    private ValueCallback<Uri[]> mFilePathCallback;
    private Uri mCameraPhotoUri;
    private Uri mCameraVideoUri;

    // Back press tracker
    private long lastBackPressTime = 0;

    // Google OAuth / Custom Tab bridge state
    private boolean isPageLoaded = false;
    private boolean isCustomTabAuthPending = false;
    private String pendingAuthIdToken = null;
    private String pendingAuthAccessToken = null;
    private String pendingAuthError = null;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private Runnable customTabCancelRunnable = null;

    // Native Google Sign-In launcher (used when google_web_client_id + SHA-1 are configured)
    private final ActivityResultLauncher<Intent> googleSignInLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                try {
                    Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(result.getData());
                    GoogleSignInAccount account = task.getResult(ApiException.class);
                    if (account != null && account.getIdToken() != null && !account.getIdToken().isEmpty()) {
                        deliverGoogleAuthTokensToWeb(account.getIdToken(), "");
                        return;
                    }
                    launchCustomTabGoogleAuth();
                } catch (ApiException e) {
                    int statusCode = e.getStatusCode();
                    if (statusCode == CommonStatusCodes.CANCELED || statusCode == 12501) {
                        deliverGoogleAuthErrorToWeb("cancelled");
                    } else {
                        // e.g. DEVELOPER_ERROR (10) when SHA-1 is not registered yet -> seamless Custom Tab fallback
                        launchCustomTabGoogleAuth();
                    }
                } catch (Throwable t) {
                    launchCustomTabGoogleAuth();
                }
            });

    // Permission request launcher for Web Audio/Camera
    private PermissionRequest pendingWebPermissionRequest;
    private final ActivityResultLauncher<String[]> webPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), result -> {
                if (pendingWebPermissionRequest != null) {
                    runOnUiThread(() -> {
                        ArrayList<String> grantedResources = new ArrayList<>();
                        boolean cameraGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
                        boolean audioGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;

                        for (String r : pendingWebPermissionRequest.getResources()) {
                            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && cameraGranted) {
                                grantedResources.add(r);
                            } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && audioGranted) {
                                grantedResources.add(r);
                            }
                        }

                        if (!grantedResources.isEmpty()) {
                            pendingWebPermissionRequest.grant(grantedResources.toArray(new String[0]));
                        } else {
                            pendingWebPermissionRequest.deny();
                        }
                        pendingWebPermissionRequest = null;
                    });
                }
            });

    // Activity Result Launcher for modern file selection
    private final ActivityResultLauncher<Intent> fileChooserLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (mFilePathCallback == null) return;

                Uri[] results = null;
                if (result.getResultCode() == Activity.RESULT_OK) {
                    Intent data = result.getData();
                    if (data != null) {
                        String dataString = data.getDataString();
                        if (dataString != null) {
                            results = new Uri[]{Uri.parse(dataString)};
                        } else if (data.getClipData() != null) {
                            final int count = data.getClipData().getItemCount();
                            results = new Uri[count];
                            for (int i = 0; i < count; i++) {
                                results[i] = data.getClipData().getItemAt(i).getUri();
                            }
                        }
                    }

                    // Fallback to captured camera image/video if intent data was empty
                    if (results == null) {
                        if (mCameraPhotoUri != null && checkFileExists(mCameraPhotoUri)) {
                            results = new Uri[]{mCameraPhotoUri};
                        } else if (mCameraVideoUri != null && checkFileExists(mCameraVideoUri)) {
                            results = new Uri[]{mCameraVideoUri};
                        }
                    }
                }

                mFilePathCallback.onReceiveValue(results);
                mFilePathCallback = null;
                mCameraPhotoUri = null;
                mCameraVideoUri = null;
            });

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Bind Views
        webView = findViewById(R.id.webView);
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout);
        progressBar = findViewById(R.id.progressBar);
        fullscreenContainer = findViewById(R.id.fullscreenContainer);
        layoutError = findViewById(R.id.layoutError);
        btnRetry = findViewById(R.id.btnRetry);

        // Configure Swipe to Refresh
        swipeRefreshLayout.setColorSchemeColors(ContextCompat.getColor(this, R.color.primary));
        swipeRefreshLayout.setOnRefreshListener(() -> {
            if (isNetworkAvailable()) {
                webView.clearCache(false);
                webView.reload();
            } else {
                swipeRefreshLayout.setRefreshing(false);
                showErrorView();
            }
        });

        // Retry Button on Offline Error View
        btnRetry.setOnClickListener(v -> {
            if (isNetworkAvailable()) {
                hideErrorView();
                webView.clearCache(false);
                webView.reload();
            } else {
                Toast.makeText(MainActivity.this, R.string.error_desc, Toast.LENGTH_SHORT).show();
            }
        });

        // Setup WebView settings and clients
        setupWebView();

        // Setup Back Button Navigation
        setupBackNavigation();

        // Initial Load
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            if (isNetworkAvailable()) {
                webView.clearCache(false);
                webView.loadUrl(TARGET_URL);
            } else {
                showErrorView();
            }
        }

        handleIncomingIntent(getIntent());
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();

        // Core Capabilities
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        // Viewport & Scaling
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setSupportZoom(false);
        webSettings.setBuiltInZoomControls(false);

        // Media & Autoplay
        webSettings.setMediaPlaybackRequiresUserGesture(false);

        // Windows & Cache
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        webSettings.setSupportMultipleWindows(false);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Mixed Content
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // User Agent
        String originalUA = webSettings.getUserAgentString();
        webSettings.setUserAgentString(originalUA + APP_USER_AGENT_SUFFIX);

        // Cookie Configuration
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Scroll listener to disable pull-to-refresh when scrolled inside webpage
        webView.getViewTreeObserver().addOnScrollChangedListener(() -> {
            swipeRefreshLayout.setEnabled(webView.getScrollY() == 0);
        });

        // Expose native Google Sign-In & Custom Tab OAuth bridge to WebView JS
        webView.addJavascriptInterface(new AndroidAuthBridge(), "SocialIndiaAndroid");

        // Set WebViewClient
        webView.setWebViewClient(new SocialIndiaWebViewClient());

        // Set WebChromeClient
        webView.setWebChromeClient(new SocialIndiaWebChromeClient());
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // 1. If currently in fullscreen video mode, exit fullscreen
                if (customView != null) {
                    hideCustomView();
                    return;
                }

                // 2. If web view can navigate back, go back
                if (webView.canGoBack()) {
                    webView.goBack();
                    return;
                }

                // 3. Double-tap to exit app
                long currentTime = System.currentTimeMillis();
                if (currentTime - lastBackPressTime < 2000) {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                } else {
                    lastBackPressTime = currentTime;
                    Toast.makeText(MainActivity.this, R.string.exit_prompt, Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void showErrorView() {
        swipeRefreshLayout.setVisibility(View.GONE);
        layoutError.setVisibility(View.VISIBLE);
    }

    private void hideErrorView() {
        layoutError.setVisibility(View.GONE);
        swipeRefreshLayout.setVisibility(View.VISIBLE);
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        Network network = cm.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities capabilities = cm.getNetworkCapabilities(network);
        return capabilities != null && (
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
    }

    private boolean checkFileExists(Uri uri) {
        if (uri == null || uri.getPath() == null) return false;
        File file = new File(uri.getPath());
        return file.exists() && file.length() > 0;
    }

    // ==========================================
    // Fullscreen Video Handling
    // ==========================================
    private void showCustomView(View view, WebChromeClient.CustomViewCallback callback) {
        if (customView != null) {
            callback.onCustomViewHidden();
            return;
        }

        customView = view;
        customViewCallback = callback;

        swipeRefreshLayout.setVisibility(View.GONE);
        fullscreenContainer.setVisibility(View.VISIBLE);
        fullscreenContainer.addView(view, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Hide System UI for immersive video playback
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN |
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    private void hideCustomView() {
        if (customView == null) return;

        fullscreenContainer.removeView(customView);
        fullscreenContainer.setVisibility(View.GONE);
        swipeRefreshLayout.setVisibility(View.VISIBLE);

        if (customViewCallback != null) {
            customViewCallback.onCustomViewHidden();
        }

        customView = null;
        customViewCallback = null;

        // Restore System UI
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
    }

    // ==========================================
    // Native Google Sign-In & Custom Tab Relay
    // ==========================================
    private class AndroidAuthBridge {
        @JavascriptInterface
        public boolean isNativeAuthSupported() {
            return true;
        }

        @JavascriptInterface
        public void startGoogleSignIn() {
            runOnUiThread(() -> launchGoogleSignIn());
        }
    }

    private void launchGoogleSignIn() {
        String webClientId = getString(R.string.google_web_client_id).trim();
        if (!webClientId.isEmpty()) {
            try {
                GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                        .requestIdToken(webClientId)
                        .requestEmail()
                        .build();
                GoogleSignInClient client = GoogleSignIn.getClient(this, gso);
                client.signOut().addOnCompleteListener(this, task -> {
                    try {
                        googleSignInLauncher.launch(client.getSignInIntent());
                    } catch (Throwable t) {
                        launchCustomTabGoogleAuth();
                    }
                });
                return;
            } catch (Throwable t) {
                // Fall back to Chrome Custom Tab relay below
            }
        }
        launchCustomTabGoogleAuth();
    }

    private void launchCustomTabGoogleAuth() {
        isCustomTabAuthPending = true;
        if (customTabCancelRunnable != null) {
            mainHandler.removeCallbacks(customTabCancelRunnable);
            customTabCancelRunnable = null;
        }

        Uri authUri = Uri.parse(TARGET_URL + "signin?android_oauth=1");
        try {
            CustomTabColorSchemeParams colorParams = new CustomTabColorSchemeParams.Builder()
                    .setToolbarColor(ContextCompat.getColor(this, R.color.primary))
                    .build();
            CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                    .setDefaultColorSchemeParams(colorParams)
                    .setShowTitle(true)
                    .build();
            customTabsIntent.launchUrl(this, authUri);
        } catch (Exception e) {
            try {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, authUri);
                startActivity(browserIntent);
            } catch (Exception ex) {
                isCustomTabAuthPending = false;
                deliverGoogleAuthErrorToWeb("Unable to open Google Sign-In.");
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data == null) return;

        if (handleAuthDeepLink(data)) {
            return;
        }

        if ("https".equalsIgnoreCase(data.getScheme()) && data.getHost() != null && isInternalHost(data.getHost())) {
            if (webView != null) {
                webView.loadUrl(data.toString());
            }
        }
    }

    private boolean handleAuthDeepLink(Uri data) {
        if (data == null) return false;
        if ("socialindia".equalsIgnoreCase(data.getScheme()) && "auth".equalsIgnoreCase(data.getHost())) {
            isCustomTabAuthPending = false;
            if (customTabCancelRunnable != null) {
                mainHandler.removeCallbacks(customTabCancelRunnable);
                customTabCancelRunnable = null;
            }

            String error = data.getQueryParameter("error");
            String idToken = data.getQueryParameter("id_token");
            String accessToken = data.getQueryParameter("access_token");

            if (error != null && !error.isEmpty()) {
                deliverGoogleAuthErrorToWeb(error);
            } else if ((idToken != null && !idToken.isEmpty()) || (accessToken != null && !accessToken.isEmpty())) {
                deliverGoogleAuthTokensToWeb(
                        idToken != null ? idToken : "",
                        accessToken != null ? accessToken : ""
                );
            } else {
                deliverGoogleAuthErrorToWeb("cancelled");
            }
            return true;
        }
        return false;
    }

    private void deliverGoogleAuthTokensToWeb(String idToken, String accessToken) {
        pendingAuthIdToken = null;
        pendingAuthAccessToken = null;
        pendingAuthError = null;
        if (webView == null || !isPageLoaded) {
            pendingAuthIdToken = idToken;
            pendingAuthAccessToken = accessToken;
            return;
        }
        String js = "if(window.__onAndroidGoogleAuthSuccess){window.__onAndroidGoogleAuthSuccess("
                + JSONObject.quote(idToken != null ? idToken : "") + ","
                + JSONObject.quote(accessToken != null ? accessToken : "") + ");}";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private void deliverGoogleAuthErrorToWeb(String errorMessage) {
        pendingAuthIdToken = null;
        pendingAuthAccessToken = null;
        pendingAuthError = null;
        if (webView == null || !isPageLoaded) {
            pendingAuthError = errorMessage;
            return;
        }
        String js = "if(window.__onAndroidGoogleAuthError){window.__onAndroidGoogleAuthError("
                + JSONObject.quote(errorMessage != null ? errorMessage : "Google sign-in failed.") + ");}";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private void flushPendingAuthResult() {
        if (pendingAuthIdToken != null || pendingAuthAccessToken != null) {
            deliverGoogleAuthTokensToWeb(pendingAuthIdToken, pendingAuthAccessToken);
        } else if (pendingAuthError != null) {
            deliverGoogleAuthErrorToWeb(pendingAuthError);
        }
    }

    private boolean isInternalHost(String host) {
        if (host == null) return false;
        String lower = host.toLowerCase(Locale.ROOT);
        return lower.equals("socialindia.web.app")
                || lower.endsWith(".socialindia.web.app")
                || lower.equals("socialindia-96fa1.web.app")
                || lower.equals("socialindia-96fa1.firebaseapp.com")
                || lower.equals("socialindia.firebaseapp.com")
                || lower.equals("socialindia.us.ci")
                || lower.endsWith(".socialindia.us.ci")
                || lower.equals("socialindia.com")
                || lower.endsWith(".socialindia.com");
    }

    // ==========================================
    // Web Clients
    // ==========================================
    private class SocialIndiaWebViewClient extends WebViewClient {
        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            isPageLoaded = false;
            progressBar.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            isPageLoaded = true;
            progressBar.setVisibility(View.GONE);
            swipeRefreshLayout.setRefreshing(false);
            CookieManager.getInstance().flush();
            flushPendingAuthResult();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request.isForMainFrame()) {
                progressBar.setVisibility(View.GONE);
                swipeRefreshLayout.setRefreshing(false);
                if (!isNetworkAvailable()) {
                    showErrorView();
                }
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme();
            String host = uri.getHost();

            if (handleAuthDeepLink(uri)) {
                return true;
            }

            // Keep internal website URLs within WebView
            if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                if (isInternalHost(host)) {
                    return false;
                }
            }

            // Safely resolve intent:// URLs
            if ("intent".equalsIgnoreCase(scheme)) {
                try {
                    Intent intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                    if (intent.resolveActivity(getPackageManager()) != null) {
                        startActivity(intent);
                        return true;
                    }
                    String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                    if (fallbackUrl != null) {
                        view.loadUrl(fallbackUrl);
                        return true;
                    }
                } catch (Exception ignored) {}
                return true;
            }

            // Launch external intents (e.g. mailto, tel, whatsapp, maps) in external apps
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                startActivity(intent);
                return true;
            } catch (Exception e) {
                return false;
            }
        }
    }

    private class SocialIndiaWebChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            super.onProgressChanged(view, newProgress);
            if (newProgress < 100) {
                progressBar.setVisibility(View.VISIBLE);
                progressBar.setProgress(newProgress);
            } else {
                progressBar.setVisibility(View.GONE);
            }
        }

        @Override
        public void onShowCustomView(View view, CustomViewCallback callback) {
            MainActivity.this.showCustomView(view, callback);
        }

        @Override
        public void onHideCustomView() {
            MainActivity.this.hideCustomView();
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> {
                String[] resources = request.getResources();
                ArrayList<String> permissionsToRequest = new ArrayList<>();

                for (String r : resources) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                            permissionsToRequest.add(Manifest.permission.CAMERA);
                        }
                    } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                            permissionsToRequest.add(Manifest.permission.RECORD_AUDIO);
                        }
                    }
                }

                if (!permissionsToRequest.isEmpty()) {
                    pendingWebPermissionRequest = request;
                    webPermissionLauncher.launch(permissionsToRequest.toArray(new String[0]));
                } else {
                    request.grant(resources);
                }
            });
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            if (mFilePathCallback != null) {
                mFilePathCallback.onReceiveValue(null);
            }
            mFilePathCallback = filePathCallback;

            Intent takePictureIntent = null;
            Intent takeVideoIntent = null;
            ArrayList<Intent> cameraIntents = new ArrayList<>();

            // Prepare camera image capture intent
            try {
                File photoFile = createImageFile();
                if (photoFile != null) {
                    mCameraPhotoUri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getApplicationContext().getPackageName() + ".fileprovider",
                            photoFile);
                    takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, mCameraPhotoUri);
                    cameraIntents.add(takePictureIntent);
                }
            } catch (Exception ignored) {}

            // Prepare camera video capture intent
            try {
                File videoFile = createVideoFile();
                if (videoFile != null) {
                    mCameraVideoUri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getApplicationContext().getPackageName() + ".fileprovider",
                            videoFile);
                    takeVideoIntent = new Intent(MediaStore.ACTION_VIDEO_CAPTURE);
                    takeVideoIntent.putExtra(MediaStore.EXTRA_OUTPUT, mCameraVideoUri);
                    cameraIntents.add(takeVideoIntent);
                }
            } catch (Exception ignored) {}

            // Create file chooser intent
            Intent contentSelectionIntent = fileChooserParams.createIntent();
            contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
            if (fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                contentSelectionIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            }

            Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
            chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
            chooserIntent.putExtra(Intent.EXTRA_TITLE, "Select Video or Media");
            if (!cameraIntents.isEmpty()) {
                chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, cameraIntents.toArray(new Intent[0]));
            }

            try {
                fileChooserLauncher.launch(chooserIntent);
            } catch (Exception e) {
                mFilePathCallback.onReceiveValue(null);
                mFilePathCallback = null;
                return false;
            }

            return true;
        }
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "IMG_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile(imageFileName, ".jpg", storageDir);
    }

    private File createVideoFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String videoFileName = "VID_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_MOVIES);
        return File.createTempFile(videoFileName, ".mp4", storageDir);
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
        if (isCustomTabAuthPending) {
            if (customTabCancelRunnable != null) {
                mainHandler.removeCallbacks(customTabCancelRunnable);
            }
            customTabCancelRunnable = () -> {
                if (isCustomTabAuthPending) {
                    isCustomTabAuthPending = false;
                    deliverGoogleAuthErrorToWeb("cancelled");
                }
            };
            mainHandler.postDelayed(customTabCancelRunnable, 700);
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
