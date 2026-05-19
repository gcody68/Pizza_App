import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Build a safe-public staging dir that excludes unreadable files
function buildSafePublicDir(): string {
  const src = path.resolve(__dirname, "public");
  const staging = path.resolve(__dirname, ".public-staging");

  try {
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });

    const copy = (srcDir: string, destDir: string) => {
      const entries = fs.readdirSync(srcDir, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        try {
          fs.accessSync(srcPath, fs.constants.R_OK);
          if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copy(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        } catch {
          console.warn(`[vite] Skipping unreadable public file: ${entry.name}`);
        }
      }
    };

    copy(src, staging);
    return staging;
  } catch {
    return src;
  }
}

const safePublicDir = buildSafePublicDir();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  publicDir: safePublicDir,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
