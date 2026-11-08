package de.bytegym

import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  // TauriActivity disables this by default, which makes the system back button /
  // edge-swipe-back gesture leave the app immediately. Re-enabling it routes the
  // gesture into the WebView history first, so an open sheet can absorb it
  // (see src/utils/backDismiss.js). Once the history is empty the activity
  // finishes as usual.
  override val handleBackNavigation: Boolean = true

  // Latest system-bar insets in CSS pixels, as JSON. Read once by the page on
  // startup (window.ByteGymInsets.get()) and pushed again on every change.
  @Volatile private var insetsJson = "{\"top\":0,\"right\":0,\"bottom\":0,\"left\":0}"

  override fun onCreate(savedInstanceState: Bundle?) {
    // Edge-to-edge is what Android expects from current apps (and is enforced for
    // targetSdk 35+, with no opt-out from Android 16 on). The status and navigation
    // bars become transparent and the app draws behind them; the page pads itself
    // with the insets we hand it below, so its own app bar and tab bar extend under
    // the system bars instead of sitting below a separately coloured strip.
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    // Paint the app background before the first frame of the page arrives, so a
    // cold start in dark mode doesn't flash white.
    webView.setBackgroundColor(ContextCompat.getColor(this, R.color.app_background))

    // Called before the page loads (see wry's main_pipe.rs), so the bridge exists
    // by the time the app's JS runs.
    webView.addJavascriptInterface(InsetsBridge(), "ByteGymInsets")

    ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
      val density = resources.displayMetrics.density
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())

      // The keyboard: edge-to-edge turns off adjustResize, so shrink the WebView
      // ourselves, to end exactly at the keyboard's top edge (ime.bottom already
      // counts the navigation bar underneath it). Its parent is the content frame.
      (view.parent as? android.view.View)?.setPadding(0, 0, 0, ime.bottom)

      // While the keyboard is up it covers the navigation bar, so there is no
      // bottom inset left for the page to avoid.
      val bottom = if (ime.bottom > 0) 0 else bars.bottom
      fun css(px: Int) = Math.round(px / density)
      insetsJson = "{\"top\":${css(bars.top)},\"right\":${css(bars.right)}," +
        "\"bottom\":${css(bottom)},\"left\":${css(bars.left)}}"

      view.post {
        (view as WebView).evaluateJavascript(
          "window.__bytegymSetInsets && window.__bytegymSetInsets($insetsJson)", null
        )
      }
      insets
    }
    ViewCompat.requestApplyInsets(webView)
  }

  private inner class InsetsBridge {
    @JavascriptInterface
    fun get(): String = insetsJson
  }
}
