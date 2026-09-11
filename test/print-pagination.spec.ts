import { describe, expect, it } from "vitest";
import {
  PAGE_COUNT_WARNING,
  ROWS_PER_SHEET,
  SHEET_GEOMETRY,
  packLines,
  paginate,
} from "../app/utils/print-pagination";
import { parseDocument, titleOf } from "../app/utils/life-document";
import { CARDS_PER_LINE } from "../app/utils/timeline-sequence";

const suite = (count: number) =>
  parseDocument(
    Array.from(
      { length: count },
      (_, index) => `# ${1990 + index}\nÉvènement ${index + 1}`,
    ).join("\n\n"),
  ).events;

describe("paginate", () => {
  it("met deux lignes de frise par feuille", () => {
    const pages = paginate(suite(CARDS_PER_LINE * ROWS_PER_SHEET));
    expect(pages).toHaveLength(1);
    expect(pages[0]!.events).toHaveLength(CARDS_PER_LINE * ROWS_PER_SHEET);
  });

  it("passe à la feuille suivante au-delà", () => {
    expect(paginate(suite(CARDS_PER_LINE * ROWS_PER_SHEET + 1))).toHaveLength(
      2,
    );
  });

  it("ne perd ni ne duplique aucun évènement", () => {
    const tous = suite(29);
    const repartis = paginate(tous).flatMap((page) => page.events);
    expect(repartis.map(titleOf)).toEqual(tous.map(titleOf));
  });

  it("ne produit aucune feuille pour une frise vide", () => {
    expect(paginate([])).toEqual([]);
  });

  it("annonce la période couverte par chaque feuille", () => {
    expect(paginate(suite(20))[0]!.label).toMatch(/^\d{4} → \d{4}$/);
  });

  it("annonce une seule année quand la feuille n’en couvre qu’une", () => {
    expect(
      paginate(parseDocument("# 2024\nUn\n\n# 2024\nDeux").events)[0]!.label,
    ).toBe("2024");
  });

  it("reconduit une période sur chaque feuille qu’elle chapeaute", () => {
    const events = parseDocument(
      Array.from(
        { length: 18 },
        (_, index) => `# ${2000 + index}\nÉvènement ${index + 1}`,
      ).join("\n\n") + "\n\n# 2000 à 2015; rose\nUne longue période",
    ).events;
    const pages = paginate(events);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages.slice(0, 2)) {
      expect(page.events.map(titleOf)).toContain("Une longue période");
    }
  });

  it("reste sous le seuil d’alerte pour une vie ordinaire", () => {
    expect(paginate(suite(40)).length).toBeLessThan(PAGE_COUNT_WARNING);
  });
});

describe("géométrie des feuilles", () => {
  it("convertit les millimètres en pixels de façon déterministe", () => {
    expect(SHEET_GEOMETRY.landscape.scale).toBeCloseTo(
      (297 * (96 / 25.4)) / 2100,
      6,
    );
    // La marge vaut 10 mm une fois la feuille réduite, dans les deux orientations.
    for (const geometry of Object.values(SHEET_GEOMETRY)) {
      expect(geometry.paddingPx * geometry.scale).toBeCloseTo(
        10 * (96 / 25.4),
        0,
      );
    }
    expect(SHEET_GEOMETRY.portrait.widthMm).toBeLessThan(
      SHEET_GEOMETRY.landscape.widthMm,
    );
  });
});

