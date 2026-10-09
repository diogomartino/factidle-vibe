/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      // Dependencies change less often than game code: keep them in their own cacheable chunk.
      output: { codeSplitting: { groups: [{ name: "vendor", test: /node_modules/ }] } },
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
