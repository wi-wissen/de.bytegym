package de.bytegym

import android.os.Bundle
import androidx.core.view.WindowCompat

class MainActivity : TauriActivity() {
  // TauriActivity disables this by default, which makes the system back button /
  // edge-swipe-back gesture leave the app immediately. Re-enabling it routes the
  // gesture into the WebView history first, so an open sheet can absorb it
  // (see src/utils/backDismiss.js). Once the history is empty the activity
  // finishes as usual.
  override val handleBackNavigation: Boolean = true

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    WindowCompat.setDecorFitsSystemWindows(window, true)
  }
}
