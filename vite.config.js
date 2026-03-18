import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "HeroForge",
        short_name: "HeroForge",
        description: "Idle RPG prototype for web and mobile",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/vite.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/") || id.includes("/zustand/")) return "react-stack"
          if (id.includes("/phaser3-rex-plugins/")) return "phaser-plugins"
          if (id.includes("/phaser/")) return "phaser-core"
          if (id.includes("/matter-js/")) return "physics"
          if (id.includes("three")) return "three-stack"
          if (id.includes("framer-motion") || id.includes("gsap")) return "motion-stack"
          if (id.includes("@iconify")) return "icons"
          return undefined
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/tests/**/*.test.js"],
  },
})
