<script setup lang="ts">
/**
 * Un morceau du trait de la frise.
 *
 * Le tracé n'est jamais dessiné d'un bloc : il s'assemble à partir de cinq primitives,
 * chacune un élément. Un virage n'est rien d'autre qu'un coin de boîte arrondi entre
 * deux bordures — la bordure d'où le trait vient, et celle où il va.
 *
 * Le positionnement appartient à l'appelant : ce composant ne décide que de la forme.
 */
const props = defineProps<{
  /** D'où le trait vient, et où il va. */
  part:
    | "ligne"
    | "verticale"
    | "gauche-bas"
    | "haut-gauche"
    | "droite-bas"
    | "haut-droite";
}>();

/**
 * Les classes sont écrites en toutes lettres : Tailwind lit le source tel quel, une
 * classe assemblée par interpolation ne serait jamais générée.
 *
 * L'épaisseur vient de `--timeline-stroke`, qui garde un plancher d'un pixel à
 * l'écran une fois la feuille réduite (voir main.css).
 */
const SHAPES = {
  ligne: "h-0 self-center border-t-[length:var(--timeline-stroke)]",
  // La boîte occupe toute la gouttière et ne montre que son bord gauche, comme les
  // virages : un trait n'est peint que s'il borde une vraie boîte.
  verticale: "w-full border-l-[length:var(--timeline-stroke)]",
  "gauche-bas":
    "h-[calc(50%_+_1px)] self-end rounded-tr-2xl border-t-[length:var(--timeline-stroke)] border-r-[length:var(--timeline-stroke)]",
  // Les deux virages du bas partagent une même rangée : l'un en occupe la moitié
  // haute, l'autre la moitié basse, et le retour court sur leur limite. C'est la
  // marge du premier qui donne sa hauteur à la rangée.
  "haut-gauche":
    "mb-4 h-4 self-start rounded-br-2xl border-r-[length:var(--timeline-stroke)] border-b-[length:var(--timeline-stroke)]",
  "droite-bas":
    "h-[calc(var(--spacing)_*_4_+_2px)] self-end rounded-tl-2xl border-t-[length:var(--timeline-stroke)] border-l-[length:var(--timeline-stroke)]",
  "haut-droite":
    "h-[calc(50%_+_1px)] self-start rounded-bl-2xl border-b-[length:var(--timeline-stroke)] border-l-[length:var(--timeline-stroke)]",
} as const;

const shape = computed(() => SHAPES[props.part]);
</script>

<template>
  <span
    :data-part="part"
    class="border-accented pointer-events-none"
    :class="shape"
    aria-hidden="true"
  />
</template>
