export function getBinaryName(): string {
  const platformMap: Record<string, string> = {
    darwin: "mac",
    linux: "linux",
    win32: "win",
  };
  const archMap: Record<string, string> = {
    x64: "x64",
    arm64: "arm64",
  };

  const p = platformMap[process.platform];
  if (!p) {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }
  if (p === "mac") return "neutralino-mac_universal";

  const a = archMap[process.arch];
  if (!a) {
    throw new Error(`Unsupported architecture: ${process.arch}`);
  }
  const ext = process.platform === "win32" ? ".exe" : "";
  return `neutralino-${p}_${a}${ext}`;
}
