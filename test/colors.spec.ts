import { describe, expect, it } from "vitest";
import colors from "tailwindcss/colors";
import {
  COLOR_NAMES,
  COLOR_SHADE,
  accentOf,
  colorToCss,
  parseColorToken,
} from "../app/utils/colors";
import { createEvent } from "../app/utils/life-document";

describe("palette", () => {
  it("propose des teintes que Tailwind connaît", () => {
    for (const name of COLOR_NAMES) {
      expect(colorToCss(name), name).not.toBeNull();
    }
  });

  it("rend la couleur telle que Tailwind l’écrit", () => {
    // On ne recopie rien : la valeur attendue vient du paquet lui-même.
    expect(colorToCss("rose")).toBe(colors.rose[500]);
    expect(colorToCss("slate-300")).toBe(colors.slate[300]);
  });

  it("sous-entend la nuance courante", () => {
    expect(colorToCss("rose")).toBe(colorToCss(`rose-${COLOR_SHADE}`));
  });

  it("refuse ce qui n’est pas une teinte", () => {
    expect(colorToCss("#ff0000")).toBeNull();
    expect(colorToCss("framboise")).toBeNull();
    expect(colorToCss("rose-999")).toBeNull();
    // Les couleurs sans nuances de la palette n'en sont pas non plus.
    expect(colorToCss("transparent")).toBeNull();
    expect(colorToCss("black")).toBeNull();
  });
});

describe("parseColorToken", () => {
  it("accepte un nom, avec ou sans nuance", () => {
    expect(parseColorToken("rose")).toBe("rose");
    expect(parseColorToken("  ROSE ")).toBe("rose");
    expect(parseColorToken("slate-300")).toBe("slate-300");
  });

  it("écarte ce qu’il ne sait pas lire", () => {
    expect(parseColorToken("framboise")).toBeNull();
    expect(parseColorToken("rose-42")).toBeNull();
    expect(parseColorToken("#ff2056")).toBeNull();
  });
});

describe("accentOf", () => {
  it("rend la couleur de l’évènement", () => {
    const event = createEvent({
      start: { year: 2000 },
      description: "Un",
      color: "rose",
    });
    expect(accentOf(event)).toBe(colors.rose[500]);
  });

  it("retombe sur le thème quand aucune couleur n’est écrite", () => {
    const event = createEvent({ start: { year: 2000 }, description: "Un" });
    expect(accentOf(event)).toBe("var(--ui-primary)");
  });
});
