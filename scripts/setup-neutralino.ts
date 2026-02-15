import { execSync } from "node:child_process";
import { existsSync, mkdirSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getBinaryName } from "../src/platform.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const binDir = join(projectRoot, "neutralino", "bin");

const NEUTRALINO_VERSION = "6.5.0";
const DOWNLOAD_URL = `https://github.com/neutralinojs/neutralinojs/releases/download/v${NEUTRALINO_VERSION}/neutralinojs-v${NEUTRALINO_VERSION}.zip`;

const binaryName = getBinaryName();
const binaryPath = join(binDir, binaryName);

if (existsSync(binaryPath)) {
  console.log(`Neutralino binary already exists: ${binaryPath}`);
  process.exit(0);
}

console.log(`Downloading Neutralino v${NEUTRALINO_VERSION}...`);
mkdirSync(binDir, { recursive: true });

const tmpZip = join(binDir, "neutralino.zip");

execSync(`curl -sL -o "${tmpZip}" "${DOWNLOAD_URL}"`, { stdio: "inherit" });
execSync(`unzip -o -j "${tmpZip}" "${binaryName}" -d "${binDir}"`, {
  stdio: "inherit",
});
execSync(`rm -f "${tmpZip}"`);

if (process.platform !== "win32") {
  chmodSync(binaryPath, 0o755);
}

console.log(`Neutralino binary installed: ${binaryPath}`);
