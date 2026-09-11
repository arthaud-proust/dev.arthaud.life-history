import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { addTemplate, defineNuxtModule } from "nuxt/kit";
import { oklchToHex } from "./oklch";

/**
 * Expose la palette de Tailwind au code de l'application, sous `#tailwind-palette`.
 *
 * L'équivalent Tailwind 3 serait `exposeConfig` de `@nuxtjs/tailwindcss`, qui lit un
 * `tailwind.config.js`. En Tailwind 4 la configuration est du CSS : la source de
 * vérité est `tailwindcss/theme.css`, livré dans le paquet. On le lit donc à la
 * compilation — la palette suit la version installée, sans rien recopier à la main.
 *
 * Les couleurs y sont écrites en `oklch()`, que ni un canvas ni un calcul de contraste
 * ne savent lire : on les convertit ici, une fois, plutôt qu'à chaque rendu.
 */

interface Palette {
  [family: string]: { [shade: string]: string };
}

function readPalette(): Palette {
  const require = createRequire(import.meta.url);
  const css = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8");
  const palette: Palette = {};

  const declaration =
    /--color-([a-z]+)-(\d+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/g;
  for (const [, family, shade, lightness, chroma, hue] of css.matchAll(
    declaration,
  )) {
    palette[family!] ??= {};
    palette[family!]![shade!] = oklchToHex(
      Number(lightness) / 100,
      Number(chroma),
      Number(hue),
    );
  }
  return palette;
}

export default defineNuxtModule({
  meta: { name: "tailwind-palette" },
  setup(_options, nuxt) {
    const palette = readPalette();
    const template = addTemplate({
      filename: "tailwind-palette.ts",
      write: true,
      getContents: () =>
        [
          "// Généré depuis tailwindcss/theme.css — ne pas modifier à la main.",
          `export const TAILWIND_PALETTE = ${JSON.stringify(palette, null, 2)} as const`,
          "export type TailwindFamily = keyof typeof TAILWIND_PALETTE",
          "",
        ].join("\n"),
    });
    nuxt.options.alias["#tailwind-palette"] = template.dst;
  },
});
