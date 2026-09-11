<script setup lang="ts">
/**
 * Une feuille A4 (C2).
 *
 * Elle est composée dans un espace de 2100 px de large, puis réduite par
 * `--sheet-scale` : à l'écran pour tenir dans l'aperçu, à l'impression pour faire
 * exactement la largeur utile d'une A4. Les tailles de texte sont donc choisies dans
 * cet espace-là, pas en pixels d'écran.
 *
 * Les cartes portant elles-mêmes la description entière, la feuille n'a besoin
 * d'aucun relevé annexe : ce qui est imprimé est ce qui a été écrit.
 */
import type { PrintPage } from "~/utils/print-pagination";

defineProps<{
  page: PrintPage;
  title: string;
  total: number;
  printedOn: string;
}>();

const emit = defineEmits<{
  /** Débordement, et place réellement disponible sur la feuille. */
  measured: [full: boolean, height: number, width: number];
}>();

const body = useTemplateRef("body");

/**
 * Une carte qui ne tiendrait pas serait rognée sans bruit — exactement ce que le
 * produit s'interdit. On mesure donc ce qui déborde, pour le dire dans l'aperçu.
 */
function measure() {
  const element = body.value;
  if (!element) return;
  // La place annoncée est celle où la frise se pose vraiment : les marges intérieures
  // de la feuille en sont déduites, sans quoi le découpage y mettrait une ligne de trop.
  const style = getComputedStyle(element);
  const marge = (a: string, b: string) =>
    Number.parseFloat(style.getPropertyValue(a)) +
    Number.parseFloat(style.getPropertyValue(b));
  emit(
    "measured",
    element.scrollHeight > element.clientHeight + 1,
    element.clientHeight - marge("padding-top", "padding-bottom"),
    element.clientWidth - marge("padding-left", "padding-right"),
  );
}

onMounted(() => {
  const observer = new ResizeObserver(() => measure());
  if (body.value) observer.observe(body.value);
  nextTick(measure);
  onBeforeUnmount(() => observer.disconnect());
});
</script>

<template>
  <div class="print-sheet-frame light">
    <div class="print-sheet">
      <header
        class="flex items-baseline justify-between border-b-2 border-neutral-300 pb-4"
      >
        <h2 class="text-[40px] font-semibold text-neutral-900">
          {{ title }}
        </h2>
        <p class="text-[30px] text-neutral-600 tabular-nums">
          {{ page.label }}
        </p>
      </header>

      <div ref="body" class="min-h-0 flex-1 overflow-hidden py-6">
        <LifeTimeline :lines="page.lines" frozen />
      </div>

      <footer
        class="flex items-baseline justify-between border-t border-neutral-300 pt-3 text-[22px] text-neutral-500"
      >
        <span>{{ title }} — imprimé le {{ printedOn }}</span>
        <span v-if="page.number < total"
          >suite page {{ page.number + 1 }} →</span
        >
        <span class="tabular-nums">page {{ page.number }} / {{ total }}</span>
      </footer>
    </div>
  </div>
</template>
