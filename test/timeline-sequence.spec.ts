import { describe, expect, it } from "vitest";
import { parseDocument, titleOf } from "../app/utils/life-document";
import type { TimelineColumn } from "../app/utils/timeline-sequence";
import {
  CARDS_PER_LINE,
  buildTimeline,
  columnEvents,
  eventsOf,
  isPeriod,
  rowCount,
} from "../app/utils/timeline-sequence";

const lines = (text: string, perLine?: number) =>
  buildTimeline(parseDocument(text).events, perLine);
/** Les cartes d'une ligne, sans les intervalles. */
const cards = (line: { columns: TimelineColumn[] }) =>
  columnEvents(line.columns);
const suite = (count: number, from = 1990) =>
  lines(
    Array.from(
      { length: count },
      (_, index) => `# ${from + index}\nÉvènement ${index + 1}`,
    ).join("\n\n"),
  );

describe("découpage en lignes", () => {
  it("met six cartes par ligne", () => {
    expect(CARDS_PER_LINE).toBe(6);
    const l = suite(14);
    expect(l.map((line) => line.columns.length)).toEqual([6, 6, 2]);
  });

  it("ne perd ni ne duplique aucune carte", () => {
    const l = suite(14);
    expect(l.flatMap((line) => cards(line).map(titleOf))).toHaveLength(14);
  });

  it("ne produit rien pour une frise vide", () => {
    expect(buildTimeline([])).toEqual([]);
  });

  it("garde l’ordre chronologique d’une ligne à l’autre", () => {
    const l = suite(8);
    expect(titleOf(cards(l[0]!)[0]!)).toBe("Évènement 1");
    expect(titleOf(cards(l[1]!)[0]!)).toBe("Évènement 7");
  });
});

describe("rangées de la grille", () => {
  it("réserve une rangée de périodes même sans période", () => {
    const [line] = suite(3);
    expect(line!.laneCount).toBe(1);
    expect(line!.cardRow).toBe(line!.bandRow + 1);
  });

  it("intercale une rangée de retour entre deux lignes", () => {
    const l = suite(8);
    expect(l[0]!.returnRow).toBe(l[0]!.cardRow + 1);
    expect(l[1]!.bandRow).toBe(l[0]!.returnRow! + 1);
  });

  it("ne fait pas repartir la dernière ligne", () => {
    expect(suite(8).at(-1)!.returnRow).toBeNull();
  });

  it("empile les périodes qui se chevauchent sur des rangées distinctes", () => {
    const [line] = lines(
      "# 2000 à 2010\nUne décennie\n\n# 2003 à 2006\nLycée\n\n# 2004\nDedans\n\n# 2005\nAussi",
    );
    expect(line!.laneCount).toBe(2);
    expect(new Set(line!.bands.map((band) => band.lane)).size).toBe(2);
    expect(line!.cardRow).toBe(line!.bandRow + 2);
  });

  it("compte les rangées jusqu’à la dernière ligne", () => {
    expect(rowCount(suite(8))).toBe(suite(8).at(-1)!.cardRow);
    expect(rowCount([])).toBe(0);
  });
});

describe("bandeaux de période", () => {
  it("chapeaute les colonnes qu’une période recouvre", () => {
    const [line] = lines(
      "# 2003 à 2006\nLycée\n\n# 2004\nPremier amour\n\n# 2005\nPermis\n\n# 2010\nAprès",
    );
    const [band] = line!.bands;
    expect(
      columnEvents(line!.columns.slice(band!.from, band!.to)).map(titleOf),
    ).toEqual(["Premier amour", "Permis"]);
  });

  it("réserve une colonne à une période qui ne recouvre rien", () => {
    const [line] = lines("# 2003 à 2006\nLycée\n\n# 2010\nAprès");
    expect(cards(line!).map(titleOf)).toEqual(["Lycée", "Après"]);
    // Sa colonne, et le silence qui la suit : une période qui s'achève au bord d'un
    // intervalle s'y achève, et son bandeau le montre.
    expect(line!.columns[line!.bands[0]!.from]!.kind).toBe("event");
    expect(line!.bands[0]!.to - line!.bands[0]!.from).toBe(2);
  });

  it("reconduit une période sur chaque ligne qu’elle chapeaute", () => {
    const l = lines(
      Array.from(
        { length: 9 },
        (_, index) => `# ${2000 + index}\nÉvènement ${index + 1}`,
      ).join("\n\n") + "\n\n# 2000 à 2008; rose\nUne longue période",
    );
    for (const line of l.slice(0, 2)) {
      expect(line.bands.map((band) => titleOf(band.event))).toContain(
        "Une longue période",
      );
    }
  });
});

