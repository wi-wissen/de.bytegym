/**
 * Storage for the login password — the one secret this app has to keep.
 *
 * The eGym/Netpulse API issues nothing but a JSESSIONID cookie: there is no refresh
 * token. So signing back in without asking the user means keeping the password.
 * That is a real trade-off, so it is opt-in ("stay signed in", off by default).
 * With the box unchecked, nothing here is ever written and an expired session
 * simply sends the user back to the login screen.
 *
 * WHAT THIS DOES AND DOES NOT PROTECT
 *
 * The password is written to the app's private storage. On Android that directory
 * is readable only by this app — other apps cannot touch it — and `allowBackup` is
 * off, so it is not swept into adb/cloud backups either. Someone with root, or a
 * physically unlocked device, CAN still read it.
 *
 * It is NOT encrypted, and that is deliberate rather than an oversight: silent
 * re-login means the app must be able to recover the password unattended, so any
 * key it could use would have to sit on the same device — next to the ciphertext,
 * or baked into a binary whose source is public. That buys nothing over the
 * sandbox and would only look like security. Real protection needs a key the app
 * cannot export — i.e. the Android Keystore, via native code.
 *
 * This module is the seam for exactly that: swap these three functions for
 * Keystore-backed ones and nothing else in the app has to change.
 */

const STORAGE_KEY = 'bytegym_password'

export function storePassword(password) {
  try {
    localStorage.setItem(STORAGE_KEY, password)
  } catch (e) {
    console.error('[credentials] could not store password:', e)
  }
}

export function getStoredPassword() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

export function clearStoredPassword() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing we can do, and nothing depends on it */
  }
}
