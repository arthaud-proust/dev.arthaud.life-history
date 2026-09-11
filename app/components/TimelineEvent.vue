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
    class="bg-default relative mx-1.5 flex flex-col overflow-hidden rounded-lg border-2 text-left"
    :class="
      frozen ? 'p-4' : 'hover:bg-elevated cursor-pointer p-3 transition-colors'
    "
    :style="{ borderColor: accentOf(event) }"
    :aria-label="label"
    @click="frozen ? undefined : emit('select', event.id)"
  >
    <time
      class="text-muted tabular-nums"
      :class="frozen ? 'text-[20px]' : 'text-xs'"
      >{{ formatDateField(event) }}</time
    >
    <p
      class="text-default mt-2 whitespace-pre-line"
      :class="frozen ? 'text-[24px] leading-snug' : 'text-sm'"
    >
      {{ event.description }}
    </p>
  </component>
</template>