describe("eventsOf", () => {
  it("réunit les colonnes et les périodes de la ligne", () => {
    const [line] = lines("# 2003 à 2006\nLycée\n\n# 2004\nDedans");
    expect(eventsOf(line!).map(titleOf).sort()).toEqual(["Dedans", "Lycée"]);
  });
});

describe("isPeriod", () => {
  it("distingue une durée d’un instant", () => {
    expect(isPeriod(parseDocument("# 2003 à 2006\nLycée").events[0]!)).toBe(
      true,
    );
    expect(isPeriod(parseDocument("# 2003\nBac").events[0]!)).toBe(false);
  });
});

describe("périodes à cheval sur plusieurs lignes", () => {
  const total = CARDS_PER_LINE * 3;
  // Une période qui démarre sur la première ligne et s'arrête sur la troisième.
  const timeline = lines(
    Array.from(
      { length: total },
      (_, index) => `# ${2000 + index}\nÉvènement ${index + 1}`,
    ).join("\n\n") +
      `\n\n# 2003 à ${2000 + CARDS_PER_LINE * 2}\nUne longue période`,
  );

  it("ouvre le bandeau du côté où la période se prolonge", () => {
    const bands = timeline.map((line) => line.bands[0]!);
    expect(bands).toHaveLength(3);
    expect(bands.map((band) => band.continuesBefore)).toEqual([
      false,
      true,
      true,
    ]);
    expect(bands.map((band) => band.continuesAfter)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it("laisse fermé un bandeau qui tient sur une seule ligne", () => {
    const band = lines(
      "# 2000\nUn\n\n# 2001\nDeux\n\n# 2000 à 2001\nUne période",
    )[0]!.bands[0]!;
    expect(band.continuesBefore).toBe(false);
    expect(band.continuesAfter).toBe(false);
  });
});

describe("périodes qui se chevauchent", () => {
  it("empile deux périodes qui partagent des évènements", () => {
    const l = lines(
      "# 2000\nUn\n\n# 2001\nDeux\n\n# 2002\nTrois\n\n" +
        "# 2000 à 2002; rose\nLongue\n\n# 2001 à 2002; sky\nCourte",
    );
    expect(l[0]!.bands.map((band) => band.lane)).toEqual([0, 1]);
    expect(l[0]!.laneCount).toBe(2);
  });

  it("empile aussi quand elles ne couvrent pas les mêmes cartes", () => {
    // 1990-1995 et 1993-2000 se recouvrent de 1993 à 1995, mais la première ne
    // chapeaute que la carte de 1990 et la seconde que celle de 1998.
    const l = lines(
      "# 1990\nUn\n\n# 1998\nDeux\n\n" +
        "# 1990 à 1995; rose\nPremière\n\n# 1993 à 2000; sky\nSeconde",
    );
    expect(l[0]!.bands.map((band) => band.lane)).toEqual([0, 1]);
    expect(l[0]!.laneCount).toBe(2);
  });
});

describe("intervalles entre deux cartes", () => {
  const kinds = (text: string) =>
    lines(text)[0]!.columns.map((column) => column.kind);

  it("ne coupe pas deux mois qui se suivent", () => {
    expect(kinds("# juin 2023\nUn\n\n# juillet 2023\nDeux")).toEqual([
      "event",
      "event",
    ]);
  });

  it("marque un intervalle dès que plus d’un mois sépare deux cartes", () => {
    expect(kinds("# juin 2023\nUn\n\n# août 2023\nDeux")).toEqual([
      "event",
      "gap",
      "event",
    ]);
  });

  it("ne coupe pas deux années qui se suivent", () => {
    // Ce qui sépare deux évènements se mesure de la fin de l'un au début de l'autre :
    // « 1990 » finit le 31 décembre, « 1991 » commence le lendemain.
    expect(kinds("# 1990\nUn\n\n# 1991\nDeux")).toEqual(["event", "event"]);
  });

  it("marque un intervalle quand une année manque", () => {
    expect(kinds("# 1990\nUn\n\n# 1992\nDeux")).toEqual([
      "event",
      "gap",
      "event",
    ]);
  });

  it("donne à l’intervalle les bornes du temps sauté", () => {
    const gap = lines("# juin 2023\nUn\n\n# 2025\nDeux")[0]!.columns[1]!;
    expect(gap.kind).toBe("gap");
    if (gap.kind !== "gap") return;
    expect(new Date(gap.from).getFullYear()).toBe(2023);
    expect(new Date(gap.to).getFullYear()).toBe(2025);
  });

  it("compte l’intervalle comme une colonne de la ligne", () => {
    const l = lines(
      "# 2000\nUn\n\n# 2002\nDeux\n\n# 2003\nTrois\n\n# 2004\nQuatre\n\n" +
        "# 2005\nCinq\n\n# 2006\nSix",
    );
    expect(l[0]!.columns.length).toBe(CARDS_PER_LINE);
    expect(columnEvents(l[0]!.columns)).toHaveLength(5);
    expect(columnEvents(l[1]!.columns).map(titleOf)).toEqual(["Six"]);
  });
});

describe("période qui commence là où rien n’est raconté", () => {
  const kinds = (text: string) =>
    lines(text)[0]!.columns.map((column) => column.kind);

  it("ouvre la période sur un intervalle", () => {
    const l = lines(
      "# mai 2000\nUn\n\n# juin 2000\nDeux\n\n# mars 2000 à juin 2000; rose\nSéjour",
    );
    expect(l[0]!.columns.map((column) => column.kind)).toEqual([
      "gap",
      "event",
      "event",
    ]);
    // Le bandeau démarre sur les points, à la vraie date de la période.
    expect(l[0]!.bands[0]!.from).toBe(0);
  });

  it("n’ouvre rien quand une carte tombe le mois du départ", () => {
    expect(
      kinds(
        "# mars 2000\nUn\n\n# juin 2000\nDeux\n\n# mars 2000 à juin 2000\nSéjour",
      ),
    ).toEqual(["event", "gap", "event"]);
  });

  it("se contente de l’intervalle déjà là", () => {
    // Entre 2000 et 2003, les points existent déjà : la période s'y ouvre.
    const l = lines(
      "# 2000\nUn\n\n# 2003\nDeux\n\n# 2002 à 2003; rose\nSéjour",
    );
    expect(l[0]!.columns.map((column) => column.kind)).toEqual([
      "event",
      "gap",
      "event",
    ]);
    expect(l[0]!.bands[0]!.from).toBe(1);
  });

  it("laisse une période orpheline occuper sa propre colonne", () => {
    const l = lines(
      "# 1990\nUn\n\n# 2010\nDeux\n\n# 1995 à 1998; rose\nSéjour",
    );
    expect(columnEvents(l[0]!.columns).map(titleOf)).toEqual([
      "Un",
      "Séjour",
      "Deux",
    ]);
  });
});

describe("voies et intervalles", () => {
  it("sépare deux périodes qui se suivent mais partagent un intervalle", () => {
    // « Avant » et « Après » ne se croisent pas dans le temps, mais toutes deux
    // débordent sur les points qui séparent 1990 de 1998 : leurs bandeaux se
    // toucheraient s'ils restaient sur la même voie.
    const l = lines(
      "# 1990\nUn\n\n# 1998\nDeux\n\n" +
        "# 1990 à 1995; rose\nAvant\n\n# 1996 à 2000; sky\nAprès",
    );
    const [avant, apres] = l[0]!.bands;
    expect(avant!.to).toBeGreaterThan(apres!.from);
    expect(avant!.lane).not.toBe(apres!.lane);
  });

  it("laisse sur une même voie deux périodes qui ne se touchent pas", () => {
    const l = lines(
      "# 2000\nUn\n\n# 2001\nDeux\n\n# 2002\nTrois\n\n# 2003\nQuatre\n\n" +
        "# 2000 à 2001; rose\nAvant\n\n# 2002 à 2003; sky\nAprès",
    );
    expect(l[0]!.bands.map((band) => band.lane)).toEqual([0, 0]);
  });
});

describe("périodes qui se croisent sans carte commune", () => {
  // 1990-1995 ne chapeaute que la carte de 1990, 1993-2000 que celle de 1998 : sans
  // les points qui les séparent, les deux bandeaux se suivraient sagement, et rien
  // ne dirait qu'elles ont coexisté de 1993 à 1995.
  const l = lines(
    "# 1990\nUn\n\n# 1998\nDeux\n\n" +
      "# 1990 à 1995; rose\nPremière\n\n# 1993 à 2000; sky\nSeconde",
  );
  const [first, second] = l[0]!.bands;

  it("les empile", () => {
    expect(first!.lane).not.toBe(second!.lane);
  });

  it("les fait se superposer sur l’intervalle qu’elles traversent", () => {
    expect(first!.to).toBeGreaterThan(second!.from);
  });

  it("ne superpose pas deux périodes qui ne se croisent pas", () => {
    const suite = lines(
      "# 2000\nUn\n\n# 2001\nDeux\n\n# 2002\nTrois\n\n# 2003\nQuatre\n\n" +
        "# 2000 à 2001; rose\nAvant\n\n# 2002 à 2003; sky\nAprès",
    );
    const [avant, apres] = suite[0]!.bands;
    expect(avant!.to).toBeLessThanOrEqual(apres!.from);
  });
});

describe("une période qui s’achève dans le silence", () => {
  // A : septembre 2022 → mai 2023. B : février 2023 → août 2024. Une seule carte,
  // en décembre 2023. A ne chapeaute aucune carte, B chapeaute celle de décembre.
  const l = lines(
    "# septembre 2022 à mai 2023; rose\nA\n\n" +
      "# février 2023 à août 2024; sky\nB\n\n" +
      "# décembre 2023\nUn évènement",
  );
  const line = l[0]!;
  const band = (titre: string) =>
    line.bands.find((b) => titleOf(b.event) === titre)!;

  it("place un intervalle sous la première colonne de B", () => {
    expect(line.columns[band("B").from]!.kind).toBe("gap");
  });

  it("fait chevaucher A et B", () => {
    expect(band("A").lane).not.toBe(band("B").lane);
    expect(band("A").to).toBeGreaterThan(band("B").from);
  });
});

describe("frise déroulée, sans retour à la ligne", () => {
  it("tient sur une seule ligne, intervalles compris", () => {
    // Quatre cartes espacées de deux ans : trois intervalles s'ajoutent aux colonnes.
    const l = lines(
      ["# 2000\nUn", "# 2002\nDeux", "# 2004\nTrois", "# 2006\nQuatre"].join(
        "\n\n",
      ),
      Number.POSITIVE_INFINITY,
    );
    expect(l).toHaveLength(1);
    expect(l[0]!.columns).toHaveLength(7);
    expect(l[0]!.returnRow).toBeNull();
  });
});
