import { defineConfig } from "vitest/config";
import baseViteConfig from "./vite.config";
import path from "path";

export default defineConfig({
  ...baseViteConfig,
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});