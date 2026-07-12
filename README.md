# ByteGym

ByteGym is an unofficial Tauri + Vue app for tracking gym activity via the official eGym APIs, with no affiliation or contact with the manufacturer.

> **Built with AI assistance.** Large parts of this codebase were written with
> [Claude Code](https://claude.com/claude-code). Everything is reviewed and tested
> before it lands, but you should read it with that in mind — as you would any code
> you did not write yourself.

**Download:** [bytegym.de](https://bytegym.de) · [Releases](https://github.com/wi-wissen/de.bytegym/releases/latest)

It is focused on **public profile and studio feed data** and provides quick visibility into current training activity.

## What ByteGym Does

- Connects to the official eGym / Netpulse endpoints used by gym apps.
- Tracks training activity based on available profile/feed data.
- Shows how many people are currently training (derived from public studio activity).
- Provides an app-specific leaderboard.
- Counts only workouts completed on gym devices, not workouts imported from connected wearables/trackers.

## Main Features

- Studio activity overview
- Current active trainees indicator
- Training feed and progress views
- Strength-related stats and details
- Custom leaderboard logic (device-only workouts)
- Multi-language UI (`de`, `en`)

## Tech Stack

- Frontend: Vue 3 + Vite + Framework7
- Desktop/Mobile shell: Tauri v2
- Rust backend: `src-tauri`

## Project Structure

- App frontend: [src](src)
- API wrappers: [src/api](src/api)
- State stores: [src/store](src/store)
- Tauri config/backend: [src-tauri](src-tauri)

## Requirements

- Node.js (LTS recommended)
- npm
- Rust toolchain
- Tauri prerequisites for your platform
- For Android builds: Android SDK + JDK + NDK (as required by Tauri Android)

## Setup

Install dependencies:

`npm install`

## Development

Run frontend dev server:

`npm run dev`

Run Tauri app in development:

`npx tauri dev`

## Build

Build frontend assets:

`npm run build`

Build Tauri app (host platform):

`npx tauri build`

## Testing

```sh
npm test
```

This boots the Vite dev server, runs every suite in [tests](tests) against it, and
tears it down. The e2e suites drive the app in your locally installed **Microsoft
Edge** through `playwright-core`, so nothing is downloaded. They seed a fake session
into `localStorage` and point it at a dead API — several assertions deliberately
cover the failure path (for example, that a failed refresh still releases the
pull-to-refresh spinner).

| Suite | Covers |
| --- | --- |
| `back-dismiss.unit.mjs` | Back-to-dismiss state machine: nested sheets, rapid closes, toasts must not swallow a back press |
| `back-nav.e2e.cjs` | The real back button closes an open sheet instead of leaving the app |
| `layout.e2e.cjs` | Tabbar height/centering, sheet drag handle, Framework7's own hairline survives |
| `map.e2e.cjs` | maplibre-gl stays out of the startup path and still renders when lazily loaded |
| `pull-to-refresh.e2e.cjs` | A real touch drag reaches the refresh handler, and `done()` runs even on error |
| `styles-i18n.e2e.cjs` | Translations resolve; no Framework7 component lost its styles when the CSS bundle was trimmed |

Release checks beyond the suites:

- Production frontend build: `npm run build`
- Core flows in the real shell: `npx tauri dev`
- The Android back **gesture** can only be verified on a device — the suites prove
  the web half of that chain, not that Android forwards the gesture to the WebView.

## Android Release (APK)

Signing uses a `.env` file and a keystore placed in the project root.
Both are git-ignored — never commit them.

### 1) Create a release keystore (once)

```sh
keytool -genkeypair -v -keystore bytegym-release.p12 -storetype PKCS12 -alias bytegym -keyalg RSA -keysize 2048 -sigalg SHA256withRSA -validity 10000
```

Keep `bytegym-release.p12` safe. It is already listed in `.gitignore`.

### 2) Create `.env` from the template

```sh
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

Fill in your passwords in `.env`:

```dotenv
BYTEGYM_KEYSTORE_PATH=./bytegym-release.p12
BYTEGYM_KEYSTORE_PASSWORD=your-keystore-password
BYTEGYM_KEY_ALIAS=bytegym
BYTEGYM_KEY_PASSWORD=your-key-password
```

`BYTEGYM_KEYSTORE_PATH` can be relative (to project root) or absolute.

### 3) Build release APK

> **Note:** If you ever re-run `npx tauri android init`, the Android icons will be reset to Tauri defaults. Restore them with:
> ```sh
> npm run android:sync-icons
> ```

```sh
npx tauri android build --apk --target aarch64
```

**Build arm64 only.** Every Android phone from roughly 2015 onwards is arm64;
`x86`/`x86_64` are emulator targets and `armeabi-v7a` is long-obsolete hardware. A
universal APK carries all four native libraries and is ~5.7× the download for no
one's benefit (55 MB vs 9.6 MB). The size also depends on `[profile.release]` in
[`src-tauri/Cargo.toml`](src-tauri/Cargo.toml) — without it cargo ships the library
unstripped, which alone doubles it.

Output lands in `src-tauri/gen/android/app/build/outputs/apk/`.

### 4) Cutting a release

Releases are built by CI, not by hand:

```sh
git tag v0.1.0 && git push origin v0.1.0
```

[`.github/workflows/release.yml`](.github/workflows/release.yml) builds the arm64 APK,
signs it, refuses to publish it if the signature does not verify, and attaches it to a
GitHub release as `bytegym-<version>-android-arm64.apk`. [bytegym.de](https://bytegym.de)
(served from [`docs/`](docs) via GitHub Pages) always links to the newest one.

This needs four repository secrets — **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `BYTEGYM_KEYSTORE_BASE64` | the keystore, base64-encoded: `base64 -w0 bytegym-release.p12` |
| `BYTEGYM_KEYSTORE_PASSWORD` | keystore password |
| `BYTEGYM_KEY_ALIAS` | key alias (`bytegym`) |
| `BYTEGYM_KEY_PASSWORD` | key password |

Locally, the same four keys come from `.env` instead (see above). Environment
variables always take precedence.

### 5) Important notes

- Never commit `.env` or `bytegym-release.p12`.
- There is **no iOS build**. iOS has no sideloading, so an app can only be
  distributed through TestFlight or the App Store — both require a paid Apple
  Developer account and Apple's review, which an unofficial client for someone
  else's API is unlikely to pass ([Guideline 5.2.2](https://developer.apple.com/app-store/review/guidelines/#5.2.2)).
- For Play Store publishing an `.aab` is required (`npx tauri android build --aab`),
  though the same guideline problem applies there.

## Credentials and Sessions

The eGym/Netpulse API hands out nothing but a `JSESSIONID` cookie — there is no
refresh token. Signing back in without asking the user therefore means keeping the
password, which is a real trade-off, so it is **opt-in and off by default**:

- **"Stay signed in" unchecked (default):** the password is never written to disk.
  Only the session cookie is kept. When the server rejects it, you land back on the
  login screen.
- **"Stay signed in" checked:** the password is kept in the app's private storage so
  the app can re-authenticate on its own.

The app reacts to an actual **HTTP 401** rather than guessing a session lifetime, and
retries the request once after signing back in.

### What "stay signed in" does and does not protect

The password is stored in the app's private directory. On Android only this app can
read it, and backups are refused outright (`allowBackup="false"` plus
[`data_extraction_rules.xml`](src-tauri/gen/android/app/src/main/res/xml/data_extraction_rules.xml)),
so it is not swept into adb or cloud backups. Someone with **root or a physically
unlocked device can still read it.**

It is **not encrypted**, and that is a deliberate choice rather than an oversight:
signing back in unattended means the app must be able to recover the password by
itself, so any key it could use would have to sit on the same device — next to the
ciphertext, or compiled into a binary whose source is right here in this repo.
That buys nothing over the OS sandbox and would only *look* like security.

Real protection needs a key the app cannot export, i.e. the Android Keystore, which
takes native code. [`src/store/credentials.js`](src/store/credentials.js) is the seam
for that: replace its three functions and nothing else has to change.

## Data Source Disclaimer

ByteGym is an independent, unofficial project. It is **not affiliated with, endorsed by,
or connected to EGYM SE** in any way, and is neither published nor supported by them.
eGym is a trademark of EGYM SE.

It talks to the same API endpoints the official app uses, with your own account, and
shows the profile and studio data those endpoints return. Respect eGym's terms of
service and privacy requirements when deploying or distributing this app.

## License

[MIT](LICENSE) — for the **source code**.

The ByteGym name, logo and domain are **not** covered by it. Fork freely, but give your
fork its own name. See [TRADEMARKS.md](TRADEMARKS.md).
