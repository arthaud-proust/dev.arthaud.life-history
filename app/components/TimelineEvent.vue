<script setup lang="ts">
/**
 * Une carte d'évènement sur la frise.
 *
 * La carte porte la description **entière** : c'est la raison d'être de tout le rendu
 * HTML (§6 de PRODUCT.md). Rien n'y est tronqué, ni à l'écran ni sur le papier.
 *
 * La couleur borde la carte plutôt que de la remplir : le texte garde ainsi son
 * contraste quelle que soit la teinte choisie, et la frise reste lisible imprimée en
 * noir et blanc.
 *
 * Le placement sur la grille appartient à l'appelant — comme pour `TimelineRail`, ce
 * composant ne décide que de ce qui se voit dans la cellule.
 *
 * Les tailles d'impression sont dites en pixels : la feuille est composée dans un
 * espace de 2100 px de large, puis réduite à la taille du papier.
 */
import type { LifeEvent } from "~/utils/life-document";

const props = withDefaults(
  defineProps<{
    event: LifeEvent;
    /** Frise d'impression : figée, sans interaction. */
    frozen?: boolean;
  }>(),
  { frozen: false },
);

const emit = defineEmits<{ select: [id: string] }>();

/** Figée, la carte n'est plus un bouton : elle n'annonce donc plus d'action. */
const label = computed(() =>
  props.frozen
    ? undefined
    : `Modifier « ${titleOf(props.event)} », ${formatDateField(props.event)}`,
);
</script>

<template>
  <component
    :is="frozen ? 'div' : 'button'"
    :data-event="event.id"
    :data-column="event.id"
    :type="frozen ? undefined : 'button'"
    role="listitem"
    class="bg-default relative flex min-w-0 flex-col overflow-hidden rounded-lg border-2 text-left"
    :class="
      frozen
        ? 'mx-1.5 p-4'
        : 'hover:bg-elevated mx-0.5 cursor-pointer p-1.5 transition-colors sm:mx-1.5 sm:p-3'
    "
    :style="{ borderColor: accentOf(event) }"
    :aria-label="label"
    @click="frozen ? undefined : emit('select', event.id)"
  >
    <!--
      Le texte doit pouvoir descendre sous la largeur de son plus long mot : une carte
      de téléphone est plus étroite que « précision ». `wrap-anywhere` coupe le mot et,
      contrairement à une simple césure, réduit vraiment la largeur minimale de la
      boîte — sans quoi elle déborderait de la carte, qui la rognerait.
    -->
    <time
      class="text-muted wrap-anywhere tabular-nums"
      :class="frozen ? 'text-xl' : 'text-2xl sm:text-xs'"
      >{{ formatDateField(event) }}</time
    >
    <p
      class="text-default wrap-anywhere whitespace-pre-line"
      :class="
        frozen
          ? 'mt-2 text-2xl leading-snug'
          : 'mt-0.5 text-xs leading-snug sm:mt-2 sm:text-sm'
      "
    >
      {{ event.description }}
    </p>
  </component>
</template>
