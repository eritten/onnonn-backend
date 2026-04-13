const path = require("path");
const { builtinModules } = require("module");
const { defineConfig } = require("vite");

const nodeBuiltins = builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]);

module.exports = defineConfig({
  resolve: {
    conditions: ["node", "default"],
    mainFields: ["module", "main"],
    browserField: false
  },
  build: {
    outDir: ".vite/build",
    emptyOutDir: false,
    target: "node20",
    lib: {
      entry: path.resolve(__dirname, "src/main/main.js"),
      formats: ["cjs"],
      fileName: () => "main.js"
    },
    rollupOptions: {
      external: [
        "electron",
        "electron-updater",
        ...nodeBuiltins
      ]
    }
  }
});
