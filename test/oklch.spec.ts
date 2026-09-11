import { describe, expect, it } from "vitest";
import { oklchToHex } from "../modules/tailwind-palette/oklch";

describe("oklchToHex", () => {
  /**
   * La palette de Tailwind 4 n'existe qu'en oklch : impossible de vérifier la
   * conversion en la comparant à des hex publiés. On la valide donc sur les couleurs
   * dont le sRGB est connu par construction — si les six tombent juste, la matrice et
   * la fonction de transfert sont bonnes.
   */
  it("retrouve exactement les sommets de l’espace sRGB", () => {
    expect(oklchToHex(0, 0, 0)).toBe("#000000");
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff");
    expect(oklchToHex(0.62796, 0.25768, 29.234)).toBe("#ff0000");
    expect(oklchToHex(0.86644, 0.29483, 142.495)).toBe("#00ff00");
    expect(oklchToHex(0.45201, 0.31321, 264.052)).toBe("#0000ff");
    expect(oklchToHex(0.59987, 0, 0)).toBe("#808080");
  });

  it("ramène dans l’espace les couleurs qui en sortent", () => {
    expect(oklchToHex(0.8, 0.4, 20)).toMatch(/^#[0-9a-f]{6}$/);
    expect(oklchToHex(1.5, 0, 0)).toBe("#ffffff");
  });
});
