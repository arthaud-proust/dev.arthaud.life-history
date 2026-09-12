<script setup lang="ts">
/**
 * Un intervalle sauté : les trois points entre deux cartes que le temps sépare.
 *
 * La frise ne met pas le temps à l'échelle — deux cartes se suivent qu'un mois ou
 * quinze ans les séparent. Ces points sont ce qui rétablit la différence, sans
 * prétendre la mesurer.
 *
 * Ils reposent sur le fond de la frise et coupent donc le trait, qui passe à la même
 * hauteur : le temps continue de courir, mais plus rien n'y est raconté.
 *
 * Le placement sur la grille appartient à l'appelant.
 */
withDefaults(
  defineProps<{
    /** Frise d'impression : figée, sans interaction. */
    frozen?: boolean;
  }>(),
  { frozen: false },
);
</script>

<template>
  <span
    aria-hidden="true"
    class="bg-default text-dimmed self-center justify-self-center leading-none tracking-widest"
    :class="frozen ? 'px-2 text-3xl' : 'px-0.5 text-xs sm:px-2 sm:text-sm'"
    >…</span
  >
</template>
