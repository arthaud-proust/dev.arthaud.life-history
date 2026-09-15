import { describe, expect, it } from "vitest";
import {
  createEvent,
  formatDateField,
  titleOf,
} from "../app/utils/life-document";
import {
  BIRTH_CATEGORY,
  SCHOOLING_CATEGORY,
  buildSchooling,
  defaultChoices,
  readSchooling,
} from "../app/utils/schooling";

/** Le parcours, écrit comme il le serait dans le fichier : « titre : dates ». */
const parcours = (
  birth = { year: 2000, month: 6, day: 12 },
  ajustements: Record<string, { enabled?: boolean; years?: number }> = {},
) => {
  const choices = defaultChoices();
  for (const [key, change] of Object.entries(ajustements))
    choices[key] = { ...choices[key]!, ...change };
  return buildSchooling({ birth, choices }).map(
    (event) => `${titleOf(event)} : ${formatDateField(event)}`,
  );
};

describe("années d’école", () => {
  it("déduit tout le parcours d’une date de naissance", () => {
    // Né en 2000 : maternelle en 2003, CP en 2006, sixième en 2011, seconde en 2015.
    expect(parcours()).toEqual([
      "Naissance : 12 juin 2000",
      "Crèche ou nounou : 12 juin 2000 à août 2003",
      "École maternelle : septembre 2003 à juin 2006",
      "École primaire : septembre 2006 à juin 2011",
      "Collège : septembre 2011 à juin 2015",
      "Lycée : septembre 2015 à juin 2018",
    ]);
  });

  it("ne retient que l’année de naissance pour les rentrées", () => {
    // Décembre ou janvier, la classe est la même : elle se fait par année civile.
    const enDecembre = parcours({ year: 2000, month: 12, day: 31 });
    const enJanvier = parcours({ year: 2000, month: 1, day: 1 });
    expect(enDecembre.slice(2)).toEqual(enJanvier.slice(2));
  });

  it("décale tout ce qui suit une année de plus", () => {
    const allonge = parcours(undefined, { primaire: { years: 6 } });
    expect(allonge).toContain("École primaire : septembre 2006 à juin 2012");
    expect(allonge).toContain("Collège : septembre 2012 à juin 2016");
    expect(allonge).toContain("Lycée : septembre 2016 à juin 2019");
  });

  it("cumule les années ajoutées à plusieurs étapes", () => {
    const allonge = parcours(undefined, {
      primaire: { years: 6 },
      college: { years: 5 },
    });
    expect(allonge).toContain("Collège : septembre 2012 à juin 2017");
    expect(allonge).toContain("Lycée : septembre 2017 à juin 2020");
  });

  it("laisse une étape sautée reprendre à sa rentrée normale", () => {
    const sansMaternelle = parcours(undefined, {
      creche: { enabled: false },
      maternelle: { enabled: false },
    });
    expect(sansMaternelle).toEqual([
      "Naissance : 12 juin 2000",
      "École primaire : septembre 2006 à juin 2011",
      "Collège : septembre 2011 à juin 2015",
      "Lycée : septembre 2015 à juin 2018",
    ]);
  });

  it("enchaîne le CAP au collège quand le lycée n’est pas du parcours", () => {
    const cap = parcours(undefined, {
      lycee: { enabled: false },
      cap: { enabled: true },
    });
    expect(cap).toContain("CAP : septembre 2015 à juin 2017");
  });

  it("ajoute les études supérieures après le lycée", () => {
    const apres = parcours(undefined, {
      superieur: { enabled: true, years: 5 },
    });
    expect(apres).toContain("Études supérieures : septembre 2018 à juin 2023");
  });

  it("arrête la crèche en août, avant une rentrée", () => {
    expect(parcours()).toContain("Crèche ou nounou : 12 juin 2000 à août 2003");
  });

  it("tient la durée annoncée pour la crèche, même si l’école est sautée", () => {
    // Trois ans restent trois ans : à qui a gardé son enfant plus longtemps de le dire.
    const tardif = parcours(undefined, { maternelle: { enabled: false } });
    expect(tardif).toContain("Crèche ou nounou : 12 juin 2000 à août 2003");
    expect(tardif).toContain("École primaire : septembre 2006 à juin 2011");
  });

  it("décale l’école quand la crèche dure plus longtemps", () => {
    const tardif = parcours(undefined, { creche: { years: 4 } });
    expect(tardif).toContain("Crèche ou nounou : 12 juin 2000 à août 2004");
    expect(tardif).toContain("École maternelle : septembre 2004 à juin 2007");
    expect(tardif).toContain("École primaire : septembre 2007 à juin 2012");
  });

  it("relit la durée de la crèche", () => {
    const events = buildSchooling({
      birth: { year: 2000, month: 6, day: 12 },
      choices: { ...defaultChoices(), creche: { enabled: true, years: 5 } },
    }).map(createEvent);
    expect(readSchooling(events).choices.creche).toEqual({
      enabled: true,
      years: 5,
    });
  });

  it("marque ce qu’il a posé, pour savoir le retrouver", () => {
    const events = buildSchooling({
      birth: { year: 2000 },
      choices: defaultChoices(),
    });
    expect(events[0]!.category).toBe(BIRTH_CATEGORY);
    expect(
      events.slice(1).every((e) => e.category === SCHOOLING_CATEGORY),
    ).toBe(true);
    expect(events.every((e) => e.color)).toBe(true);
  });

  it("ne pose rien pour une étape de durée nulle", () => {
    expect(
      parcours(undefined, { superieur: { enabled: true, years: 0 } }),
    ).not.toContain("Études supérieures");
  });
});

describe("relecture d’un parcours déjà posé", () => {
  const poser = (
    birth = { year: 2000, month: 6, day: 12 },
    ajustements: Record<string, { enabled?: boolean; years?: number }> = {},
  ) => {
    const choices = defaultChoices();
    for (const [key, change] of Object.entries(ajustements))
      choices[key] = { ...choices[key]!, ...change };
    return buildSchooling({ birth, choices }).map(createEvent);
  };

  it("retrouve la date de naissance", () => {
    expect(readSchooling(poser()).birth).toEqual({
      year: 2000,
      month: 6,
      day: 12,
    });
  });

  it("retrouve les étapes et leurs durées", () => {
    const { choices } = readSchooling(
      poser(undefined, {
        primaire: { years: 6 },
        superieur: { enabled: true, years: 5 },
      }),
    );
    expect(choices.primaire).toEqual({ enabled: true, years: 6 });
    expect(choices.college).toEqual({ enabled: true, years: 4 });
    expect(choices.superieur).toEqual({ enabled: true, years: 5 });
    expect(choices.cap!.enabled).toBe(false);
  });

  it("décoche ce qui n’a pas été posé", () => {
    const { choices } = readSchooling(
      poser(undefined, { creche: { enabled: false } }),
    );
    expect(choices.creche!.enabled).toBe(false);
    expect(choices.maternelle!.enabled).toBe(true);
  });

  it("reconnaît une période renommée qui garde son nom d’étape", () => {
    const events = poser().map((event) =>
      titleOf(event) === "École maternelle"
        ? { ...event, description: "École maternelle des Lilas" }
        : event,
    );
    expect(readSchooling(events).choices.maternelle!.enabled).toBe(true);
  });

  it("repart des réglages par défaut quand rien n’a été posé", () => {
    const seul = [
      createEvent({ start: { year: 2000 }, description: "Un évènement à moi" }),
    ];
    expect(readSchooling(seul)).toEqual({
      birth: null,
      choices: defaultChoices(),
    });
  });
});
