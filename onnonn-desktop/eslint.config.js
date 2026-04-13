const reactHooks = require("eslint-plugin-react-hooks");
const react = require("eslint-plugin-react");

module.exports = [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly"
      }
    },
    plugins: {
      react,
      "react-hooks": reactHooks
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      ...reactHooks.configs.recommended.rules
    }
  }
];
