/**
 * Couleurs des évènements.
 *
 * Une couleur choisie à l'écran finit aussi sur du papier, parfois en noir et blanc :
 * le texte posé dessus doit donc rester lisible quelle que soit la teinte retenue.
 */

import { TAILWIND_PALETTE } from "#tailwind-palette";
// Type seul : effacé à la compilation, donc aucune dépendance croisée à l'exécution.
import type { LifeEvent } from "./life-document";

/**
 * Nuance retenue pour les couleurs nommées. La 500 contraste correctement avec du
 * texte noir comme blanc selon la teinte, ce que `readableTextColor` tranche ensuite.
 */
export const COLOR_SHADE = "500";

/**
 * Les teintes proposées au patient : celles que le Tailwind installé fournit, dans
 * l'ordre de son thème. Rien n'est recopié ici — la liste suit la version installée.
 */
export const COLOR_NAMES = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "gray",
];

const NAMED = /^([a-z]+)(?:-(\d{2,3}))?$/;

/** Couleur brute : `#rrggbb` en minuscules. */
export function parseColor(input: string): string | null {
  const text = input.trim().toLowerCase();
  const short = text.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (short)
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  return /^#[0-9a-f]{6}$/.test(text) ? text : null;
}

/**
 * Lit une couleur du fichier : le **nom** d'une teinte de la palette, avec sa nuance
 * en option — `rose`, `slate-300`. Un nom plutôt qu'un code hexadécimal, parce que le
 * fichier doit rester lisible par qui l'ouvre.
 */
export function parseColorToken(input: string): string | null {
  const named = input.trim().toLowerCase().match(NAMED);
  if (!named) return null;
  const shades = TAILWIND_PALETTE[named[1] as keyof typeof TAILWIND_PALETTE] as
    Record<string, string> | undefined;
  const shade = named[2] ?? COLOR_SHADE;
  if (!shades || !(shade in shades)) return null;
  return named[2] ? `${named[1]}-${shade}` : named[1]!;
}

/** Résout une teinte nommée en `#rrggbb`, seule forme que sait peindre un canvas. */
export function colorToHex(token: string): string | null {
  const named = token.trim().toLowerCase().match(NAMED);
  if (!named) return null;
  const shades = TAILWIND_PALETTE[named[1] as keyof typeof TAILWIND_PALETTE] as
    Record<string, string> | undefined;
  return shades?.[named[2] ?? COLOR_SHADE] ?? null;
}

function channels(color: string): [number, number, number] {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

/** Luminance relative, au sens de WCAG 2.1. */
/**
 * La couleur d'un évènement, prête à être écrite dans du CSS : la sienne si le patient
 * en a choisi une, celle du thème sinon — une couleur absente, c'est le thème, et elle
 * suit donc le thème s'il change.
 */
export function accentOf(event: LifeEvent): string {
  return (event.color ? colorToHex(event.color) : null) ?? "var(--ui-primary)";
}

export function luminance(color: string): number {
  const linear = channels(color).map((value) => {
    const ratio = value / 255;
    return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** Rapport de contraste WCAG entre deux couleurs, de 1 (identiques) à 21. */
export function contrastRatio(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (high + 0.05) / (low + 0.05);
}

/**
 * Le texte sombre est un **noir pur**, et non un gris d'encre : avec un gris, les fonds
 * de luminance moyenne n'atteignent le niveau AA avec aucune des deux options — le
 * meilleur choix possible y plafonne à 4,19:1. Le noir ramène ce plancher à 4,58:1.
 */
const DARK_TEXT = "#000000";
const LIGHT_TEXT = "#ffffff";

/**
 * Seuil où le noir et le blanc contrastent également avec un fond : la luminance pour
 * laquelle (L + 0,05)² = 1,05 × 0,05. En deçà le blanc l'emporte, au-delà le noir.
 */
const CROSSOVER_LUMINANCE = 0.1791;

/**
 * Texte noir ou blanc selon le fond — pour qu'un libellé reste lisible aussi bien sur
 * un jaune pâle que sur un bleu nuit, y compris une fois imprimé en niveaux de gris.
 */
export function readableTextColor(background: string): string {
  return luminance(background) > CROSSOVER_LUMINANCE ? DARK_TEXT : LIGHT_TEXT;
}

/**
 * Résout une couleur CSS — variable de thème comprise — en `#rrggbb`.
 *
 * Le canvas de la frise a besoin d'une couleur concrète, et `readableTextColor` de
 * composantes chiffrées. Or les thèmes de Nuxt UI sont exprimés en `oklch()`, que le
 * navigateur conserve tel quel dans les styles calculés. On lui fait donc peindre un
 * pixel : c'est la seule conversion qui marche pour toutes les notations qu'il accepte.
 */
export function resolveCssColor(value: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;

  let css = value;
  if (value.includes("var(")) {
    const probe = document.createElement("span");
    probe.style.color = value;
    probe.style.display = "none";
    document.body.append(probe);
    css = getComputedStyle(probe).color;
    probe.remove();
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return fallback;

  // Une couleur que le navigateur refuse laisse `fillStyle` inchangé : on le détecte
  // avec une sentinelle, plutôt que de peindre un noir qui passerait pour un choix.
  const sentinel = "#010203";
  context.fillStyle = sentinel;
  context.fillStyle = css;
  if (context.fillStyle === sentinel) return fallback;

  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return `#${[red, green, blue].map((part) => (part ?? 0).toString(16).padStart(2, "0")).join("")}`;
}
