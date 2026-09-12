/**
 * Couleurs des évènements.
 *
 * Les teintes proposées sont celles du Tailwind installé, lues dans le paquet lui-même
 * (`tailwindcss/colors`) : rien n'est recopié ici, et la palette suit la version
 * installée. Les valeurs y sont écrites en `oklch()`, ce qui convient — elles ne
 * servent qu'à être écrites dans du CSS, qui sait les lire.
 *
 * Le texte, lui, ne se pose jamais sur un aplat coloré : une carte porte sa couleur en
 * bordure, un bandeau en fond très pâle. Sa lisibilité vient du thème — sombre sur
 * clair, clair sur sombre — et non d'un calcul de contraste.
 */

import colors from "tailwindcss/colors";
// Type seul : effacé à la compilation, donc aucune dépendance croisée à l'exécution.
import type { LifeEvent } from "./life-document";

/**
 * Nuance retenue pour les couleurs nommées : assez soutenue pour se voir en bordure
 * d'une carte, assez claire pour qu'un bandeau la porte en fond.
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

/**
 * La palette de Tailwind porte aussi des couleurs sans nuances — `transparent`,
 * `black`… — qu'aucun nom de teinte ne désigne : on ne retient que les familles.
 */
function shadesOf(family: string): Record<string, string> | null {
  const value = (colors as Record<string, unknown>)[family];
  return value && typeof value === "object"
    ? (value as Record<string, string>)
    : null;
}

/**
 * Lit une couleur du fichier : le **nom** d'une teinte de la palette, avec sa nuance
 * en option — `rose`, `slate-300`. Un nom plutôt qu'un code hexadécimal, parce que le
 * fichier doit rester lisible par qui l'ouvre.
 */
export function parseColorToken(input: string): string | null {
  const named = input.trim().toLowerCase().match(NAMED);
  if (!named) return null;
  const shades = shadesOf(named[1]!);
  const shade = named[2] ?? COLOR_SHADE;
  if (!shades || !(shade in shades)) return null;
  return named[2] ? `${named[1]}-${shade}` : named[1]!;
}

/** Résout une teinte nommée en couleur CSS — un `oklch()`, tel que Tailwind l'écrit. */
export function colorToCss(token: string): string | null {
  const named = token.trim().toLowerCase().match(NAMED);
  if (!named) return null;
  return shadesOf(named[1]!)?.[named[2] ?? COLOR_SHADE] ?? null;
}

/**
 * La couleur d'un évènement, prête à être écrite dans du CSS : la sienne si le patient
 * en a choisi une, celle du thème sinon — une couleur absente, c'est le thème, et elle
 * suit donc le thème s'il change.
 */
export function accentOf(event: LifeEvent): string {
  return (event.color ? colorToCss(event.color) : null) ?? "var(--ui-primary)";
}
