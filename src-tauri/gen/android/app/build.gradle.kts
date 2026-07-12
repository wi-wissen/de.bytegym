import java.util.Properties
import java.io.File

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

// Load .env from the project root (3 levels above the android dir).
// Environment variables take precedence (useful for CI).
// See README.md and .env.example for setup instructions.
val projectRoot: File = rootProject.rootDir.resolve("../../..").canonicalFile
val dotEnv = Properties().apply {
    val envFile = File(projectRoot, ".env")
    if (envFile.exists()) {
        envFile.forEachLine { line ->
            val trimmed = line.trim()
            if (trimmed.isNotEmpty() && !trimmed.startsWith("#")) {
                val idx = trimmed.indexOf('=')
                if (idx > 0) setProperty(trimmed.substring(0, idx).trim(), trimmed.substring(idx + 1).trim())
            }
        }
    }
}

fun env(key: String): String? =
    System.getenv(key).takeUnless { it.isNullOrBlank() }
        ?: (dotEnv.getProperty(key) as String?).takeUnless { it.isNullOrBlank() }

fun resolveKeystore(path: String): File =
    File(path).let { if (it.isAbsolute) it else File(projectRoot, path) }

android {
    compileSdk = 36
    namespace = "de.bytegym"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "de.bytegym"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    signingConfigs {
        create("release") {
            val keystorePath = env("BYTEGYM_KEYSTORE_PATH")
            val keystorePass = env("BYTEGYM_KEYSTORE_PASSWORD")
            val alias        = env("BYTEGYM_KEY_ALIAS")
            val keyPass      = env("BYTEGYM_KEY_PASSWORD")

            if (keystorePath != null && keystorePass != null && alias != null && keyPass != null) {
                storeFile = resolveKeystore(keystorePath)
                storePassword = keystorePass
                this.keyAlias = alias
                this.keyPassword = keyPass
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
            val releaseSigningConfig = signingConfigs.findByName("release")
            if (releaseSigningConfig?.storeFile != null) {
                signingConfig = releaseSigningConfig
            }
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

tasks.register("renameReleaseApks") {
    doLast {
        val apkRoot = layout.buildDirectory.dir("outputs/apk").get().asFile
        if (!apkRoot.exists()) return@doLast

        val defaultName = Regex("^app-(.+)-release\\.apk$")
        val version = tauriProperties.getProperty("tauri.android.versionName", "1.0")

        apkRoot.walkTopDown()
            .filter { it.isFile && defaultName.matches(it.name) }
            .forEach { apk ->
                val flavor = defaultName.matchEntire(apk.name)?.groupValues?.get(1) ?: "universal"
                val renamed = File(apk.parentFile, "bytegym-${version}-release-${flavor}.apk")
                apk.copyTo(renamed, overwrite = true)
            }
    }
}

tasks.matching { it.name.startsWith("assemble") && it.name.endsWith("Release") }.configureEach {
    finalizedBy("renameReleaseApks")
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")