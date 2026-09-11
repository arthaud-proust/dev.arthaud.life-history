import { describe, expect, it } from "vitest";
import {
  COLOR_NAMES,
  COLOR_SHADE,
  colorToHex,
  contrastRatio,
  parseColor,
  parseColorToken,
  readableTextColor,
} from "../app/utils/colors";

describe("parseColor", () => {
  it("normalise en minuscules sur six chiffres", () => {
    expect(parseColor("#E11D48")).toBe("#e11d48");
    expect(parseColor("  #e11d48 ")).toBe("#e11d48");
    expect(parseColor("#f80")).toBe("#ff8800");
  });

  it("refuse ce qui n’est pas une couleur", () => {
    expect(parseColor("rouge")).toBeNull();
    expect(parseColor("#12345")).toBeNull();
    expect(parseColor("#gggggg")).toBeNull();
    expect(parseColor("")).toBeNull();
  });
});

describe("readableTextColor", () => {
  it("pose du texte sombre sur les fonds clairs", () => {
    expect(readableTextColor("#ffffff")).toBe("#000000");
    expect(readableTextColor("#fde68a")).toBe("#000000");
  });

  it("pose du texte clair sur les fonds sombres", () => {
    expect(readableTextColor("#000000")).toBe("#ffffff");
    expect(readableTextColor("#1e3a8a")).toBe("#ffffff");
  });

  it("atteint le niveau AA sur toutes les teintes, y compris les cas limites", () => {
    const fonds = [
      "#e11d48",
      "#f59e0b",
      "#10b981",
      "#3b82f6",
      "#6b7280",
      "#f0910a",
      "#767676",
      "#000000",
      "#ffffff",
      "#808080",
      "#fde68a",
      "#1e3a8a",
    ];
    for (const fond of fonds) {
      expect(
        contrastRatio(fond, readableTextColor(fond)),
        fond,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("choisit toujours celui des deux qui contraste le mieux", () => {
    for (const fond of [
      "#e11d48",
      "#f59e0b",
      "#10b981",
      "#6b7280",
      "#767676",
    ]) {
      const retenu = readableTextColor(fond);
      const autre = retenu === "#ffffff" ? "#000000" : "#ffffff";
      expect(contrastRatio(fond, retenu), fond).toBeGreaterThanOrEqual(
        contrastRatio(fond, autre),
      );
    }
  });
});

describe("palette Tailwind", () => {
  it("propose une palette de teintes distinctes", () => {
    expect(COLOR_NAMES.length).toBeGreaterThan(15);
    expect(new Set(COLOR_NAMES).size).toBe(COLOR_NAMES.length);
    expect(COLOR_NAMES).toContain("rose");
  });

  it("n’en propose aucune que Tailwind ne fournisse", () => {
    for (const name of COLOR_NAMES) {
      expect(colorToHex(name), name).not.toBeNull();
    }
  });

  it("résout chaque teinte proposée en une couleur peignable", () => {
    for (const name of COLOR_NAMES) {
      expect(colorToHex(name), name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("garde un texte lisible sur toute la palette", () => {
    for (const name of COLOR_NAMES) {
      const fond = colorToHex(name)!;
      expect(
        contrastRatio(fond, readableTextColor(fond)),
        name,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("parseColorToken", () => {
  it("lit un nom de teinte, avec ou sans nuance", () => {
    expect(parseColorToken("rose")).toBe("rose");
    expect(parseColorToken("  Rose ")).toBe("rose");
    expect(parseColorToken("rose-300")).toBe("rose-300");
  });

  it("sous-entend la nuance par défaut", () => {
    expect(colorToHex("rose")).toBe(colorToHex(`rose-${COLOR_SHADE}`));
  });

  it("refuse ce qui n’est pas une teinte connue", () => {
    expect(parseColorToken("bordeaux")).toBeNull();
    expect(parseColorToken("rose-999")).toBeNull();
    expect(parseColorToken("#e11d48")).toBeNull();
    expect(parseColorToken("")).toBeNull();
  });
});
