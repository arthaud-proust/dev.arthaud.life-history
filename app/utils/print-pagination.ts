/**
 * Répartition de la frise sur des feuilles A4 (C2 de PRODUCT.md).
 *
 * Une feuille se remplit de lignes de frise jusqu'à ce que la suivante n'y tienne
 * plus. Le découpage se fait donc **entre** les lignes — une carte n'est jamais coupée
 * en deux — et il suit la hauteur réellement occupée, que seule la mise en page connaît :
 * une ligne aux descriptions longues prend la place de deux lignes courtes.
 */

import type { LifeEvent } from "./life-document";
import { compareEvents } from "./life-document";
import { toEndDate, toStartDate } from "./partial-date";
import type { TimelineLine } from "./timeline-sequence";
import { buildTimeline, eventsOf, renumber } from "./timeline-sequence";

export type PrintOrientation = "landscape" | "portrait";

/** Au-delà, la frise devient un objet encombrant : on prévient (C2). */
export const PAGE_COUNT_WARNING = 10;

/**
 * Lignes par feuille tant que rien n'a encore été mesuré — le temps du premier rendu.
 * La mesure prend ensuite le relais.
 */
export const ROWS_PER_SHEET = 2;

/** Ce qu'occupe une ligne de frise, mesuré sur le rendu. */
export interface LineMetrics {
  /** Hauteur de la ligne elle-même : ses bandeaux et ses cartes. */
  body: number;
  /** Hauteur de sa rangée de retour, nulle si la ligne ne repart pas. */
  ret: number;
}

/**
 * Range les lignes en feuilles : on en ajoute tant que la suivante tient, et on passe
 * à la feuille d'après dès qu'elle ne tiendrait plus.
 *
 * La rangée de retour d'une ligne ne compte que si une autre ligne la suit **sur la
 * même feuille** : en bas d'une feuille, le trait ne repart nulle part.
 *
 * Une ligne plus haute qu'une feuille entière part seule sur la sienne : mieux vaut
 * une feuille qui déborde — l'aperçu le signale — qu'une boucle sans fin.
 */
export function packLines(lines: LineMetrics[], available: number): number[][] {
  const pages: number[][] = [];
  let page: number[] = [];
  let used = 0;

  for (const [index, line] of lines.entries()) {
    const retourPrecedent = page.length > 0 ? lines[page.at(-1)!]!.ret : 0;
    if (page.length > 0 && used + retourPrecedent + line.body > available) {
      pages.push(page);
      page = [];
      used = 0;
    }
    used += (page.length > 0 ? lines[page.at(-1)!]!.ret : 0) + line.body;
    page.push(index);
  }

  if (page.length > 0) pages.push(page);
  return pages;
}

/**
 * Géométrie d'une feuille A4, bords du papier compris.
 *
 * La feuille couvre toute la page et porte sa marge elle-même : `@page` n'en déclare
 * aucune. C'est ce qui fait que l'impression remplit la page quel que soit le réglage
 * de marges du dialogue du navigateur — une feuille taillée aux dimensions utiles
 * laisserait, marges retirées, une bande blanche qu'elle ne saurait pas occuper.
 *
 * Chaque feuille est composée dans un espace de 2100 px de large, puis réduite en CSS
 * à sa largeur physique — c'est ce qui permet d'exprimer toutes les tailles dans une
 * seule unité, quel que soit l'écran depuis lequel on imprime.
 */
export const SHEET_WIDTH_PX = 2100;

/** Ce qui sépare la frise du bord du papier, en millimètres. */
const SHEET_MARGIN_MM = 10;

function sheet(widthMm: number, heightMm: number) {
  return {
    widthMm,
    heightMm,
    heightPx: Math.round((SHEET_WIDTH_PX * heightMm) / widthMm),
    /** La marge, dite dans l'espace de composition : elle vaut 10 mm une fois réduite. */
    paddingPx: Math.round((SHEET_WIDTH_PX * SHEET_MARGIN_MM) / widthMm),
    // 1 mm vaut exactement 96/25,4 px en CSS : la conversion est déterministe.
    scale: (widthMm * (96 / 25.4)) / SHEET_WIDTH_PX,
  };
}

export const SHEET_GEOMETRY: Record<
  PrintOrientation,
  ReturnType<typeof sheet>
> = {
  landscape: sheet(297, 210),
  portrait: sheet(210, 297),
};

export interface PrintPage {
  /** Numéro de page, à partir de 1. */
  number: number;
  /** Ce que porte la feuille — la frise y remet les lignes d'elle-même. */
  events: LifeEvent[];
  /** Période couverte, en clair : « 1992 → 2001 ». */
  label: string;
  /**
   * Les lignes de frise que porte la feuille, telles qu'elles ont été mesurées.
   *
   * Une feuille ne recompose pas sa part de frise : le découpage en colonnes dépend de
   * ce qui précède — un intervalle n'existe qu'entre deux cartes — et une tranche
   * isolée ne le retrouverait pas. Les bandeaux savent aussi, par la même occasion,
   * qu'une période continue au-delà du bord de la feuille.
   */
  lines: TimelineLine[];
}

function yearOf(event: LifeEvent, edge: "start" | "end"): number {
  const date =
    edge === "start"
      ? toStartDate(event.start)
      : toEndDate(event.end ?? event.start);
  return date.getFullYear();
}

/**
 * Un rangement ne vaut que s'il place chaque ligne, une fois et une seule. Mesures et
 * évènements pouvant se désynchroniser d'un rendu, c'est ce qui empêche un rangement
 * périmé de faire disparaître des évènements de l'aperçu.
 */
function coversEveryLine(groups: number[][], count: number): boolean {
  const placed = new Set(groups.flat());
  return placed.size === count && [...placed].every((i) => i >= 0 && i < count);
}

/**
 * Répartit la frise sur les feuilles, d'après un rangement de lignes.
 *
 * Sans rangement — avant la première mesure — on retombe sur un nombre fixe de lignes
 * par feuille, le temps que le rendu donne ses hauteurs.
 *
 * Les périodes suivent les lignes qu'elles chapeautent : une période à cheval sur deux
 * feuilles figure sur chacune, au-dessus des évènements qui s'y trouvent.
 */
export function paginate(
  events: LifeEvent[],
  groups?: number[][],
): PrintPage[] {
  const lines = buildTimeline(events);
  const chunks =
    groups && coversEveryLine(groups, lines.length)
      ? groups
      : Array.from(
          { length: Math.ceil(lines.length / ROWS_PER_SHEET) },
          (_, i) =>
            lines
              .map((_, index) => index)
              .slice(i * ROWS_PER_SHEET, (i + 1) * ROWS_PER_SHEET),
        );

  const slices = chunks
    .map((indexes) => indexes.map((index) => lines[index]).filter(Boolean))
    .filter((slice) => slice.length > 0);

  return slices.map((slice, index) => {
    const page = [...new Set(slice.flatMap((line) => eventsOf(line!)))].sort(
      compareEvents,
    );
    const from = Math.min(...page.map((event) => yearOf(event, "start")));
    const to = Math.max(...page.map((event) => yearOf(event, "end")));
    return {
      number: index + 1,
      events: page,
      label: from === to ? String(from) : `${from} → ${to}`,
      lines: renumber(slice as TimelineLine[]),
    };
  });
}
