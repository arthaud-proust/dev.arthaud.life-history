<script setup lang="ts">
/**
 * Le bandeau d'une période, au-dessus des mois qu'elle recouvre.
 *
 * Une période n'est pas une carte de plus dans la suite : elle chapeaute celles des
 * évènements qu'elle contient, et sa teinte est posée en fond très pâle pour qu'elle
 * se lise derrière sans écraser ce qu'elle recouvre.
 *
 * Un bandeau ne se referme que là où la période s'arrête vraiment. Une période qui
 * dépasse d'une ligne — ou d'une feuille — reste carrée du côté où elle se poursuit,
 * comme coupée : c'est ce que disent `continuesBefore` et `continuesAfter`.
 *
 * Le placement sur la grille appartient à l'appelant.
 */
import type { TimelineBand } from "~/utils/timeline-sequence";

const props = withDefaults(
  defineProps<{
    band: TimelineBand;
    /** Frise d'impression : figée, sans interaction. */
    frozen?: boolean;
  }>(),
  { frozen: false },
);

const emit = defineEmits<{ select: [id: string] }>();

const event = computed(() => props.band.event);

/** Figé, le bandeau n'est plus un bouton : il n'annonce donc plus d'action. */
const label = computed(() =>
  props.frozen
    ? undefined
    : `Modifier « ${titleOf(event.value)} », ${formatDateField(event.value)}`,
);
</script>

<template>
  <component
    :is="frozen ? 'div' : 'button'"
    :data-event="event.id"
    :type="frozen ? undefined : 'button'"
    role="listitem"
    class="relative min-w-0 overflow-hidden rounded-lg text-left"
    :class="[
      frozen
        ? 'mx-1.5 mb-2 px-4 py-3'
        : 'hover:bg-elevated mx-0.5 mb-1 cursor-pointer px-1.5 py-1 transition-colors sm:mx-1.5 sm:mb-2 sm:px-3 sm:py-2',
      band.continuesBefore ? 'rounded-l-none' : '',
      band.continuesAfter ? 'rounded-r-none' : '',
    ]"
    :style="{
      backgroundColor: `color-mix(in srgb, ${accentOf(event)} 12%, transparent)`,
    }"
    :aria-label="label"
    @click="frozen ? undefined : emit('select', event.id)"
  >
    <time
      class="text-muted wrap-anywhere tabular-nums"
      :class="frozen ? 'text-xl' : 'text-2xl sm:text-xs'"
      >{{ formatDateField(event) }}</time
    >
    <p
      class="text-default wrap-anywhere whitespace-pre-line"
      :class="
        frozen ? 'text-2xl leading-snug' : 'text-xs leading-snug sm:text-sm'
      "
    >
      {{ event.description }}
    </p>
  </component>
</template>
