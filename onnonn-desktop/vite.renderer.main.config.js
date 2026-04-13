const path = require("path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
  base: "./",
  plugins: [react()],
  root: ".",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      "@shared": path.resolve(__dirname, "src/shared")
    }
  },
  build: {
    outDir: ".vite/renderer",
    emptyOutDir: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            if (id.includes("src/renderer/pages/MeetingRoomPage")) {
              return "page-meeting-room";
            }
            if (id.includes("src/renderer/pages/AuthPages")) {
              return "page-auth";
            }
            if (id.includes("src/renderer/pages/AppPages")) {
              return "page-workspace";
            }
            return undefined;
          }

          if (
            id.includes("/react/") ||
            id.includes("\\react\\") ||
            id.includes("/react-dom/") ||
            id.includes("\\react-dom\\") ||
            id.includes("/scheduler/") ||
            id.includes("\\scheduler\\") ||
            id.includes("react-router") ||
            id.includes("@remix-run") ||
            id.includes("zustand") ||
            id.includes("react-hook-form") ||
            id.includes("lucide-react")
          ) {
            return "vendor-react";
          }
          if (id.includes("@livekit") || id.includes("livekit-client")) {
            return "vendor-livekit";
          }
          if (id.includes("recharts")) {
            return "vendor-charts";
          }
          return "vendor";
        }
      },
      input: {
        main_window: path.resolve(__dirname, "index.html")
      }
    }
  }
});
