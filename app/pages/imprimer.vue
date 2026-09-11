<script setup lang="ts">
/**
 * Aperçu avant impression (C1, C2).
 *
 * Une feuille se remplit de lignes de frise jusqu'à ce que la suivante n'y tienne
 * plus. Cela ne se règle pas et ne s'estime pas : la frise est rendue une fois hors
 * écran, à la taille exacte du papier, et ce sont les hauteurs qu'elle renvoie qui
 * décident du découpage.
 */
import type { LineMetrics, PrintOrientation } from "~/utils/print-pagination";

const history = useLifeHistory();
const { events, isEmpty, loaded } = history;

const orientation = ref<PrintOrientation>("landscape");
const preview = useTemplateRef("preview");
const gauge = useTemplateRef("gauge");
const previewScale = ref(0.3);

const geometry = computed(() => SHEET_GEOMETRY[orientation.value]);

/** Feuilles dont le contenu ne tient pas, malgré le rangement. */
const overflowing = ref(new Set<number>());

/**
 * La place réellement offerte par une feuille, telle qu'une feuille rendue la donne.
 * Rien ici n'est déduit de la géométrie du papier : l'en-tête, le pied de page et les
 * marges changeraient sans prévenir.
 */
const sheetBody = ref({ width: 0, height: 0 });

/** Hauteur de chaque ligne de frise, lue sur les rangées de la grille du banc d'essai. */
const metrics = ref<LineMetrics[]>([]);

/**
 * Le banc d'essai : la frise entière rendue une fois, hors écran, à la largeur exacte
 * d'une feuille. Ses rangées de grille donnent la hauteur de chaque ligne — la seule
 * mesure qui tienne compte des descriptions longues et des bandeaux de période.
 */
function measureLines() {
  const grid = gauge.value?.querySelector<HTMLElement>('[role="list"]');
  if (!grid) return;

  const rows = getComputedStyle(grid)
    .gridTemplateRows.split(" ")
    .map(Number.parseFloat);
  if (rows.some(Number.isNaN)) return;

  const sum = (from: number, to: number) =>
    rows.slice(from - 1, to).reduce((total, height) => total + height, 0);

  metrics.value = buildTimeline(events.value).map((line) => ({
    body: sum(line.bandRow, line.cardRow),
    ret: line.returnRow ? sum(line.returnRow, line.returnRow) : 0,
  }));
}

/**
 * Tant que rien n'est mesuré, le découpage par défaut sert de premier jet : il fait
 * paraître une feuille, qui donne ses dimensions, qui font apparaître le banc d'essai.
 * La mesure prend ensuite la main.
 */
const pages = computed(() =>
  paginate(
    events.value,
    metrics.value.length && sheetBody.value.height
      ? packLines(metrics.value, sheetBody.value.height)
      : undefined,
  ),
);

function noteSheet(
  number: number,
  full: boolean,
  height: number,
  width: number,
) {
  const { width: knownWidth, height: knownHeight } = sheetBody.value;
  if (
    width > 0 &&
    height > 0 &&
    (width !== knownWidth || height !== knownHeight)
  )
    sheetBody.value = { width, height };

  const next = new Set(overflowing.value);
  if (full) next.add(number);
  else next.delete(number);
  overflowing.value = next;
}

const printedOn = computed(() =>
  new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
);

/**
 * `@page` ne peut pas dépendre d'une classe : on injecte la règle correspondant à
 * l'orientation choisie. Aucune marge n'y est déclarée — la feuille porte la sienne,
 * et couvre ainsi la page entière.
 */
useHead(() => ({
  style: [{ innerHTML: `@page { size: A4 ${orientation.value}; margin: 0; }` }],
}));

/** À l'écran, la feuille est réduite pour tenir dans la largeur disponible. */
function measurePreview() {
  const element = preview.value;
  if (!element) return;
  const { paddingLeft, paddingRight } = getComputedStyle(element);
  const width =
    element.clientWidth -
    Number.parseFloat(paddingLeft) -
    Number.parseFloat(paddingRight);
  if (width > 0) previewScale.value = width / SHEET_WIDTH_PX;
}

onMounted(() => {
  measurePreview();
  const observer = new ResizeObserver(() => measurePreview());
  if (preview.value) observer.observe(preview.value);
  onBeforeUnmount(() => observer.disconnect());
});

/** Le banc d'essai n'existe qu'une fois sa largeur connue : on le suit à son apparition. */
watch(gauge, (element, _previous, onCleanup) => {
  if (!element) return;
  const observer = new ResizeObserver(() => measureLines());
  observer.observe(element);
  onCleanup(() => observer.disconnect());
});

