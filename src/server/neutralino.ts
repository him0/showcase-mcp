import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getBinaryName } from "../platform.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getBinaryPath(): string {
  const projectRoot = join(__dirname, "..", "..");
  return join(projectRoot, "neutralino", "bin", getBinaryName());
}

export interface NeutralinoWindow {
  process: ChildProcess;
  cleanup: () => void;
}

export function launchWindow(url: string, title: string): NeutralinoWindow {
  const windowTitle = `showcase-mcp - ${title}`;
  const tmpDir = mkdtempSync(join(tmpdir(), "showcase-mcp-"));
  mkdirSync(join(tmpDir, "resources"), { recursive: true });
  writeFileSync(join(tmpDir, "resources", "index.html"), "");

  const config = {
    applicationId: "showcase.mcp.display",
    version: "1.0.0",
    defaultMode: "window",
    url,
    enableServer: true,
    enableNativeAPI: false,
    port: 0,
    window: {
      title: windowTitle,
      width: 720,
      height: 640,
      center: true,
      resizable: true,
      exitProcessOnClose: true,
    },
    cli: { binaryName: "showcase-mcp", resourcesPath: "/resources/" },
  };

  writeFileSync(
    join(tmpDir, "neutralino.config.json"),
    JSON.stringify(config),
  );

  const binPath = getBinaryPath();
  const proc = spawn(binPath, ["--load-dir-res", `--path=${tmpDir}`, "--window-center", `--window-title=${windowTitle}`], {
    stdio: "ignore",
  });

  const cleanupFn = () => {
    try {
      proc.kill();
    } catch {}
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  };

  return { process: proc, cleanup: cleanupFn };
}
