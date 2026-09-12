<script setup lang="ts">
/**
 * La frise, posée sur **une seule grille CSS**.
 *
 * En colonnes : une gouttière à gauche et une à droite, réservées au trait et à ses
 * virages, et entre les deux six colonnes de cartes. Chaque carte occupe un septième
 * de la largeur ; le septième restant revient aux deux gouttières.
 *
 * En rangées : celles des périodes, la rangée des cartes, puis la rangée de retour que
 * les deux virages du bas se partagent en hauteur.
 *
 * **Chaque morceau du trait est une cellule à lui**, placée par la grille et non
 * superposée aux autres : le trait horizontal couvre les colonnes des cartes, les
 * virages occupent les gouttières, et ils se relaient sans jamais se recouvrir.
 *
 * Dans la rangée des cartes, les morceaux se calent à la **moitié de la hauteur** :
 * le trait est centré, les virages font une demi-hauteur et s'alignent en haut ou en
 * bas. Rien ne dépend donc de la façon dont la grille répartit ses rangées.
 *
 * Le rendu est en HTML et non sur un canvas : une étiquette dessinée est écrite d'un
 * seul trait puis tronquée, alors que le patient vient lire sa description entière.
 *
 * Ce composant ne dessine rien lui-même : il découpe la suite en lignes, pose la
 * grille, et y place trois sortes de cellules — `TimelinePeriod`, `TimelineEvent` et
 * les morceaux de `TimelineRail`. Chacune ignore où elle est posée.
 */
import type { LifeEvent } from "~/utils/life-document";
import type { TimelineLine } from "~/utils/timeline-sequence";

const props = withDefaults(
  defineProps<{
    /** Les évènements à disposer. Ignorés si des lignes toutes faites sont fournies. */
    events?: LifeEvent[];
    /**
     * Lignes déjà construites — une feuille d'impression rend ainsi exactement ce que
     * la pagination a mesuré, au lieu de recomposer sa part de frise.
     */
    lines?: TimelineLine[];
    /** Frise d'impression : figée, sans interaction. */
    frozen?: boolean;
    /**
     * Revenir à la ligne. Sinon la frise tient sur une seule ligne, aussi longue
     * qu'il le faut, et c'est elle qui défile — le temps se lit alors d'un trait,
     * sans que l'œil ait à retomber à gauche.
     */
    wrap?: boolean;
  }>(),
  { events: () => [], lines: undefined, frozen: false, wrap: true },
);

const emit = defineEmits<{ select: [id: string] }>();

const root = useTemplateRef("root");

/**
 * Sans retour à la ligne, une ligne accueille tout : on ne compte pas les places, on
 * n'en met aucune limite. Les compter serait faux — une ligne porte aussi les
 * intervalles, et il y en a d'autant plus que la vie racontée est espacée.
 */
const perLine = computed(() =>
  props.wrap ? CARDS_PER_LINE : Number.POSITIVE_INFINITY,
);

const timeline = computed(
  () => props.lines ?? buildTimeline(props.events, perLine.value),
);

/** Places de cartes sur une ligne : six en pleine largeur, toutes sinon. */
const slots = computed(() =>
  props.wrap
    ? CARDS_PER_LINE
    : Math.max(1, ...timeline.value.map((line) => line.columns.length)),
);

/**
 * Une gouttière, les cartes, une gouttière. Les cartes valent deux parts et les
 * gouttières une — quatorze parts en tout quand il y en a six : chaque carte occupe
 * donc exactement un septième de la largeur, et les deux gouttières le septième
 * restant.
 *
 * Sur une ligne unique, chaque carte garde une largeur plancher : au-delà de ce que
 * l'écran peut montrer, la frise dépasse et défile plutôt que de se comprimer.
 *
 * La grille n'a pas d'interligne : l'écart visible entre deux cartes vient de leur
 * marge, prélevée sur leur colonne. C'est là que le trait se voit.
 */
const columns = computed(() =>
  props.wrap
    ? `0.2fr repeat(${CARDS_PER_LINE}, 2fr) 0.2fr`
    : `0.2fr repeat(${slots.value}, minmax(11rem, 2fr)) 0.2fr`,
);

