import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const manifestPath = path.join(process.cwd(), "android", "app", "src", "main", "AndroidManifest.xml");
const networkDir = path.join(process.cwd(), "android", "app", "src", "main", "res", "xml");
const networkPath = path.join(networkDir, "network_security_config.xml");

let manifest = await readFile(manifestPath, "utf8");
if (!manifest.includes("android:usesCleartextTraffic")) {
  manifest = manifest.replace("<application", '<application android:usesCleartextTraffic="false" android:networkSecurityConfig="@xml/network_security_config"');
}
const deepLinks = `
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="hamza-agency.com" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="hamzaagency" android:host="auth" android:pathPrefix="/callback" />
            </intent-filter>`;
if (!manifest.includes('android:scheme="hamzaagency"')) {
  const close = manifest.indexOf("</activity>");
  if (close < 0) throw new Error("MainActivity closing tag not found");
  manifest = `${manifest.slice(0, close)}${deepLinks}\n        ${manifest.slice(close)}`;
}
await writeFile(manifestPath, manifest, "utf8");
await mkdir(networkDir, { recursive: true });
await writeFile(networkPath, `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">hamza-agency.com</domain>
    </domain-config>
</network-security-config>
`, "utf8");
console.log("Android transport security and deep links configured.");
