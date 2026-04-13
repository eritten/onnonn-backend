const path = require("path");
const { builtinModules } = require("module");
const { defineConfig } = require("vite");

module.exports = defineConfig({
  build: {
    outDir: ".vite/build",
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/preload/preload.js"),
      formats: ["cjs"],
      fileName: () => "preload.js"
    },
    rollupOptions: {
      external: ["electron", ...builtinModules]
    }
  }
});
