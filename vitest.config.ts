import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // La palette est générée par `modules/tailwind-palette.ts` pendant
      // `nuxt prepare` (lancé par `postinstall`). Si cet alias ne résout pas,
      // c'est que la préparation n'a pas eu lieu.
      "#tailwind-palette": fileURLToPath(
        new URL(".nuxt/tailwind-palette.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["test/**/*.spec.ts"],
    environment: "node",
  },
});
