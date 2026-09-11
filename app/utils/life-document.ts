/**
 * Le document texte — format de stockage, d'export et d'import (§5 de PRODUCT.md).
 *
 *     # 2003 à 2006; rose
 *     Lycée
 *     Trois années difficiles, loin de ma famille.
 *
 *     # juin 2023
 *     Perte d'un proche
 *
 * Une ligne `#` ouvre un évènement et porte sa date, éventuellement sa couleur ; tout
 * ce qui suit jusqu'au prochain `#` est sa description, librement sur plusieurs lignes.
 *
 * Règle cardinale : **aucune ligne n'est jamais perdue**. Un bloc incompris est
 * conservé tel quel et réécrit à l'identique, plutôt que deviné ou supprimé.
 */

import type { DateBoundary, PartialDate } from "./partial-date";
import { parseColorToken } from "./colors";
import {
  TODAY,
  compareBoundaries,
  formatPartialDate,
  parseDateBoundary,
  parsePartialDate,
  toEndDate,
  toStartDate,
} from "./partial-date";

export interface LifeEvent {
  /** Identifiant de travail, jamais écrit dans le fichier (le format n'en porte pas). */
  id: string;
  start: PartialDate;
  /** Présent → période ; absent → évènement ponctuel. */
  end?: DateBoundary;
  /**
   * Texte libre, sur autant de lignes qu'il le faut. Sa **première ligne** sert de
   * titre sur la frise : la place d'un évènement y vaut sa largeur temporelle, pas un
   * paragraphe. Le reste se lit dans la liste et à l'export.
   */
  description: string;
  /** Nom d'une teinte de la palette (`rose`, `emerald`, `slate-300`). */
  color?: string;
}

/**
 * Le titre d'un évènement : la première ligne de sa description. Sert de repère dans
 * la liste, d'ordre de tri et d'identité à la fusion — pas d'affichage sur la frise.
 */
export function titleOf(event: Pick<LifeEvent, "description">): string {
  return event.description.split("\n")[0]!.trim();
}

/**
 * Ce que porte l'étiquette sur la frise : toute la description, ramenée sur une ligne.
 * Une étiquette de frise est dessinée d'un seul trait, sans retour à la ligne possible
 * — les paragraphes sont donc raboutés, séparés par un point médian.
 */
export function labelOf(event: Pick<LifeEvent, "description">): string {
  return event.description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" · ");
}

/** Un bloc que l'application n'a pas su lire, et qu'elle conserve intact. */
export interface DocumentIssue {
  /** Numéro de la ligne `#` fautive, à partir de 1. */
  line: number;
  /** La ligne `#` elle-même, pour l'afficher. */
  raw: string;
  /** Toutes les lignes conservées telles quelles — la ligne `#` et sa description. */
  block: string[];
  reason: string;
}

export interface LifeDocument {
  events: LifeEvent[];
  /** Lignes libres précédant le premier évènement — un titre, une note d'intention. */
  header: string[];
  /** Blocs incompris, conservés tels quels. */
  trailing: string[];
  issues: DocumentIssue[];
}

export const EMPTY_DOCUMENT: LifeDocument = {
  events: [],
  header: [],
  trailing: [],
  issues: [],
};

/** ` à `, ` a `, `->`, `→`, ` – `, ` - ` : tout ce qui sépare visiblement deux dates. */
const PERIOD_SEPARATOR = /\s+(?:à|a|–|—|-)\s+|\s*(?:->|→)\s*/;

let counter = 0;
function nextId(): string {
  counter += 1;
  return `e${counter}`;
}

/** Enlève les blancs de bord de chaque ligne et les lignes vides aux extrémités. */
export function normalizeDescription(description: string): string {
  const lines = description.split("\n").map((line) => line.trimEnd());
  while (lines.length && lines[0]!.trim() === "") lines.shift();
  while (lines.length && lines[lines.length - 1]!.trim() === "") lines.pop();
  return lines.join("\n");
}

function parseDateField(
  field: string,
): { start: PartialDate; end?: DateBoundary } | string {
  if (field === "") return "La date est vide.";

  const since = field.match(/^depuis\s+(.+)$/i);
  if (since) {
    const start = parsePartialDate(since[1]!);
    return start
      ? { start, end: TODAY }
      : `Je n'ai pas reconnu la date « ${since[1]!.trim()} ».`;
  }

  const parts = field.split(PERIOD_SEPARATOR);
  if (parts.length > 2) {
    return "Une période s’écrit avec une seule borne de fin, par exemple « 2024 à 2025 ».";
  }

  const start = parsePartialDate(parts[0]!);
  if (!start) return `Je n'ai pas reconnu la date « ${parts[0]!.trim()} ».`;
  if (parts.length === 1) return { start };

  const end = parseDateBoundary(parts[1]!);
  if (!end)
    return `Je n'ai pas reconnu la date de fin « ${parts[1]!.trim()} ».`;
  if (toEndDate(end).getTime() < toStartDate(start).getTime()) {
    return "La date de fin est antérieure à la date de début.";
  }
  return { start, end };
}

