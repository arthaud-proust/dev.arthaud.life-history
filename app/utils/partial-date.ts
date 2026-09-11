/**
 * Dates partielles.
 *
 * Un patient se souvient souvent d'une année sans le mois (« vers 1998 »). Une date
 * porte donc une précision variable, et on n'invente jamais ce qui n'a pas été écrit.
 *
 * Ce module est la seule autorité sur la lecture et l'écriture des dates : le fichier
 * (§5 de PRODUCT.md) et le formulaire de saisie l'utilisent tous les deux, pour que le
 * patient n'ait qu'une seule grammaire à connaître.
 */

export type DatePrecision = "year" | "month" | "day";

export interface PartialDate {
  year: number;
  /** 1–12 */
  month?: number;
  /** 1–31 */
  day?: number;
}

/** Marqueur d'une période toujours en cours. */
export const TODAY = "today" as const;
export type Today = typeof TODAY;

/** Une borne de date : une date partielle, ou « aujourd'hui » pour une fin ouverte. */
export type DateBoundary = PartialDate | Today;

export const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/** Minuscules, sans accent, sans point final — pour comparer ce que le patient a tapé. */
function fold(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.+$/, "")
    .trim();
}

const FOLDED_MONTHS = MONTH_NAMES.map(fold);

/**
 * Reconnaît un nom de mois français, accents et casse indifférents, y compris les
 * abréviations — à condition qu'elles soient **sans ambiguïté** : « juil » donne
 * juillet, mais « jui » pourrait être juin ou juillet, et n'est donc pas deviné.
 */
export function parseMonthName(token: string): number | null {
  const folded = fold(token);
  if (folded.length < 3) return null;

  const exact = FOLDED_MONTHS.indexOf(folded);
  if (exact !== -1) return exact + 1;

  const prefixed = FOLDED_MONTHS.map((month, index) =>
    month.startsWith(folded) ? index + 1 : 0,
  ).filter(Boolean);

  return prefixed.length === 1 ? prefixed[0]! : null;
}

function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function build(year: number, month?: number, day?: number): PartialDate | null {
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  if (month === undefined) return { year };
  if (month < 1 || month > 12) return null;
  if (day === undefined) return { year, month };
  if (!isRealDate(year, month, day)) return null;
  return { year, month, day };
}

const TODAY_WORDS = [
  "aujourd hui",
  "aujourdhui",
  "maintenant",
  "present",
  "en cours",
];

/** Vrai si le texte désigne « aujourd'hui » (fin de période ouverte). */
export function isTodayWord(input: string): boolean {
  const folded = fold(input).replace(/['’]/g, " ").replace(/\s+/g, " ");
  return TODAY_WORDS.includes(folded);
}

/**
 * Lit une date écrite par un humain. Tolérante sur la forme, mais ne devine jamais :
 * tout ce qui est ambigu (« 12/06/22 » et son année sur deux chiffres, un mois
 * abrégé équivoque) est refusé plutôt qu'interprété de travers.
 */
export function parsePartialDate(input: string): PartialDate | null {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) return null;

  let match: RegExpMatchArray | null;

  // 2024
  if ((match = text.match(/^(\d{4})$/))) {
    return build(+match[1]!);
  }
  // 2023-06 · 2022-06-12
  if ((match = text.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/))) {
    return build(+match[1]!, +match[2]!, match[3] ? +match[3] : undefined);
  }
  // 06/2023
  if ((match = text.match(/^(\d{1,2})\/(\d{4})$/))) {
    return build(+match[2]!, +match[1]!);
  }
  // 12/06/2022 · 12.06.2022
  if ((match = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/))) {
    return build(+match[3]!, +match[2]!, +match[1]!);
  }
  // 12 juin 2022
  if ((match = text.match(/^(\d{1,2}) (\S+) (\d{4})$/))) {
    const month = parseMonthName(match[2]!);
    return month ? build(+match[3]!, month, +match[1]!) : null;
  }
  // juin 2023
  if ((match = text.match(/^(\S+) (\d{4})$/))) {
    const month = parseMonthName(match[1]!);
    return month ? build(+match[2]!, month) : null;
  }

  return null;
}

/** Lit une borne : une date partielle ou « aujourd'hui ». */
export function parseDateBoundary(input: string): DateBoundary | null {
  return isTodayWord(input) ? TODAY : parsePartialDate(input);
}

/**
 * La date qui vient après celle-ci, à sa propre précision : l'année suivante quand on
 * ne connaît que l'année, le mois suivant sinon. Une séance de saisie avance presque
 * toujours ainsi, et le formulaire propose donc cette date après chaque ajout.
 *
 * Un jour précis n'est pas reconduit : « 12 juin 2022 » mène à juillet 2022, pas au
 * 12 juillet — le formulaire propose, il ne prétend pas connaître le jour suivant.
 */
export function nextPeriod(date: PartialDate): PartialDate {
  if (date.month === undefined) return { year: date.year + 1 };
  return date.month === 12
    ? { year: date.year + 1, month: 1 }
    : { year: date.year, month: date.month + 1 };
}

export function precisionOf(date: PartialDate): DatePrecision {
  if (date.day !== undefined) return "day";
  if (date.month !== undefined) return "month";
  return "year";
}

/** Écriture canonique : « 12 juin 2022 », « juin 2023 », « 2024 », « aujourd'hui ». */
export function formatPartialDate(date: DateBoundary): string {
  if (date === TODAY) return "aujourd'hui";
  const month = date.month ? MONTH_NAMES[date.month - 1] : undefined;
  if (date.day !== undefined) return `${date.day} ${month} ${date.year}`;
  if (month) return `${month} ${date.year}`;
  return String(date.year);
}

/** Premier instant couvert par la date : 1998 → 1er janvier 1998. */
export function toStartDate(date: DateBoundary): Date {
  if (date === TODAY) return new Date();
  return new Date(date.year, (date.month ?? 1) - 1, date.day ?? 1);
}

/** Dernier instant couvert : 1998 → 31 décembre 1998, juin 2023 → 30 juin 2023. */
export function toEndDate(date: DateBoundary): Date {
  if (date === TODAY) return new Date();
  if (date.day !== undefined)
    return new Date(date.year, date.month! - 1, date.day, 23, 59, 59, 999);
  if (date.month !== undefined)
    return new Date(date.year, date.month, 0, 23, 59, 59, 999);
  return new Date(date.year, 11, 31, 23, 59, 59, 999);
}

/** Ordre chronologique sur le premier instant couvert. */
export function compareBoundaries(a: DateBoundary, b: DateBoundary): number {
  return toStartDate(a).getTime() - toStartDate(b).getTime();
}
