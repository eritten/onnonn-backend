module.exports = {
  darkMode: "media",
  content: [
    "./index.html",
    "./meeting.html",
    "./src/renderer/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#0F172A",
          900: "#1E293B",
          800: "#334155",
          accent: "#6366F1",
          text: "#F8FAFC",
          muted: "#94A3B8",
          success: "#22C55E",
          error: "#EF4444",
          warning: "#F59E0B"
        }
      },
      boxShadow: {
        panel: "0 10px 35px rgba(15, 23, 42, 0.28)"
      }
    }
  },
  plugins: []
};