watch([events, orientation, () => sheetBody.value.width], () => {
  overflowing.value = new Set();
  nextTick(measureLines);
});

function printNow() {
  window.print();
}

const sheetVars = computed(() => ({
  "--sheet-scale": String(previewScale.value),
  "--sheet-height": `${geometry.value.heightPx}px`,
  "--sheet-padding": `${geometry.value.paddingPx}px`,
  "--sheet-height-ratio": String(geometry.value.heightPx),
  "--sheet-width-mm": `${geometry.value.widthMm}mm`,
  "--sheet-height-mm": `${geometry.value.heightMm}mm`,
}));
</script>

<template>
  <div>
    <UContainer class="space-y-6 py-6 print:hidden">
      <h1 class="text-highlighted text-xl font-semibold">
        Aperçu avant impression
      </h1>

      <UCard v-if="!isEmpty">
        <div class="flex flex-col items-start justify-between gap-4">
          <UFormField
            label="Orientation"
            :help="
              pages.length > 1
                ? 'Les cartes se suivent d’une feuille à l’autre, dans l’ordre, selon la place que prend votre texte.'
                : 'La frise entière tient sur une page.'
            "
          >
            <UFieldGroup>
              <UButton
                label="Paysage"
                :color="orientation === 'landscape' ? 'primary' : 'neutral'"
                :variant="orientation === 'landscape' ? 'solid' : 'outline'"
                @click="orientation = 'landscape'"
              />
              <UButton
                label="Portrait"
                :color="orientation === 'portrait' ? 'primary' : 'neutral'"
                :variant="orientation === 'portrait' ? 'solid' : 'outline'"
                @click="orientation = 'portrait'"
              />
            </UFieldGroup>
          </UFormField>
        </div>
        <template #footer>
          <div class="flex flex-wrap items-center gap-3">
            <UButton
              :disabled="!pages.length"
              icon="i-lucide-printer"
              :label="`Imprimer ${pages.length} feuille${pages.length > 1 ? 's' : ''} A4`"
              @click="printNow"
            />
          </div>
        </template>
      </UCard>

      <UAlert
        v-if="!isEmpty"
        color="neutral"
        variant="subtle"
        icon="i-lucide-printer"
        title="Pour une feuille nette"
      >
        <template #description>
          <p>
            Dans la fenêtre d’impression de votre navigateur, décochez
            <strong>les en-têtes et pieds de page</strong> : sans cela, il
            ajoute lui-même le titre, l’adresse du site, la date et le numéro de
            page en bordure de vos feuilles.
          </p>
          <p class="mt-1">
            Choisissez le format <strong>A4</strong> et des marges
            <strong>aucunes</strong> : la feuille porte déjà les siennes.
          </p>
        </template>
      </UAlert>

      <UAlert
        v-if="pages.length >= PAGE_COUNT_WARNING"
        color="warning"
        variant="subtle"
        icon="i-lucide-layers"
        title="Beaucoup de feuilles"
        :description="`Votre frise occuperait ${pages.length} feuilles.`"
      />

      <UAlert
        v-if="overflowing.size"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Une feuille déborde"
        :description="`Le contenu de la feuille ${[...overflowing].sort((a, b) => a - b).join(', ')} ne tient pas entièrement. Une description particulièrement longue peut dépasser la hauteur d’une page.`"
      />

      <UAlert
        v-if="isEmpty"
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        title="Votre frise est vide"
        description="Ajoutez au moins un évènement pour pouvoir l’imprimer."
      />
    </UContainer>

    <div
      v-if="loaded && sheetBody.width"
      ref="gauge"
      aria-hidden="true"
      class="pointer-events-none invisible fixed top-0 left-0 -z-10 h-0 overflow-hidden print:hidden"
      :style="{ width: `${sheetBody.width}px` }"
    >
      <LifeTimeline :events="events" frozen />
    </div>

    <div
      ref="preview"
      class="mx-auto w-full max-w-5xl space-y-6 px-4 pb-12 print:m-0 print:max-w-none print:space-y-0 print:p-0"
      :style="sheetVars"
    >
      <ClientOnly>
        <PrintSheet
          v-for="page in loaded ? pages : []"
          :key="`${orientation}-${page.number}`"
          :page="page"
          title="Historique de vie"
          :total="pages.length"
          :printed-on="printedOn"
          class="print-sheet-print-scale"
          @measured="
            (full, height, width) => noteSheet(page.number, full, height, width)
          "
        />
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .print-sheet-print-scale {
    --sheet-scale: v-bind("geometry.scale");
  }
}
</style>
