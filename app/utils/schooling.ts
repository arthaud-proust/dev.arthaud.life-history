/**
 * Les années d'école, déduites d'une date de naissance.
 *
 * En France, une classe se remplit par **année civile de naissance** : un enfant né en
 * 2018 entre au CP en septembre 2024, quel que soit son mois de naissance. Et une
 * année scolaire court de septembre à juin. De la seule année de naissance découle
 * donc tout un parcours — c'est ce que ce module calcule, pour éviter au patient de
 * poser à la main une quinzaine de dates qu'il connaît déjà.
 *
 * Rien n'y est deviné pour autant : chaque étape se coche, se retire, et se règle en
 * années. Pourquoi l'une a duré plus longtemps — redoublement, année sabbatique,
 * réorientation, maladie — ne regarde pas l'application, qui ne compte que les années.
 * Ce qui est produit est une frise ordinaire, qu'on peut ensuite corriger carte par
 * carte.
 */

import type { LifeEvent } from "./life-document";
import { titleOf } from "./life-document";
import type { PartialDate } from "./partial-date";
import { TODAY } from "./partial-date";

/** Ce qui distingue les évènements posés par l'application de ceux du patient. */
export const SCHOOLING_CATEGORY = "scolarité";
export const BIRTH_CATEGORY = "naissance";

export interface SchoolStage {
  key: string;
  label: string;
  /** Années après la naissance à la rentrée, quand l'étape ouvre le parcours. */
  entry: number;
  /** Durée normale, en années scolaires. */
  years: number;
  color: string;
}

/**
 * Le parcours ordinaire, dans l'ordre. Le CAP suit le collège comme le lycée : les
 * deux sont proposés, et c'est au patient de dire lequel il a suivi — ou les deux,
 * l'un après l'autre, ce qui arrive.
 */
export const SCHOOL_STAGES: readonly SchoolStage[] = [
  {
    key: "creche",
    label: "Crèche ou nounou",
    entry: 0,
    years: 3,
    color: "gray",
  },
  {
    key: "maternelle",
    label: "École maternelle",
    entry: 3,
    years: 3,
    color: "amber",
  },
  {
    key: "primaire",
    label: "École primaire",
    entry: 6,
    years: 5,
    color: "lime",
  },
  { key: "college", label: "Collège", entry: 11, years: 4, color: "sky" },
  { key: "lycee", label: "Lycée", entry: 15, years: 3, color: "violet" },
  { key: "cap", label: "CAP", entry: 15, years: 2, color: "orange" },
  {
    key: "superieur",
    label: "Études supérieures",
    entry: 18,
    years: 3,
    color: "rose",
  },
];

/** Ce que le patient a coché, étape par étape. */
export interface StageChoice {
  enabled: boolean;
  /** Durée retenue, quelle qu'en soit la raison. */
  years: number;
}

export interface SchoolingRequest {
  birth: PartialDate;
  choices: Record<string, StageChoice>;
}

/** Le parcours par défaut : l'école obligatoire, à sa durée normale. */
export function defaultChoices(): Record<string, StageChoice> {
  return Object.fromEntries(
    SCHOOL_STAGES.map((stage) => [
      stage.key,
      {
        enabled: !["cap", "superieur"].includes(stage.key),
        years: stage.years,
      },
    ]),
  );
}

/**
 * Relit un parcours déjà posé sur la frise.
 *
 * La modale se rouvre ainsi sur ce qui existe, et non sur des réglages par défaut qui
 * effaceraient une durée corrigée au premier « Remplacer ». C'est la catégorie qui rend
 * cette relecture possible : la naissance donne la date, les périodes leurs durées.
 *
 * Une période renommée reste reconnue tant que son titre commence par le nom de
 * l'étape — « École maternelle des Lilas » est toujours l'école maternelle.
 */
export function readSchooling(events: LifeEvent[]): {
  birth: PartialDate | null;
  choices: Record<string, StageChoice>;
} {
  const birth =
    events.find((event) => event.category === BIRTH_CATEGORY)?.start ?? null;
  const posed = events.filter((event) => event.category === SCHOOLING_CATEGORY);
  if (posed.length === 0) return { birth, choices: defaultChoices() };

  const choices = Object.fromEntries(
    SCHOOL_STAGES.map((stage) => {
      const found = posed.find((event) =>
        titleOf(event).startsWith(stage.label),
      );
      if (!found) return [stage.key, { enabled: false, years: stage.years }];

      const end = found.end;
      const years =
        !end || end === TODAY
          ? stage.years
          : Math.max(1, end.year - found.start.year);
      return [stage.key, { enabled: true, years }];
    }),
  );

  return { birth, choices };
}

/** Une année scolaire va de septembre à juin : « septembre 2004 à juin 2007 ». */
function schoolYears(from: number, to: number) {
  return { start: { year: from, month: 9 }, end: { year: to, month: 6 } };
}

/**
 * Compose les périodes d'un parcours.
 *
 * Une étape commence à sa rentrée normale, **à moins que la précédente ne finisse plus
 * tard** : une année de plus décale donc tout ce qui suit, sans qu'on ait à le dire
 * deux fois. Une étape sautée, elle, ne décale rien : la suivante reprend à son âge
 * habituel.
 *
 * La crèche ne diffère que par son début : elle commence à la naissance, le jour même
 * s'il est connu, et s'achève en août, avant une rentrée.
 */
export function buildSchooling(
  request: SchoolingRequest,
): Omit<LifeEvent, "id">[] {
  const { birth, choices } = request;
  const events: Omit<LifeEvent, "id">[] = [
    {
      start: birth,
      description: "Naissance",
      color: "emerald",
      category: BIRTH_CATEGORY,
    },
  ];

  const retained = SCHOOL_STAGES.filter(
    (stage) =>
      choices[stage.key]?.enabled && (choices[stage.key]?.years ?? 0) > 0,
  );

  // La rentrée de l'étape en cours ; nulle tant qu'aucune n'a été posée.
  let entry: number | null = null;

  for (const stage of retained) {
    const years = choices[stage.key]!.years;

    if (stage.key === "creche") {
      const until: number = birth.year + years;
      events.push({
        start: birth,
        end: { year: until, month: 8 },
        description: stage.label,
        color: stage.color,
        category: SCHOOLING_CATEGORY,
      });
      entry = until;
      continue;
    }

    const from: number = Math.max(entry ?? 0, birth.year + stage.entry);
    const to: number = from + years;
    events.push({
      ...schoolYears(from, to),
      description: stage.label,
      color: stage.color,
      category: SCHOOLING_CATEGORY,
    });
    entry = to;
  }

  return events;
}