/** Colonne de grille d'une carte, gouttière de gauche comprise. */
const cardColumn = (index: number) => index + 2;

/** Gouttière de droite, où le trait redescend. */
const lastColumn = computed(() => slots.value + 2);

/**
 * Le trait horizontal ne couvre que les colonnes laissées libres par les virages : la
 * gouttière de gauche appartient à l'arrivée, celle de droite à la sortie.
 */
const lineFrom = (line: { bandRow: number }) => (line.bandRow > 1 ? 2 : 1);
const lineTo = (line: { returnRow: number | null }) =>
  line.returnRow ? lastColumn.value : lastColumn.value + 1;

/** Amène une carte sous les yeux sans bousculer le reste de la page. */
function focusEvent(id: string) {
  root.value
    ?.querySelector<HTMLElement>(`[data-event="${CSS.escape(id)}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

defineExpose({ focusEvent });
</script>

<template>
  <div
    ref="root"
    class="grid items-stretch"
    :class="[
      // Sur un téléphone, la frise se resserre : marges et textes rapetissent pour que
      // six cartes y tiennent encore. L'impression, elle, ne dépend d'aucun écran —
      // ses tailles sont dites en pixels de la feuille, sans variante responsive.
      frozen ? '' : 'px-1 py-2 sm:px-3 sm:py-4',
      wrap ? '' : 'overflow-x-auto pb-12',
    ]"
    :style="{ gridTemplateColumns: columns }"
    role="list"
    aria-label="Frise des évènements, par ordre chronologique"
  >
    <template v-for="line in timeline" :key="line.bandRow">
      <TimelinePeriod
        v-for="band in line.bands"
        :key="band.key"
        :band="band"
        :frozen="frozen"
        :style="{
          gridColumn: `${cardColumn(band.from)} / ${cardColumn(band.to)}`,
          gridRow: line.bandRow + band.lane,
        }"
        @select="emit('select', $event)"
      />

      <TimelineRail
        v-if="line.bandRow > 1"
        part="verticale"
        :style="{ gridColumn: 1, gridRow: `${line.bandRow} / ${line.cardRow}` }"
      />

      <TimelineRail
        v-if="line.bandRow > 1"
        part="haut-droite"
        :style="{ gridColumn: 1, gridRow: line.cardRow }"
      />

      <TimelineRail
        part="ligne"
        :style="{
          gridColumn: `${lineFrom(line)} / ${lineTo(line)}`,
          gridRow: line.cardRow,
        }"
      />

      <TimelineRail
        v-if="line.returnRow"
        part="gauche-bas"
        :style="{ gridColumn: lastColumn, gridRow: line.cardRow }"
      />

      <template
        v-for="(column, index) in line.columns"
        :key="column.kind === 'gap' ? `gap-${column.from}` : column.event.id"
      >
        <TimelineGap
          v-if="column.kind === 'gap'"
          :frozen="frozen"
          :style="{ gridColumn: cardColumn(index), gridRow: line.cardRow }"
        />

        <!--
          Une période orpheline occupe une colonne sans y montrer de carte : son
          bandeau la chapeaute, la place reste vide.
        -->
        <div
          v-else-if="isPeriod(column.event)"
          :data-column="column.event.id"
          :style="{ gridColumn: cardColumn(index), gridRow: line.cardRow }"
          aria-hidden="true"
        />

        <TimelineEvent
          v-else
          :event="column.event"
          :frozen="frozen"
          :style="{ gridColumn: cardColumn(index), gridRow: line.cardRow }"
          @select="emit('select', $event)"
        />
      </template>

      <TimelineRail
        v-if="line.returnRow"
        part="haut-gauche"
        :style="{
          gridColumn: `2 / ${lastColumn + 1}`,
          gridRow: line.returnRow,
        }"
      />

      <TimelineRail
        v-if="line.returnRow"
        part="droite-bas"
        :style="{
          gridColumn: 1,
          gridRow: line.returnRow,
        }"
      />
    </template>
  </div>
</template>
