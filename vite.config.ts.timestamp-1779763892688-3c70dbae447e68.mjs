// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import fs from "fs";
var __vite_injected_original_dirname = "/home/project";
function buildSafePublicDir() {
  const src = path.resolve(__vite_injected_original_dirname, "public");
  const staging = path.resolve(__vite_injected_original_dirname, ".public-staging");
  try {
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });
    const copy = (srcDir, destDir) => {
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
var safePublicDir = buildSafePublicDir();
var vite_config_default = defineConfig(({ mode }) => ({
  publicDir: safePublicDir,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    },
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XG5cbi8vIEJ1aWxkIGEgc2FmZS1wdWJsaWMgc3RhZ2luZyBkaXIgdGhhdCBleGNsdWRlcyB1bnJlYWRhYmxlIGZpbGVzXG5mdW5jdGlvbiBidWlsZFNhZmVQdWJsaWNEaXIoKTogc3RyaW5nIHtcbiAgY29uc3Qgc3JjID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJwdWJsaWNcIik7XG4gIGNvbnN0IHN0YWdpbmcgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi5wdWJsaWMtc3RhZ2luZ1wiKTtcblxuICB0cnkge1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHN0YWdpbmcpKSBmcy5ybVN5bmMoc3RhZ2luZywgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgIGZzLm1rZGlyU3luYyhzdGFnaW5nLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICAgIGNvbnN0IGNvcHkgPSAoc3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgZW50cmllcyA9IGZzLnJlYWRkaXJTeW5jKHNyY0RpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgIGNvbnN0IHNyY1BhdGggPSBwYXRoLmpvaW4oc3JjRGlyLCBlbnRyeS5uYW1lKTtcbiAgICAgICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4oZGVzdERpciwgZW50cnkubmFtZSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZnMuYWNjZXNzU3luYyhzcmNQYXRoLCBmcy5jb25zdGFudHMuUl9PSyk7XG4gICAgICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgIGZzLm1rZGlyU3luYyhkZXN0UGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICBjb3B5KHNyY1BhdGgsIGRlc3RQYXRoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnMuY29weUZpbGVTeW5jKHNyY1BhdGgsIGRlc3RQYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIGNvbnNvbGUud2FybihgW3ZpdGVdIFNraXBwaW5nIHVucmVhZGFibGUgcHVibGljIGZpbGU6ICR7ZW50cnkubmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBjb3B5KHNyYywgc3RhZ2luZyk7XG4gICAgcmV0dXJuIHN0YWdpbmc7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBzcmM7XG4gIH1cbn1cblxuY29uc3Qgc2FmZVB1YmxpY0RpciA9IGJ1aWxkU2FmZVB1YmxpY0RpcigpO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgcHVibGljRGlyOiBzYWZlUHVibGljRGlyLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogODA4MCxcbiAgICBobXI6IHtcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxuICAgIH0sXG4gICAgaGVhZGVyczoge1xuICAgICAgXCJYLUNvbnRlbnQtVHlwZS1PcHRpb25zXCI6IFwibm9zbmlmZlwiLFxuICAgICAgXCJYLUZyYW1lLU9wdGlvbnNcIjogXCJTQU1FT1JJR0lOXCIsXG4gICAgICBcIlJlZmVycmVyLVBvbGljeVwiOiBcInN0cmljdC1vcmlnaW4td2hlbi1jcm9zcy1vcmlnaW5cIixcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgICBkZWR1cGU6IFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCIsIFwicmVhY3QvanN4LXJ1bnRpbWVcIiwgXCJyZWFjdC9qc3gtZGV2LXJ1bnRpbWVcIiwgXCJAdGFuc3RhY2svcmVhY3QtcXVlcnlcIiwgXCJAdGFuc3RhY2svcXVlcnktY29yZVwiXSxcbiAgfSxcbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixPQUFPLFFBQVE7QUFIZixJQUFNLG1DQUFtQztBQU16QyxTQUFTLHFCQUE2QjtBQUNwQyxRQUFNLE1BQU0sS0FBSyxRQUFRLGtDQUFXLFFBQVE7QUFDNUMsUUFBTSxVQUFVLEtBQUssUUFBUSxrQ0FBVyxpQkFBaUI7QUFFekQsTUFBSTtBQUNGLFFBQUksR0FBRyxXQUFXLE9BQU8sRUFBRyxJQUFHLE9BQU8sU0FBUyxFQUFFLFdBQVcsTUFBTSxPQUFPLEtBQUssQ0FBQztBQUMvRSxPQUFHLFVBQVUsU0FBUyxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBRXpDLFVBQU0sT0FBTyxDQUFDLFFBQWdCLFlBQW9CO0FBQ2hELFlBQU0sVUFBVSxHQUFHLFlBQVksUUFBUSxFQUFFLGVBQWUsS0FBSyxDQUFDO0FBQzlELGlCQUFXLFNBQVMsU0FBUztBQUMzQixjQUFNLFVBQVUsS0FBSyxLQUFLLFFBQVEsTUFBTSxJQUFJO0FBQzVDLGNBQU0sV0FBVyxLQUFLLEtBQUssU0FBUyxNQUFNLElBQUk7QUFDOUMsWUFBSTtBQUNGLGFBQUcsV0FBVyxTQUFTLEdBQUcsVUFBVSxJQUFJO0FBQ3hDLGNBQUksTUFBTSxZQUFZLEdBQUc7QUFDdkIsZUFBRyxVQUFVLFVBQVUsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUMxQyxpQkFBSyxTQUFTLFFBQVE7QUFBQSxVQUN4QixPQUFPO0FBQ0wsZUFBRyxhQUFhLFNBQVMsUUFBUTtBQUFBLFVBQ25DO0FBQUEsUUFDRixRQUFRO0FBQ04sa0JBQVEsS0FBSywyQ0FBMkMsTUFBTSxJQUFJLEVBQUU7QUFBQSxRQUN0RTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBRUEsU0FBSyxLQUFLLE9BQU87QUFDakIsV0FBTztBQUFBLEVBQ1QsUUFBUTtBQUNOLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFFQSxJQUFNLGdCQUFnQixtQkFBbUI7QUFHekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxXQUFXO0FBQUEsRUFDWCxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUEsSUFDWDtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsMEJBQTBCO0FBQUEsTUFDMUIsbUJBQW1CO0FBQUEsTUFDbkIsbUJBQW1CO0FBQUEsSUFDckI7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsSUFDQSxRQUFRLENBQUMsU0FBUyxhQUFhLHFCQUFxQix5QkFBeUIseUJBQXlCLHNCQUFzQjtBQUFBLEVBQzlIO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
