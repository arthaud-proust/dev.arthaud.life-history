/**
 * Disposition de la frise.
 *
 * La frise est une **grille**, et tout s'y place par rangée et colonne — y compris le
 * trait, dont chaque morceau est une cellule à lui : aucun ne se superpose à un autre.
 *
 * Chaque ligne occupe les rangées de ses périodes, puis une rangée de cartes. Deux
 * lignes consécutives sont séparées d'une **rangée de retour**, que les deux virages
 * du bas se partagent en hauteur — le trait qui revient vers la gauche court sur leur
 * limite commune.
 *
 * En colonnes : une gouttière à gauche et une à droite, réservées au trait et à ses
 * virages, et entre les deux les colonnes d'évènements.
 *
 * Le nombre de cartes par ligne est **fixe** : elles occupent chacune un septième de
 * la largeur, les espacements se partageant le septième restant.
 */

import type { LifeEvent } from "./life-document";
import { toEndDate, toStartDate } from "./partial-date";

/** Cartes par ligne. Chacune fait un septième de la largeur disponible. */
export const CARDS_PER_LINE = 6;

export interface TimelineBand {
  event: LifeEvent;
  /** Première colonne d'évènement couverte, à partir de 0. */
  from: number;
  /** Colonne suivant la dernière couverte. */
  to: number;
  /** Étage : deux périodes qui se croisent s'empilent. */
  lane: number;
  /** La période commence avant cette ligne : son bandeau y arrive déjà ouvert. */
  continuesBefore: boolean;
  /** Elle se poursuit après : le bandeau repart sur la ligne suivante. */
  continuesAfter: boolean;
  key: string;
}

/**
 * Une colonne de la frise : une carte, ou un intervalle sauté.
 *
 * La frise ne met pas le temps à l'échelle — ses cartes se suivent, qu'un mois ou
 * quinze ans les séparent. Un intervalle dit donc, en trois points, qu'il s'est
 * passé du temps là où rien n'est raconté. Il porte ses bornes, ce qui permet à une
 * période de le recouvrir comme elle recouvrirait une carte.
 */
export type TimelineColumn =
  | { kind: "event"; event: LifeEvent }
  | { kind: "gap"; from: number; to: number };

/** Les évènements d'une suite de colonnes, les intervalles écartés. */
export function columnEvents(columns: TimelineColumn[]): LifeEvent[] {
  return columns.flatMap((column) =>
    column.kind === "event" ? [column.event] : [],
  );
}

export interface TimelineLine {
  /** Colonnes de la ligne — cartes et intervalles, au plus `CARDS_PER_LINE`. */
  columns: TimelineColumn[];
  bands: TimelineBand[];
  /** Rangées de périodes à réserver — au moins une, même vide. */
  laneCount: number;
  /** Première rangée de périodes, en numéro de grille (à partir de 1). */
  bandRow: number;
  /** Rangée des cartes. Le trait la traverse à mi-hauteur. */
  cardRow: number;
  /** Rangée de retour, ou `null` sur la dernière ligne. */
  returnRow: number | null;
}

/** Vrai si l'évènement dure — auquel cas il devient un bandeau, pas une carte. */
export function isPeriod(event: LifeEvent): boolean {
  return event.end !== undefined;
}

/** Les bornes d'un évènement, en millisecondes — de quoi comparer deux durées. */
const startsAt = (event: LifeEvent) => toStartDate(event.start).getTime();
const endsAt = (event: LifeEvent) =>
  toEndDate(event.end ?? event.start).getTime();

/** Vrai si l'évènement ponctuel tombe dans la période. */
export function covers(period: LifeEvent, point: LifeEvent): boolean {
  const at = toStartDate(point.start).getTime();
  return (
    at >= toStartDate(period.start).getTime() &&
    at <= toEndDate(period.end!).getTime()
  );
}

/** Tous les évènements d'une ligne : ses colonnes et les périodes qui la chapeautent. */
export function eventsOf(line: TimelineLine): LifeEvent[] {
  return [
    ...columnEvents(line.columns),
    ...line.bands.map((band) => band.event),
  ];
}

