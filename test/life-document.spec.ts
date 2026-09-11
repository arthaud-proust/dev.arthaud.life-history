import { describe, expect, it } from "vitest";
import { TODAY } from "../app/utils/partial-date";
import {
  labelOf,
  mergeDocuments,
  normalizeDescription,
  parseDocument,
  serializeDocument,
  titleOf,
} from "../app/utils/life-document";

const SAMPLE = `Mon histoire

# 1987
Naissance

# 12 juin 2022 à juillet 2024; sky
Voyage à Lille

# 2020 à aujourd'hui
Thérapie

# juin 2023; rose
Perte d'un proche
C’était un mardi. Je m’en souviens à cause de la pluie.

# 2024 à 2025
Voyage à Paris
`;

describe("parseDocument", () => {
  it("lit l’exemple de référence du format", () => {
    const doc = parseDocument(SAMPLE);
    expect(doc.issues).toEqual([]);
    expect(doc.events).toHaveLength(5);
    expect(doc.header).toEqual(["Mon histoire"]);
  });

  it("trie les évènements par ordre chronologique", () => {
    expect(parseDocument(SAMPLE).events.map(titleOf)).toEqual([
      "Naissance",
      "Thérapie",
      "Voyage à Lille",
      "Perte d'un proche",
      "Voyage à Paris",
    ]);
  });

  it("distingue évènement ponctuel et période", () => {
    const doc = parseDocument(SAMPLE);
    expect(
      doc.events.find((event) => titleOf(event) === "Naissance")!.end,
    ).toBeUndefined();
    expect(
      doc.events.find((event) => titleOf(event) === "Voyage à Paris")!.end,
    ).toEqual({ year: 2025 });
  });

  it("reconnaît une période toujours en cours", () => {
    expect(parseDocument("# 2020 à aujourd'hui\nThérapie").events[0]!.end).toBe(
      TODAY,
    );
    expect(parseDocument("# depuis 2020\nThérapie").events[0]!.end).toBe(TODAY);
  });

  it("accepte les variantes d’écriture des séparateurs de période", () => {
    for (const field of [
      "2024 à 2025",
      "2024 a 2025",
      "2024->2025",
      "2024 → 2025",
      "2024 - 2025",
    ]) {
      const doc = parseDocument(`# ${field}\nVoyage`);
      expect(doc.issues, field).toEqual([]);
      expect(doc.events[0]!.end, field).toEqual({ year: 2025 });
    }
  });
});

describe("descriptions", () => {
  it("prend tout ce qui suit, sur autant de lignes qu’il le faut", () => {
    const doc = parseDocument(
      "# 2024\nDéménagement\nLyon, puis Paris.\n\nDeux ans plus tard, retour.",
    );
    expect(doc.events[0]!.description).toBe(
      "Déménagement\nLyon, puis Paris.\n\nDeux ans plus tard, retour.",
    );
  });

  it("garde le titre de frise sur la première ligne", () => {
    expect(
      titleOf(parseDocument("# 2024\nDéménagement\nLyon").events[0]!),
    ).toBe("Déménagement");
  });

  it("laisse la ponctuation tranquille, points-virgules compris", () => {
    const doc = parseDocument(
      "# 2024\nDéménagement; puis divorce; enfin le calme",
    );
    expect(doc.events[0]!.description).toBe(
      "Déménagement; puis divorce; enfin le calme",
    );
  });

  it("refuse un évènement sans description", () => {
    const doc = parseDocument("# 2024\n\n# 2025\nSuite");
    expect(doc.events).toHaveLength(1);
    expect(doc.issues[0]!.reason).toContain("description");
  });
});

describe("couleurs", () => {
  it("lit une teinte nommée", () => {
    expect(parseDocument("# 2024; rose\nDéménagement").events[0]!.color).toBe(
      "rose",
    );
  });

  it("accepte une nuance explicite", () => {
    expect(
      parseDocument("# 2024; sky-700\nDéménagement").events[0]!.color,
    ).toBe("sky-700");
  });

  it("normalise la casse", () => {
    expect(parseDocument("# 2024; Rose\nDéménagement").events[0]!.color).toBe(
      "rose",
    );
  });

  it("signale une teinte inconnue plutôt que de l’ignorer", () => {
    const doc = parseDocument("# 2024; bordeaux\nDéménagement");
    expect(doc.events).toHaveLength(0);
    expect(doc.issues[0]!.reason).toContain("bordeaux");
    expect(serializeDocument(doc)).toContain("bordeaux");
  });

  it("laisse un évènement sans couleur quand rien n’est précisé", () => {
    expect(
      parseDocument("# 2024\nDéménagement").events[0]!.color,
    ).toBeUndefined();
  });
});

