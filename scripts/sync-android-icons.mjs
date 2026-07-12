/**
 * Syncs Android icons from src-tauri/icons/android/ into the Gradle project.
 *
 * Run this after `npx tauri android init` to restore custom icons that
 * Tauri would have overwritten with its defaults:
 *
 *   npm run android:sync-icons
 */

import { cpSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src-tauri", "icons", "android");
const dst = join(root, "src-tauri", "gen", "android", "app", "src", "main", "res");

const dirs = [
  "mipmap-anydpi-v26",
  "mipmap-mdpi",
  "mipmap-hdpi",
  "mipmap-xhdpi",
  "mipmap-xxhdpi",
  "mipmap-xxxhdpi",
];

for (const dir of dirs) {
  const target = join(dst, dir);
  mkdirSync(target, { recursive: true });
  cpSync(join(src, dir), target, { recursive: true, force: true });
  console.log(`✓ ${dir}`);
}

// background color vector (values/ic_launcher_background.xml)
const valuesSrc = join(src, "values");
const valuesDst = join(dst, "values");
mkdirSync(valuesDst, { recursive: true });
cpSync(valuesSrc, valuesDst, { recursive: true, force: true });
console.log("✓ values/ic_launcher_background.xml");

console.log("\nAndroid icons synced.");
