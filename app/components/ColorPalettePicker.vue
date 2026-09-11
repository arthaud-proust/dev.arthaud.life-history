<script setup lang="ts">
/**
 * Choix d'une couleur dans la palette de Tailwind.
 *
 * Une palette fermée plutôt qu'un nuancier libre : les teintes restent cohérentes
 * entre elles, impriment de façon prévisible, et surtout le fichier garde un nom
 * lisible — « rose » dit quelque chose à qui l'ouvre, « #ff2056 » non.
 *
 * Les teintes proposées sont celles du Tailwind installé (§6), pas une liste recopiée.
 */
const model = defineModel<string | undefined>({
  required: true,
});

const swatches = computed(() => [
  ...COLOR_NAMES.map((name) => ({
    name,
    value: name as string | undefined,
    css: colorToHex(name) ?? "#000000",
  })),
]);
</script>

<template>
  <div
    class="flex flex-wrap gap-1.5"
    role="radiogroup"
    aria-label="Couleur de l’évènement"
  >
    <button
      v-for="swatch in swatches"
      :key="swatch.name"
      type="button"
      role="radio"
      :aria-checked="model === swatch.value"
      :aria-label="swatch.name"
      :title="swatch.name"
      class="focus-visible:outline-primary ring-offset-bg size-6 shrink-0 rounded-full ring-offset-2 transition focus-visible:outline-2 focus-visible:outline-offset-2"
      :class="
        model === swatch.value ? 'ring-2 ring-(--ui-text)' : 'hover:scale-110'
      "
      :style="{ backgroundColor: swatch.css }"
      @click="model = swatch.value"
    />
  </div>
</template>