describe("packLines", () => {
  const lignes = (count: number, body = 100, ret = 30) =>
    Array.from({ length: count }, (_, index) => ({
      body,
      ret: index === count - 1 ? 0 : ret,
    }));

  it("ajoute des lignes tant que la suivante tient", () => {
    // 3 lignes de 100 + 2 retours de 30 font 360 ; la 4e déborderait de 400.
    expect(packLines(lignes(6), 400)).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });

  it("ne compte pas le retour de la dernière ligne d’une feuille", () => {
    // Deux lignes de 100 et le retour de 30 qui les sépare font 230. Le retour de la
    // seconde ne compte pas : en bas d'une feuille, le trait ne repart nulle part.
    expect(packLines(lignes(2), 230)).toEqual([[0, 1]]);
    expect(packLines(lignes(2), 229)).toEqual([[0], [1]]);
  });

  it("passe à la feuille suivante dès qu’une ligne ne tient plus", () => {
    expect(packLines(lignes(4, 150, 30), 330)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it("tient compte de la hauteur réelle, pas du nombre de lignes", () => {
    // Une ligne aux descriptions longues occupe à elle seule une feuille, là où trois
    // lignes courtes tiennent ensemble sur la suivante.
    const inegales = [
      { body: 400, ret: 20 },
      { body: 50, ret: 20 },
      { body: 50, ret: 20 },
      { body: 50, ret: 0 },
    ];
    expect(packLines(inegales, 420)).toEqual([[0], [1, 2, 3]]);
  });

  it("isole une ligne plus haute qu’une feuille plutôt que de boucler", () => {
    const geante = [
      { body: 100, ret: 20 },
      { body: 900, ret: 20 },
      { body: 100, ret: 0 },
    ];
    expect(packLines(geante, 400)).toEqual([[0], [1], [2]]);
  });

  it("ne produit aucune feuille sans ligne", () => {
    expect(packLines([], 400)).toEqual([]);
  });
});

describe("paginate avec un rangement", () => {
  it("suit le rangement des lignes qu’on lui donne", () => {
    const events = suite(18);
    const pages = paginate(events, [[0], [1, 2]]);
    expect(pages).toHaveLength(2);
    expect(pages[0]!.events).toHaveLength(CARDS_PER_LINE);
    expect(pages[1]!.events).toHaveLength(CARDS_PER_LINE * 2);
  });

  it("ignore un rangement qui désigne des lignes inexistantes", () => {
    expect(paginate(suite(6), [[0], [7]])).toHaveLength(1);
  });
});

describe("paginate, rangement périmé", () => {
  // Trois lignes de frise, de six cartes au plus.
  const events = suite(CARDS_PER_LINE * 2 + 1);

  it("ignore un rangement qui ne place pas toutes les lignes", () => {
    const pages = paginate(events, [[0], [1]]);
    expect(pages.flatMap((page) => page.events)).toHaveLength(events.length);
  });

  it("accepte un rangement complet", () => {
    expect(paginate(events, [[0, 1], [2]])).toHaveLength(2);
  });
});

describe("périodes à cheval sur deux feuilles", () => {
  const events = parseDocument(
    Array.from(
      { length: CARDS_PER_LINE * 6 },
      (_, index) => `# ${1990 + index}\nÉvènement ${index + 1}`,
    ).join("\n\n") + "\n\n# 1991 à 2020; rose\nUne très longue période",
  ).events;
  // Trois feuilles de deux lignes : la période les traverse toutes.
  const pages = paginate(events, [
    [0, 1],
    [2, 3],
    [4, 5],
  ]);

  /** Les bandeaux d'une feuille, du premier au dernier. */
  const bands = (page: (typeof pages)[number]) =>
    page.lines.flatMap((line) => line.bands);

  it("laisse ouverts les bandeaux qui se poursuivent d’une feuille à l’autre", () => {
    expect(bands(pages[0]!).at(0)!.continuesBefore).toBe(false);
    expect(bands(pages[0]!).at(-1)!.continuesAfter).toBe(true);
    expect(bands(pages[1]!).at(0)!.continuesBefore).toBe(true);
    expect(bands(pages[1]!).at(-1)!.continuesAfter).toBe(true);
    expect(bands(pages[2]!).at(0)!.continuesBefore).toBe(true);
    expect(bands(pages[2]!).at(-1)!.continuesAfter).toBe(false);
  });

  it("renumérote les rangées de chaque feuille depuis le haut", () => {
    for (const page of pages) {
      expect(page.lines[0]!.bandRow).toBe(1);
      expect(page.lines.at(-1)!.returnRow).toBeNull();
    }
  });

  it("referme une période qui tient sur une seule feuille", () => {
    const courte = parseDocument(
      Array.from(
        { length: CARDS_PER_LINE },
        (_, index) => `# ${1990 + index}\nÉvènement ${index + 1}`,
      ).join("\n\n") + "\n\n# 1990 à 1993; sky\nUne période brève",
    ).events;
    const band = paginate(courte)[0]!.lines[0]!.bands[0]!;
    expect(band.continuesBefore).toBe(false);
    expect(band.continuesAfter).toBe(false);
  });
});
