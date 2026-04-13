const path = require("path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
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
    rollupOptions: {
      input: {
        meeting_window: path.resolve(__dirname, "meeting.html")
      }
    }
  }
});