/**
 * Vrai si la période et l'intervalle se recouvrent, ne serait-ce qu'en partie.
 *
 * Les deux bornes ne se traitent pas de la même façon. Une période qui s'achève
 * **au moment même** où le silence commence s'achève dedans : son bandeau y entre,
 * et c'est ce qui laisse voir qu'elle courait encore quand une autre avait commencé.
 * Une période qui démarre pile sur la carte suivante, en revanche, ne revient pas en
 * arrière chercher le silence qui la précède.
 */
function coversGap(
  period: LifeEvent,
  gap: { from: number; to: number },
): boolean {
  return startsAt(period) < gap.to && gap.from <= endsAt(period);
}

/** Vrai si les deux instants tombent dans le même mois. */
function sameMonth(a: number, b: number): boolean {
  return monthsBetween(a, b) === 0;
}

/** Mois entiers écoulés entre deux instants. */
function monthsBetween(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  return (
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  );
}

/**
 * Ouvre sur un intervalle toute période qui commence là où rien n'est raconté.
 *
 * Sans cela, le bandeau démarrerait sur la première carte qu'il chapeaute — qui peut
 * être bien postérieure à la période elle-même, et la ferait commencer trop tard. Les
 * points rendent à la période sa vraie date de départ.
 *
 * Une période sans aucune carte à chapeauter occupe déjà une colonne à elle : elle
 * n'a besoin de rien. Et si l'intervalle qui précède couvre déjà son début, il fait
 * l'affaire.
 */
function withPeriodStarts(
  columns: TimelineColumn[],
  periods: LifeEvent[],
): TimelineColumn[] {
  const opened = [...columns];

  for (const period of [...periods].sort((a, b) => startsAt(a) - startsAt(b))) {
    const start = startsAt(period);
    const onTime = opened.some(
      (column) =>
        column.kind === "event" && sameMonth(startsAt(column.event), start),
    );
    if (onTime) continue;

    const first = opened.findIndex(
      (column) => column.kind === "event" && covers(period, column.event),
    );
    if (first === -1) continue;

    const before = opened[first - 1];
    if (before?.kind === "gap" && coversGap(period, before)) continue;

    const next = opened[first];
    if (next?.kind !== "event") continue;
    opened.splice(first, 0, {
      kind: "gap",
      from: start,
      to: startsAt(next.event),
    });
  }

  return opened;
}

/**
 * Intercale un intervalle entre deux colonnes que plus d'un mois sépare.
 *
 * La distance se mesure de la **fin** de l'une au **début** de l'autre : deux années
 * qui se suivent se suivent vraiment (« 1990 » puis « 1991 »), deux mois consécutifs
 * aussi, et seuls les temps morts font apparaître les points.
 */
function withGaps(events: LifeEvent[]): TimelineColumn[] {
  const columns: TimelineColumn[] = [];
  for (const event of events) {
    const previous = columns.at(-1);
    if (previous?.kind === "event") {
      const from = endsAt(previous.event);
      const to = startsAt(event);
      if (monthsBetween(from, to) > 1) columns.push({ kind: "gap", from, to });
    }
    columns.push({ kind: "event", event });
  }
  return columns;
}