describe("robustesse", () => {
  it("signale les blocs incompris sans rien perdre ni rien refuser", () => {
    const doc = parseDocument(
      "# 1990\nÉcole\n\n# une date bancale\nQuelque chose\n\n# 2000\nBac",
    );
    expect(doc.events).toHaveLength(2);
    expect(doc.issues).toHaveLength(1);
    expect(doc.issues[0]).toMatchObject({ line: 4, raw: "# une date bancale" });
    const written = serializeDocument(doc);
    expect(written).toContain("# une date bancale");
    expect(written).toContain("Quelque chose");
  });

  it("refuse une date de fin antérieure au début", () => {
    const doc = parseDocument("# 2025 à 2024\nVoyage");
    expect(doc.events).toHaveLength(0);
    expect(doc.issues[0]!.reason).toContain("antérieure");
  });

  it("conserve un préambule libre en tête de fichier", () => {
    const doc = parseDocument(
      "Ma ligne de vie\nCommencée en thérapie.\n\n# 1990\nÉcole",
    );
    expect(doc.header).toEqual(["Ma ligne de vie", "Commencée en thérapie."]);
    expect(doc.issues).toEqual([]);
  });
});

describe("serializeDocument", () => {
  it("normalise sans rien perdre du sens", () => {
    const doc = parseDocument(
      "# 06/2023\nPerte d'un proche\n\n# 2022-06-12\nDépart",
    );
    expect(serializeDocument(doc)).toBe(
      "# 12 juin 2022\nDépart\n\n# juin 2023\nPerte d'un proche\n",
    );
  });

  it("aller-retour : réécrire un document lu ne le change plus", () => {
    const once = serializeDocument(parseDocument(SAMPLE));
    expect(serializeDocument(parseDocument(once))).toBe(once);
  });

  it("aller-retour : relire un document écrit redonne les mêmes évènements", () => {
    const doc = parseDocument(SAMPLE);
    const reparsed = parseDocument(serializeDocument(doc));
    expect(reparsed.events.map(({ id, ...rest }) => rest)).toEqual(
      doc.events.map(({ id, ...rest }) => rest),
    );
  });

  it("aller-retour : une description de plusieurs paragraphes survit", () => {
    const text =
      "# 2024; emerald\nDéménagement\nLyon, puis Paris.\n\nDeux ans plus tard, retour.\n";
    expect(serializeDocument(parseDocument(text))).toBe(text);
  });

  it("aller-retour : les blocs incompris ressortent intacts", () => {
    const once = serializeDocument(
      parseDocument("Titre\n\n# 1990\nÉcole\n\n# ???\nPerdu\n"),
    );
    expect(once).toContain("# ???");
    expect(serializeDocument(parseDocument(once))).toBe(once);
  });

  it("écrit un document vide comme une chaîne vide", () => {
    expect(serializeDocument(parseDocument(""))).toBe("");
  });
});

describe("normalizeDescription", () => {
  it("enlève les blancs de bord et les lignes vides aux extrémités", () => {
    expect(normalizeDescription("\n  Départ  \n  suite \n\n")).toBe(
      "  Départ\n  suite",
    );
  });
});

describe("mergeDocuments", () => {
  it("ajoute les évènements inconnus et laisse les autres tranquilles", () => {
    const base = parseDocument("# 1990\nÉcole\n\n# 2000\nBac");
    const incoming = parseDocument("# 2000\nBac\n\n# 2010\nPermis");
    const { doc, report } = mergeDocuments(base, incoming);
    expect(report).toEqual({ added: 1, updated: 0, unchanged: 1 });
    expect(doc.events.map(titleOf)).toEqual(["École", "Bac", "Permis"]);
  });

  it("met à jour la description et la couleur d’un évènement déjà connu", () => {
    const base = parseDocument("# 2000\nBac");
    const incoming = parseDocument("# 2000; emerald\nBac\nMention assez bien");
    const { doc, report } = mergeDocuments(base, incoming);
    expect(report.updated).toBe(1);
    expect(doc.events[0]!.color).toBe("emerald");
    expect(doc.events[0]!.description).toBe("Bac\nMention assez bien");
  });
});

describe("labelOf", () => {
  it("raboute toute la description sur une ligne", () => {
    const event = parseDocument("# 2024\nDéménagement\nLyon, puis Paris.")
      .events[0]!;
    expect(labelOf(event)).toBe("Déménagement · Lyon, puis Paris.");
  });

  it("ignore les lignes vides entre paragraphes", () => {
    const event = parseDocument(
      "# 2024\nDéménagement\n\nDeux ans plus tard, retour.",
    ).events[0]!;
    expect(labelOf(event)).toBe("Déménagement · Deux ans plus tard, retour.");
  });

  it("laisse une description d’une ligne intacte", () => {
    expect(labelOf({ description: "Naissance" })).toBe("Naissance");
  });
});