/** Lit l'en-tête d'un évènement : `# <date ou période>[; <couleur>]`. */
function parseHeading(
  heading: string,
): { start: PartialDate; end?: DateBoundary; color?: string } | string {
  const separator = heading.indexOf(";");
  const dateField = (
    separator === -1 ? heading : heading.slice(0, separator)
  ).trim();

  const dates = parseDateField(dateField);
  if (typeof dates === "string") return dates;
  if (separator === -1) return dates;

  const written = heading.slice(separator + 1).trim();
  if (written === "") return dates;

  const color = parseColorToken(written);
  return color
    ? { ...dates, color }
    : `« ${written} » n'est pas une couleur connue.`;
}

/** Lit un document. Ne lève jamais : ce qu'elle ne comprend pas, elle le signale. */
export function parseDocument(text: string): LifeDocument {
  const doc: LifeDocument = {
    events: [],
    header: [],
    trailing: [],
    issues: [],
  };
  const lines = text.split(/\r?\n/);

  // Découpage en blocs : une ligne « # » ouvre un évènement, le reste le décrit.
  const starts = lines
    .map((line, index) => (line.startsWith("#") ? index : -1))
    .filter((index) => index !== -1);

  const preamble = lines.slice(0, starts[0] ?? lines.length);
  while (preamble.length && preamble[preamble.length - 1]!.trim() === "")
    preamble.pop();
  doc.header = preamble;

  starts.forEach((start, position) => {
    const end = starts[position + 1] ?? lines.length;
    const block = lines.slice(start, end);
    const heading = lines[start]!;

    const reject = (reason: string) => {
      doc.issues.push({ line: start + 1, raw: heading, block, reason });
      doc.trailing.push(
        ...block.filter((line, index) => index === 0 || line.trim() !== ""),
      );
    };

    const parsed = parseHeading(heading.slice(1));
    if (typeof parsed === "string") {
      reject(parsed);
      return;
    }

    const description = normalizeDescription(block.slice(1).join("\n"));
    if (description === "") {
      reject("Cet évènement n’a pas de description.");
      return;
    }

    doc.events.push({ id: nextId(), ...parsed, description });
  });

  doc.events.sort(compareEvents);
  return doc;
}

export function compareEvents(a: LifeEvent, b: LifeEvent): number {
  const byStart = compareBoundaries(a.start, b.start);
  if (byStart !== 0) return byStart;
  const aEnd = toEndDate(a.end ?? a.start).getTime();
  const bEnd = toEndDate(b.end ?? b.start).getTime();
  if (aEnd !== bEnd) return aEnd - bEnd;
  return titleOf(a).localeCompare(titleOf(b), "fr");
}

/** Écrit le champ date d'un évènement sous sa forme canonique. */
export function formatDateField(
  event: Pick<LifeEvent, "start" | "end">,
): string {
  const start = formatPartialDate(event.start);
  return event.end === undefined
    ? start
    : `${start} à ${formatPartialDate(event.end)}`;
}

export function serializeEvent(event: LifeEvent): string {
  const heading = `# ${formatDateField(event)}${event.color ? `; ${event.color}` : ""}`;
  return `${heading}\n${normalizeDescription(event.description)}`;
}

/**
 * Écrit le document. Les évènements sont triés chronologiquement ; l'en-tête reste en
 * tête, et les blocs incompris sont réécrits en fin de fichier, dans leur ordre.
 */
export function serializeDocument(doc: LifeDocument): string {
  const blocks: string[] = [];

  const header = [...doc.header];
  while (header.length && header[header.length - 1]!.trim() === "")
    header.pop();
  if (header.length) blocks.push(header.join("\n"));

  for (const event of [...doc.events].sort(compareEvents))
    blocks.push(serializeEvent(event));
  if (doc.trailing.length) blocks.push(doc.trailing.join("\n"));

  return blocks.length ? `${blocks.join("\n\n")}\n` : "";
}

/** Vrai si les deux évènements désignent la même chose — même date, même titre (B3). */
export function isSameEvent(a: LifeEvent, b: LifeEvent): boolean {
  return (
    formatDateField(a) === formatDateField(b) &&
    titleOf(a).toLowerCase() === titleOf(b).toLowerCase()
  );
}

export interface MergeReport {
  added: number;
  updated: number;
  unchanged: number;
}

/** Fusionne un document importé dans un document existant (B3). */
export function mergeDocuments(
  base: LifeDocument,
  incoming: LifeDocument,
): { doc: LifeDocument; report: MergeReport } {
  const events = [...base.events];
  const report: MergeReport = { added: 0, updated: 0, unchanged: 0 };

  for (const event of incoming.events) {
    const existing = events.find((candidate) => isSameEvent(candidate, event));
    if (!existing) {
      events.push({ ...event, id: nextId() });
      report.added += 1;
    } else if (
      existing.description !== event.description ||
      existing.color !== event.color
    ) {
      existing.description = event.description;
      existing.color = event.color;
      report.updated += 1;
    } else {
      report.unchanged += 1;
    }
  }

  return {
    doc: {
      events: events.sort(compareEvents),
      header: base.header.length ? base.header : incoming.header,
      trailing: [...base.trailing, ...incoming.trailing],
      issues: [...base.issues, ...incoming.issues],
    },
    report,
  };
}

export function createEvent(fields: Omit<LifeEvent, "id">): LifeEvent {
  return {
    ...fields,
    id: nextId(),
    description: normalizeDescription(fields.description),
  };
}