export function buildTimeline(
  events: LifeEvent[],
  perLine = CARDS_PER_LINE,
): TimelineLine[] {
  const points = events.filter((event) => !isPeriod(event));
  const periods = events.filter(isPeriod);

  // Une période sans aucun évènement à chapeauter occupe tout de même une colonne,
  // à sa date : sans quoi elle n'aurait nulle part où s'afficher.
  const orphans = periods.filter(
    (period) => !points.some((point) => covers(period, point)),
  );

  const columns = withPeriodStarts(
    withGaps([...points, ...orphans].sort((a, b) => startsAt(a) - startsAt(b))),
    periods.filter((period) => !orphans.includes(period)),
  );

  const lines: TimelineLine[] = [];
  let row = 1;

  for (let start = 0; start < columns.length; start += perLine) {
    const slice = columns.slice(start, start + perLine);

    const bands = periods
      .map((event) => {
        // Un bandeau couvre les cartes de sa période, et les intervalles qu'elle
        // traverse : c'est ce qui le fait démarrer sur les points quand rien n'est
        // raconté à sa date.
        const positions = slice.flatMap((column, position) =>
          (
            column.kind === "gap"
              ? coversGap(event, column)
              : covers(event, column.event) || column.event.id === event.id
          )
            ? [position]
            : [],
        );
        if (positions.length === 0) return null;
        return {
          event,
          from: Math.min(...positions),
          to: Math.max(...positions) + 1,
          lane: 0,
          continuesBefore: false,
          continuesAfter: false,
          key: event.id,
        };
      })
      .filter((band): band is TimelineBand => band !== null)
      .sort(
        (a, b) =>
          startsAt(a.event) - startsAt(b.event) ||
          endsAt(b.event) - endsAt(a.event),
      );

    /**
     * Les voies se répartissent sur les **dates**, pas sur les colonnes : deux périodes
     * qui se recouvrent dans le temps s'empilent, même si elles ne chapeautent pas les
     * mêmes cartes. La frise est une suite de cartes et non une échelle — deux périodes
     * qui se croisent peuvent donc se retrouver côte à côte sans se toucher, et il
     * faudrait alors les lire comme une succession.
     *
     * Une voie se libère dès que la période qu'elle porte s'achève avant que la
     * suivante ne commence — et que sa dernière colonne est derrière elle : deux
     * périodes qui se suivent dans le temps peuvent partager un intervalle, et deux
     * bandeaux d'une même voie ne doivent jamais se chevaucher.
     */
    const lanes: { until: number; column: number }[] = [];
    for (const band of bands) {
      const from = startsAt(band.event);
      let lane = lanes.findIndex(
        (lane) => lane.until < from && lane.column <= band.from,
      );
      if (lane === -1) lane = lanes.push({ until: 0, column: 0 }) - 1;
      lanes[lane] = { until: endsAt(band.event), column: band.to };
      band.lane = lane;
    }

    const laneCount = Math.max(1, lanes.length);
    lines.push({
      columns: slice,
      bands,
      laneCount,
      bandRow: row,
      cardRow: row + laneCount,
      returnRow: null,
    });
    // Les périodes, la rangée de cartes, puis la rangée de retour.
    row += laneCount + 2;
  }

  // Une période à cheval sur plusieurs lignes y figure autant de fois : chaque
  // morceau doit savoir s'il en prolonge un autre, pour ne pas se refermer sur lui-même.
  const carries = (at: number, id: string) =>
    lines[at]?.bands.some((band) => band.event.id === id) ?? false;

  return lines.map((line, index) => ({
    ...line,
    returnRow: index === lines.length - 1 ? null : line.cardRow + 1,
    bands: line.bands.map((band) => ({
      ...band,
      continuesBefore: carries(index - 1, band.event.id),
      continuesAfter: carries(index + 1, band.event.id),
    })),
  }));
}

/**
 * Renumérote une tranche de lignes pour qu'elle tienne seule — sur une feuille, par
 * exemple. Les rangées repartent de 1 et la dernière ligne ne repart nulle part.
 *
 * C'est ce qui permet à une feuille de **rendre les lignes qu'on a mesurées** plutôt
 * que d'en recalculer à partir de ses seuls évènements : le découpage en colonnes
 * dépend de ce qui précède, une tranche isolée ne le retrouverait pas.
 */
export function renumber(lines: TimelineLine[]): TimelineLine[] {
  let row = 1;
  return lines.map((line, index) => {
    const bandRow = row;
    const cardRow = row + line.laneCount;
    row += line.laneCount + 2;
    return {
      ...line,
      bandRow,
      cardRow,
      returnRow: index === lines.length - 1 ? null : cardRow + 1,
    };
  });
}

/** Nombre total de rangées de la grille. */
export function rowCount(lines: TimelineLine[]): number {
  const last = lines.at(-1);
  return last ? last.cardRow : 0;
}
